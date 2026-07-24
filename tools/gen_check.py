#!/usr/bin/env python3
# gen_check.py - 核对每课 audio/<id>/narrate.mp3 是否生成成功且内容非空
# 说明: 自「小光讲一讲」改为 总结/知识点发散 文案(narration.TALK) 后，
# 按钮语音与视频内嵌语音(narration.NARRATION) 是两份不同内容，时长不再相等，属正常。
# 本脚本只校验: narrate.mp3 存在、>0 字节、音轨时长 >= 5s（避免空/极短产物）。
import json, os, subprocess

ROOT = '/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具'
FFP = '/Users/xiaoguang/homebrew/Cellar/ffmpeg/8.1.2_1/bin/ffprobe'
MIN_SEC = 5.0


def stream_dur(p):
    if not os.path.exists(p) or os.path.getsize(p) == 0:
        return None
    o = subprocess.run([FFP, '-v', 'error', '-show_entries', 'stream=duration',
                        '-select_streams', 'a:0',
                        '-of', 'default=noprint_wrappers=1:nokey=1', p],
                       capture_output=True, text=True).stdout.strip()
    try:
        return float(o)
    except Exception:
        return None


def main():
    d = json.load(open(os.path.join(ROOT, 'tools', 'lessons_code.json'), encoding='utf-8'))
    bad = []
    for l in d:
        lid = l['id']
        na = os.path.join(ROOT, 'audio', lid, 'narrate.mp3')
        if not os.path.exists(na) or os.path.getsize(na) == 0:
            bad.append((lid, 'narrate.mp3 缺失/空')); continue
        nd = stream_dur(na)
        if nd is None:
            bad.append((lid, '读取时长失败')); continue
        if nd < MIN_SEC:
            bad.append((lid, f'时长过短 {nd:.1f}s'))
    print(f'总课数: {len(d)}')
    print(f'异常: {len(bad)}')
    for b in bad:
        print('  ', b)
    print('✅ 全部正常' if not bad else '⚠️ 需处理上述课程')


if __name__ == '__main__':
    main()
