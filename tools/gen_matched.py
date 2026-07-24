# -*- coding: utf-8 -*-
"""分镜驱动 · 画面与语音严格匹配的视频生成器（统一版）。
支持两种课：
  - code 课：trace_code 逐行执行，每行配详细讲解（比喻+为什么）
  - concept 课（无代码）：要点卡片逐条讲，每条配详细讲解+举例
每段配 say(画面大字/气泡短提示) + voice(语音详细讲解) -> edge-tts 合成并测时长
-> 按时长精确渲染帧数 -> 逐段拼接。画面切换点 = 语音切换点，严格匹配。
零积分 / 本地 ffmpeg / 离线播放（需联网合成一次）。
用法: python gen_matched.py [课号...]  (不传=跑 NARRATION 里所有课)
"""
import sys, os, asyncio, subprocess, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_code_videos as G
import edge_tts
import narration
import pron
from PIL import Image, ImageDraw

ROOT = G.ROOT
SYS_FFMPEG = G.SYS_FFMPEG
SYS_FFPROBE = os.path.join(os.path.dirname(SYS_FFMPEG), 'ffprobe')
FPS = G.FPS
# FORCE=1 时视频段语音强制重合成（用于统一修正多音字发音），不删缓存文件
FORCE = os.environ.get('FORCE') == '1'
VOICE = 'zh-CN-XiaoxiaoNeural'
W, H = G.W, G.H

# ---------------- 概念课单点卡片 ----------------
def frame_concept_point(title, say, hint=''):
    img = Image.new('RGB', (W, H)); d = ImageDraw.Draw(img)
    G.bg(d); G.topbar(d, title)
    G.draw_mascot(d, 200, 350, 1.5, 'wow')          # 吉祥物上移，底部留给字幕
    cx0, cy0, cx1, cy1 = 510, 150, 1245, 520         # 卡片上移，避免被字幕条遮挡
    G.rrect(d, [cx0, cy0, cx1, cy1], 26, fill=G.PANEL, outline=G.PANEL_BD, width=3)
    # 大字 say 自动换行
    cur = ''; lines = []
    for ch in say:
        if G.F(40).getlength(cur + ch) > (cx1 - cx0 - 70):
            lines.append(cur); cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    ty = cy0 + (cy1 - cy0 - len(lines) * 52) // 2
    for i, ln in enumerate(lines[:3]):
        d.text((cx0 + 38, ty + i * 52), ln, font=G.F(40), fill=G.DARK)
    if hint:
        d.text((cx0 + 38, cy1 - 40), hint, font=G.F(22), fill=G.GREY)
    return img

# ---------------- 底部字幕条（显示该段完整讲解 voice，与语音同步） ----------------
SUB_H = 168                      # 字幕条固定高度（所有段一致，保证 concat 尺寸统一）
SUB_BG = (26, 30, 48)           # 深底
SUB_TXT = (245, 248, 255)       # 白字
SUB_LINE = (96, 156, 240)       # 顶部分隔高光

