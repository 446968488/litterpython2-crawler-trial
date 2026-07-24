# -*- coding: utf-8 -*-
"""男生真人语音烤制（云希 zh-CN-YunxiNeural，年轻轻松不严肃）。
读取 data/course.js：
  - 每个唯一单词烤 <en>_en.mp3（读英文读音）与 <en>_zh.mp3（读中文解释）到 audio/words/
  - 每课 takeaway 烤 <id>_takeaway.mp3 到 audio/（小结）
  - 每课讲义烤 <id>_lec_<n>.mp3（按段切分）到 audio/，前端朗读讲义走真人声而非浏览器 TTS
  - 每题烤 <id>_ex<idx>_<n>.mp3（按前端题面构造规则）到 audio/，前端「朗读题目」走真人声
依赖: pip install edge-tts  （需联网一次）
用法:
  python tools/gen_male_voice.py                          # 烤全部单词 + 第1课小结
  python tools/gen_male_voice.py --lessons r0l1 r0l2       # 指定烤哪几课小结
  python tools/gen_male_voice.py --takeaways all           # 烤全部课小结
  python tools/gen_male_voice.py --takeaways all --lectures all   # 小结+讲义全烤
  python tools/gen_male_voice.py --takeaways all --lectures all --exercises all   # 小结+讲义+习题全烤
"""
import asyncio, json, os, re, sys, argparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COURSE = os.path.join(ROOT, 'data', 'course.js')
AUDIO_DIR = os.path.join(ROOT, 'audio')
WORDS_DIR = os.path.join(AUDIO_DIR, 'words')
VOICE = 'zh-CN-YunxiNeural'

import edge_tts


def load_course():
    s = open(COURSE, encoding='utf-8').read()
    s = s[s.index('=') + 1:].rstrip().rstrip(';')
    return json.loads(s)


