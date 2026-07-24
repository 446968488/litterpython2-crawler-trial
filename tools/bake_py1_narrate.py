#!/usr/bin/env python3
# 单独重烤 py1 三风格 narrate，用最新 pron.py 修正多音字
import os, sys, asyncio
sys.path.insert(0, 'tools')
import gen_matched as G
import narration as N
from gen_voices import HUMOR_INTRO, HUMOR_OUTRO, STRICT_INTRO, STRICT_OUTRO

ROOT = '/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具'
AUDIO = os.path.join(ROOT, 'audio')

lid = 'py1'
segs = N.TALK[lid]
gentle_text = ' '.join((s.get('voice') or '') for s in segs).strip()

async def run():
    base_dir = os.path.join(AUDIO, lid)
    os.makedirs(base_dir, exist_ok=True)
    # gentle
    out = os.path.join(base_dir, 'narrate_gentle.mp3')
    await G.tts(gentle_text, out)
    print('OK narrate_gentle', lid, os.path.getsize(out))
    # humor / strict
    for st, intro, outro in [('humor', HUMOR_INTRO, HUMOR_OUTRO), ('strict', STRICT_INTRO, STRICT_OUTRO)]:
        text = (intro + ' ' + gentle_text + ' ' + outro).strip()
        out = os.path.join(base_dir, 'narrate_%s.mp3' % st)
        await G.tts(text, out)
        print('OK narrate_%s' % st, lid, os.path.getsize(out))

asyncio.run(run())
