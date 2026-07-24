#!/usr/bin/env python3
# gen_narrate.py - 为每课合成 audio/<id>/narrate.mp3
# 文案来源 = narration.TALK（向导小光的「总结 / 知识点发散」），
# 与视频内嵌语音(narration.NARRATION) 是两份完全不同的内容，避免按钮语音和视频一模一样。
import sys, os, asyncio, subprocess, json, time
sys.path.insert(0, os.path.dirname(__file__))
import gen_matched as G
import narration

ROOT = '/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具'
AUDIO_DIR = os.path.join(ROOT, 'audio')
FF = G.SYS_FFMPEG
TMP = os.path.join(ROOT, 'tools', '_narrate')


def build_talk_segs(talk):
    """TALK[课号] = [{'say':..,'voice':..}, ...]；按顺序返回 (say, voice) 列表。"""
    return [(s.get('say', ''), s.get('voice', '')) for s in talk]


def concat_audio(parts, out_path):
    lst = os.path.join(TMP, 'list.txt')
    with open(lst, 'w') as f:
        for p in parts:
            f.write(f"file '{p}'\n")
    r = subprocess.run([FF, '-y', '-f', 'concat', '-safe', '0', '-i', lst,
                        '-c:a', 'libmp3lame', '-b:a', '128k', out_path],
                       capture_output=True, text=True, timeout=120)
    return os.path.exists(out_path)


def main():
    lessons = json.load(open(os.path.join(ROOT, 'tools', 'lessons_code.json'), encoding='utf-8'))
    by_id = {l['id']: l for l in lessons}
    ids = sys.argv[1:]
    targets = [by_id[i] for i in ids if i in by_id] if ids else lessons
    os.makedirs(TMP, exist_ok=True)

    for les in targets:
        lid = les['id']
        try:
            if lid not in narration.TALK:
                print('无 TALK，跳过:', lid); continue
            segs = build_talk_segs(narration.TALK[lid])
            work = os.path.join(TMP, lid)
            os.makedirs(work, exist_ok=True)
            parts = []
            for i, (say, voice) in enumerate(segs):
                ap = os.path.join(work, f's{i}.mp3')
                asyncio.run(G.tts(voice, ap))   # 与视频不同的总结/发散语音
                time.sleep(0.4)
                parts.append(ap)
                print(f'  段{i} {say} OK', flush=True)
            out = os.path.join(AUDIO_DIR, lid, 'narrate.mp3')
            os.makedirs(os.path.dirname(out), exist_ok=True)
            if not concat_audio(parts, out):
                raise RuntimeError('拼接失败')
            print('OK', lid, f'共{len(parts)}段 ->', os.path.getsize(out), 'bytes', flush=True)
        except Exception as e:
            print('FAIL', lid, '->', repr(e)[:140], flush=True); continue


if __name__ == '__main__':
    main()
    os._exit(0)