async def tts(text, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return False  # 已存在，跳过
    text = (text or '').strip()
    if not text:
        return False
    last = None
    for attempt in range(3):
        try:
            comm = edge_tts.Communicate(text, VOICE)
            with open(out_path, 'wb') as f:
                async for chunk in comm.stream():
                    if chunk['type'] == 'audio':
                        f.write(chunk['data'])
            if os.path.getsize(out_path) > 0:
                return True
        except Exception as e:
            last = e
            await asyncio.sleep(0.6)
    print('  ⚠️ 烤失败跳过:', os.path.basename(out_path), '->', type(last).__name__, str(last)[:60])
    if os.path.exists(out_path):
        os.remove(out_path)
    return False


def strip_markdown(md):
    """与前端 stripMarkdown 对齐：去掉代码块/标记，得纯朗读文本。"""
    s = md or ''
    s = re.sub(r'```[\s\S]*?```', ' ', s)        # 代码块（读代码很乱，跳过）
    s = re.sub(r'`([^`]*)`', r'\1', s)            # 行内代码
    s = re.sub(r'^#{1,6}\s+', '', s, flags=re.M)  # 标题
    s = re.sub(r'^\s*>\s?', '', s, flags=re.M)    # 引用
    s = re.sub(r'^\s*[-*+]\s+', '，', s, flags=re.M)  # 列表项
    s = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', s)  # 链接
    s = re.sub(r'[*`_]', '', s)                    # 强调
    s = re.sub(r'[\U0001F000-\U0001FAFF\u2600-\u27BF]', '', s)  # emoji
    s = re.sub(r'\n{2,}', '\n', s).strip()
    return s


def split_text(text, maxlen=140):
    """按句/段切分，避免单条 edge-tts 文本过长失败。"""
    segs = re.split(r'(?<=[。！？!?；;\n])', text)
    segs = [s.strip() for s in segs if s.strip()]
    out, buf = [], ''
    for s in segs:
        if len(s) > maxlen:
            if buf:
                out.append(buf); buf = ''
            for k in range(0, len(s), maxlen):
                out.append(s[k:k + maxlen])
            continue
        if buf and len(buf) + len(s) > maxlen:
            out.append(buf); buf = ''
        buf += ('' if not buf else ' ') + s
    if buf:
        out.append(buf)
    return out or [text]


def ex_text(ex):
    """构造习题朗读文本，与前端 app.js 的 speak-q 逻辑保持一致。"""
    t = ex.get('question', '') or ''
    t = re.sub(r'[*`_#]', '', t)
    et = ex.get('type')
    if et == 'choice':
        t += '。选项：' + '；'.join(ex.get('options') or []) + '。'
    elif et == 'fill':
        t += '。请填空。'
    elif et == 'order':
        t += '。请给步骤排顺序。'
    elif et == 'typing':
        t += '。请照着用键盘敲出来。'
    elif et == 'coding':
        t += '。请在下面的框里写 Python 代码，点运行按钮看结果。'
    elif et == 'tap':
        t += '。请点选正确答案。'
    return t.strip()


def _gen_audio_js(course_data):
    """扫描 audio/ 下 *_takeaway.mp3 / *_lec_*.mp3 / *_ex_*.mp3，生成 data/audio.js 的 AUDIO_MAP。"""
    import glob
    app_js = os.path.join(ROOT, 'js', 'app.js')
    asset_v = ''
    try:
        txt = open(app_js, encoding='utf-8').read()
        m = re.search(r"ASSET_V\s*=\s*'([^']+)'", txt)
        if m:
            asset_v = '?' + m.group(1)
    except Exception:
        pass

    amap = {}
    for ch in course_data['chapters']:
        for les in ch['lessons']:
            lid = les['id']
            entry = amap.get(lid, {})
            tp = os.path.join(AUDIO_DIR, lid + '_takeaway.mp3')
            if os.path.exists(tp) and os.path.getsize(tp) > 0:
                entry['takeaway'] = 'audio/' + lid + '_takeaway.mp3' + asset_v
            lec = sorted(glob.glob(os.path.join(AUDIO_DIR, lid + '_lec_*.mp3')))
            lec = [p for p in lec if os.path.getsize(p) > 0]
            if lec:
                entry['lecture'] = [{'src': 'audio/' + os.path.basename(p) + asset_v} for p in lec]
            # 习题：<lid>_ex<idx>_<n>.mp3 → exercises[idx] = [{src}...] 顺序播放
            ex_files = sorted(glob.glob(os.path.join(AUDIO_DIR, lid + '_ex*_*.mp3')))
            ex_map = {}
            for p in ex_files:
                if os.path.getsize(p) <= 0:
                    continue
                base = os.path.basename(p)
                m2 = re.match(r'%s_ex(\d+)_(\d+)\.mp3' % re.escape(lid), base)
                if not m2:
                    continue
                idx = int(m2.group(1))
                ex_map.setdefault(idx, []).append('audio/' + base + asset_v)
            if ex_map:
                exercises = []
                for idx in sorted(ex_map.keys()):
                    exercises.append([{'src': s} for s in ex_map[idx]])
                entry['exercises'] = exercises
            if entry:
                amap[lid] = entry

    out = os.path.join(ROOT, 'data', 'audio.js')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('// 由 gen_male_voice.py 自动生成，记录已烤制的真人语音映射（takeaway 小结 / lecture 讲义 / exercises 习题）。\n')
        f.write('window.AUDIO_MAP = ')
        json.dump(amap, f, ensure_ascii=False, indent=1)
        f.write(';\n')
    n_t = sum(1 for v in amap.values() if v.get('takeaway'))
    n_l = sum(1 for v in amap.values() if v.get('lecture'))
    n_e = sum(len(v.get('exercises', [])) for v in amap.values())
    print('  audio.js 已更新，含 %d 课小结映射 / %d 课讲义映射 / %d 题习题映射' % (n_t, n_l, n_e))


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lessons', nargs='*', default=[], help='要烤 takeaway 的课 id')
    ap.add_argument('--takeaways', default='first', choices=['first', 'all', 'none'],
                    help='first=只烤第1课, all=全部, none=不烤小结')
    ap.add_argument('--lectures', default='none', choices=['all', 'none'],
                    help='all=把每课讲义也烤成男生真人声(朗读讲义走真人声)')
    ap.add_argument('--exercises', default='none', choices=['all', 'none'],
                    help='all=把每题也烤成男生真人声(朗读题目走真人声，统一男声)')
    args = ap.parse_args()

    data = load_course()
    os.makedirs(WORDS_DIR, exist_ok=True)

    # 1) 唯一单词：读音 + 解释
    word_set = {}
    for ch in data['chapters']:
        for les in ch['lessons']:
            for w in (les.get('words') or []):
                en = str(w.get('en', '')).strip().upper()
                if en:
                    word_set[en] = w.get('zh', '')

    print('唯一单词数:', len(word_set))
    done = 0
    for en, zh in word_set.items():
        low = en.lower()
        a1 = await tts(en, os.path.join(WORDS_DIR, low + '_en.mp3'))
        # 解释：去掉可能的 "英文:" 前缀，直接读中文
        zh_text = re.sub(r'^[A-Za-z0-9_]+[：:]\s*', '', zh or '').strip()
        a2 = await tts(zh_text, os.path.join(WORDS_DIR, low + '_zh.mp3'))
        if a1 or a2:
            done += 1
        await asyncio.sleep(0.15)
    print('单词音频新烤:', done)

    # 2) takeaway 小结
    if args.takeaways == 'none':
        lesson_ids = []
    elif args.takeaways == 'all':
        lesson_ids = [l['id'] for ch in data['chapters'] for l in ch['lessons']]
    else:  # first
        lesson_ids = [data['chapters'][0]['lessons'][0]['id']]
    lesson_ids = list(dict.fromkeys(lesson_ids + args.lessons))

    td = 0
    for ch in data['chapters']:
        for les in ch['lessons']:
            if les['id'] in lesson_ids and les.get('takeaway'):
                out = os.path.join(AUDIO_DIR, les['id'] + '_takeaway.mp3')
                if await tts(les['takeaway'], out):
                    td += 1
    print('小结音频新烤:', td)

    # 3) 讲义：逐课把 strip_markdown(markdown) 切段烤成 <id>_lec_<n>.mp3
    ld = 0
    if args.lectures == 'all':
        for ch in data['chapters']:
            for les in ch['lessons']:
                if not les.get('markdown'):
                    continue
                plain = strip_markdown(les['markdown'])
                chunks = split_text(plain)
                ok = 0
                for n, seg in enumerate(chunks):
                    out = os.path.join(AUDIO_DIR, '%s_lec_%d.mp3' % (les['id'], n))
                    if await tts(seg, out):
                        ok += 1
                if ok:
                    ld += 1
        print('讲义音频新烤(课数):', ld)

    # 4) 习题：逐题构造题面文本（与前端一致）切段烤成 <id>_ex<idx>_<n>.mp3
    ed = 0
    if args.exercises == 'all':
        for ch in data['chapters']:
            for les in ch['lessons']:
                for idx, ex in enumerate(les.get('exercises') or []):
                    text = ex_text(ex)
                    if not text:
                        continue
                    chunks = split_text(text)
                    ok = 0
                    for n, seg in enumerate(chunks):
                        out = os.path.join(AUDIO_DIR, '%s_ex%d_%d.mp3' % (les['id'], idx, n))
                        if await tts(seg, out):
                            ok += 1
                    if ok:
                        ed += 1
        print('习题音频新烤(题数):', ed)

    # 5) 自动生成 data/audio.js：扫描 takeaway + lecture + exercises → 写 AUDIO_MAP
    _gen_audio_js(data)
    print('✅ 完成。单词在 audio/words/，小结与讲义在 audio/，映射已写入 data/audio.js')


if __name__ == '__main__':
    asyncio.run(main())
