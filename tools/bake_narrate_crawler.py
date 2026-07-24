# -*- coding: utf-8 -*-
"""为爬虫版每课合成 audio/<id>/narrate.mp3（小光讲一讲真人语音，edge-tts 晓晓）。
文案来源 = data/talk.js（与前端字幕同源）。
用法：
  python tools/bake_narrate_crawler.py            # 全部 40 课
  python tools/bake_narrate_crawler.py r0l1 r0l2  # 指定课号
"""
import json, os, re, asyncio, sys
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = "zh-CN-XiaoxiaoNeural"


def load_talk():
    src = open(os.path.join(ROOT, 'data', 'talk.js'), encoding='utf-8').read()
    m = re.search(r'window\.LESSON_TALK\s*=\s*(\{.*\})\s*;', src, re.S)
    return json.loads(m.group(1))


def clean_text(paras):
    parts = []
    for p in paras:
        p = (p or '').strip()
        if not p:
            continue
        if parts and p[0] in '。！？，、；：':
            p = p[1:]
        parts.append(p)
    return ''.join(parts)


async def tts_one(text, out):
    await edge_tts.Communicate(text, VOICE).save(out)


def main():
    talk = load_talk()
    ids = [a for a in sys.argv[1:] if a in talk] or list(talk.keys())
    ok = fail = 0
    for lid in ids:
        text = clean_text(talk[lid])
        d = os.path.join(ROOT, 'audio', lid)
        os.makedirs(d, exist_ok=True)
        out = os.path.join(d, 'narrate.mp3')
        try:
            asyncio.run(tts_one(text, out))
            print('OK   %s  %8d bytes' % (lid, os.path.getsize(out)), flush=True)
            ok += 1
        except Exception as e:
            print('FAIL %s  %s' % (lid, repr(e)[:120]), flush=True)
            fail += 1
    print('DONE ok=%d fail=%d' % (ok, fail), flush=True)


if __name__ == '__main__':
    main()
    os._exit(0)