def add_subtitle(img, text):
    """在 720 画框内【底部叠加】字幕条（不撑高视频，保持标准 16:9）。
    因每段一张关键帧覆盖整段语音，字幕在该段内静态显示，天然与语音同步。"""
    text = (text or '').strip()
    d = ImageDraw.Draw(img)
    bar_top = H - SUB_H                       # 720 - 168 = 552，底部留给字幕
    d.rectangle([0, bar_top - 5, W, bar_top], fill=SUB_LINE)   # 分隔高光
    d.rectangle([0, bar_top, W, H], fill=SUB_BG)               # 字幕底（不透明，干净）
    pad = 48
    maxw = W - pad * 2
    lines = []
    for size, lh, maxlines in [(30, 42, 3), (28, 39, 4), (25, 35, 4), (22, 31, 5)]:
        f = G.F(size)
        lines, cur = [], ''
        for ch in text:
            if f.getlength(cur + ch) > maxw:
                lines.append(cur); cur = ch
            else:
                cur += ch
        if cur:
            lines.append(cur)
        if len(lines) <= maxlines:
            break
    lines = lines[:maxlines]
    f = G.F(size)
    ty = bar_top + (SUB_H - len(lines) * lh) // 2 + 2
    for i, ln in enumerate(lines):
        w = f.getlength(ln)
        d.text(((W - w) // 2, ty + i * lh), ln, font=f, fill=SUB_TXT)
    return img

# ---------------- 语音合成 / 时长 ----------------
async def tts(text, path, retries=6):
    last = None
    for attempt in range(retries):
        try:
            c = edge_tts.Communicate(pron.fix_pron(text), VOICE)
            await c.save(path)
            return
        except Exception as e:
            last = e
            await asyncio.sleep(1.5 + attempt * 2)  # 退避，避开限流
    raise RuntimeError(f'tts 失败 {retries} 次: {last}')

def duration(path):
    r = subprocess.run([SYS_FFPROBE, '-v', 'error', '-show_entries',
                        'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except Exception:
        return 3.0

def build_silent_clip(key_png, dur, out_clip):
    # 每段只渲染 1 张关键帧，按该段配音时长生成无声视频；
    # 最终统一拼接为单一连续视频流 + 单一连续音轨，避免段边界在浏览器里卡顿/不连贯
    cmd = [SYS_FFMPEG, '-y', '-loop', '1', '-i', key_png,
           '-t', f'{dur:.3f}', '-r', '25',
           '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '20',
           out_clip]
    subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    return os.path.exists(out_clip)

# ---------------- 主流程 ----------------
def build_segs(les, n):
    """组装分镜段: (tag, say气泡短提示, voice语音详细讲解, render渲染参数)
    代码课按逐行运行，概念课按要点卡片。视频与按钮语音共用此函数，保证同源同序。"""
    kind = n['kind']
    segs = []
    if kind == 'code':
        if les['id'] in G.TURTLE_IDS:
            # 海龟课：真算出画笔轨迹，渲染"代码左 + 海龟画布右"
            steps, lines = G.trace_turtle(les['code'])
            segs.append(('intro', n['intro']['say'], n['intro']['voice'], ('turtle', lines, None, [], None)))
            rep = {}
            for st in steps:
                ln = st['line']
                if ln is None:
                    continue
                rep[ln] = rep.get(ln, 0) + 1
                nv0 = n['steps'].get(ln, {'say': f'运行第 {ln} 行', 'voice': f'运行第 {ln} 行'})
                nv = nv0[(rep[ln] - 1) % len(nv0)] if isinstance(nv0, list) else nv0
                segs.append(('turtle', nv['say'], nv['voice'], ('turtle', lines, ln, st['path'], st['state'])))
            fin = steps[-1] if steps else {'path': [], 'state': None}
            segs.append(('outro', n['outro']['say'], n['outro']['voice'], ('turtle', lines, None, fin['path'], fin['state'])))
        else:
            steps, lines = G.trace_code(les['code'], None)
            segs.append(('intro', n['intro']['say'], n['intro']['voice'], ('code', lines, None, {}, '')))
            for st in steps:
                ln = st['line']
                nv = n['steps'].get(ln, {'say': f'运行第 {ln} 行', 'voice': f'运行第 {ln} 行'})
                segs.append(('code', nv['say'], nv['voice'], ('code', lines, ln, st.get('vars', {}), st.get('output', ''))))
            segs.append(('outro', n['outro']['say'], n['outro']['voice'], ('code', lines, None, steps[-1]['vars'], steps[-1]['output'])))
    else:  # concept
        segs.append(('intro', n['intro']['say'], n['intro']['voice'], ('concept', n['intro'].get('hint', ''))))
        for p in n['points']:
            segs.append(('concept', p['say'], p['voice'], ('concept', p.get('hint', ''))))
        segs.append(('outro', n['outro']['say'], n['outro']['voice'], ('concept', n['outro'].get('hint', ''))))
    return segs


def main():
    lessons = json.load(open(os.path.join(ROOT, 'tools', 'lessons_code.json'), encoding='utf-8'))
    by_id = {l['id']: l for l in lessons}
    ids = sys.argv[1:]
    targets = [by_id[i] for i in ids if i in by_id] if ids else lessons
    tmp = os.path.join(ROOT, 'tools', '_matched')
    os.makedirs(tmp, exist_ok=True)

    for les in targets:
        lid = les['id']
        try:
            if lid not in narration.NARRATION:
                print('无分镜，跳过:', lid); continue
            n = narration.NARRATION[lid]
            kind = n['kind']
            title = f"{lid}  {les['title']}"

            segs = build_segs(les, n)   # 与按钮语音共用同一份分镜

            work = os.path.join(tmp, lid)
            os.makedirs(work, exist_ok=True)
            clips = []
            for i, (tag, say, voice, rd) in enumerate(segs):
                ap = os.path.join(work, f's{i}.mp3')
                # 复用已缓存段音频，避免重烤字幕时无谓联网重合成
                if FORCE or not (os.path.exists(ap) and os.path.getsize(ap) > 0):
                    asyncio.run(tts(voice, ap))   # 内部已加重试+退避，避开限流
                    time.sleep(0.4)               # 段间小间隔，降低请求频率
                dur = duration(ap)
                key = os.path.join(work, f'k{i}.png')
                if rd[0] == 'turtle':
                    _, lines, ln, path, state = rd
                    frame = G.frame_turtle(title, lines, ln, path, state, say, reserve_sub=True)
                elif rd[0] == 'code':
                    _, lines, ln, v, o = rd
                    frame = G.frame_code(title, lines, ln, v, o, say, reserve_sub=True)
                else:
                    hint = rd[1]
                    frame = frame_concept_point(title, say, hint)
                add_subtitle(frame, voice).save(key)   # 帧下方拼接完整讲解字幕
                cp = os.path.join(work, f'c{i}.mp4')
                ok = build_silent_clip(key, dur, cp)
                if ok:
                    clips.append(cp)
                print(f'  段{i} {tag} {dur:.1f}s {"OK" if ok else "FAIL"}', flush=True)

            if not clips:
                raise RuntimeError('无有效片段')
            # 1) 连续音轨：所有段 tts 拼接为一条（消除段间解码重同步导致的卡顿/不连贯）
            alst = os.path.join(work, 'alist.txt')
            with open(alst, 'w') as f:
                for i in range(len(clips)):
                    f.write("file '%s'\n" % os.path.join(work, f's{i}.mp3'))
            full_audio = os.path.join(work, 'full.mp3')
            subprocess.run([SYS_FFMPEG, '-y', '-f', 'concat', '-safe', '0', '-i', alst,
                            '-c', 'copy', full_audio], capture_output=True, text=True, timeout=180)
            # 2) 无声视频拼接为单一连续视频流（重编码，避免浏览器段边界卡顿）
            vlst = os.path.join(work, 'vlist.txt')
            with open(vlst, 'w') as f:
                for cp in clips:
                    f.write("file '%s'\n" % cp)
            silent = os.path.join(work, 'silent.mp4')
            subprocess.run([SYS_FFMPEG, '-y', '-f', 'concat', '-safe', '0', '-i', vlst,
                            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast',
                            '-crf', '20', silent], capture_output=True, text=True, timeout=300)
            # 3) mux：连续音轨 + 连续视频流（音频一次性编码为单流，无段边界）
            out = os.path.join(ROOT, 'video', f'{lid}.mp4')
            r = subprocess.run([SYS_FFMPEG, '-y', '-i', silent, '-i', full_audio,
                                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
                                '-shortest', '-movflags', '+faststart', out],
                               capture_output=True, text=True, timeout=180)
            print(f'MUX rc={r.returncode} out_exists={os.path.exists(out)}', flush=True)
            print(('OK ' if os.path.exists(out) else 'FAIL ') + lid + f' 共{len(clips)}段', flush=True)
        except Exception as e:
            print('FAIL', lid, '->', repr(e)[:140], flush=True); continue

if __name__ == '__main__':
    main()
    os._exit(0)   # 强制退出，绕过 edge_tts 遗留连接导致的进程挂起
