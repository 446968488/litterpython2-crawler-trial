# -*- coding: utf-8 -*-
"""从 narration.TALK 提取「小光讲一讲」文案，生成 data/talk.js 供前端显示字幕/要点。
TALK[id] = [{'say':..,'voice':..}, ...]；我们取每个点的 voice（即真人语音念的内容）拼成数组。
"""
import os, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import narration  # noqa


def collect():
    out = {}
    for lid, pts in narration.TALK.items():
        if not isinstance(pts, list):
            continue
        voices = []
        for p in pts:
            v = p.get('voice') or p.get('text') or ''
            if v.strip():
                voices.append(v.strip())
        if voices:
            out[lid] = voices
    return out


def main():
    data = collect()
    lines = ['// 自动生成：小光讲一讲文案（与 audio/<id>/narrate_<style>.mp3 同源，便于看字幕）',
             '// 重新生成：python tools/gen_talk.py',
             'window.LESSON_TALK = {']
    items = []
    for lid, voices in data.items():
        arr = json.dumps(voices, ensure_ascii=False)
        items.append('  %r: %s' % (lid, arr))
    lines.append(',\n'.join(items))
    lines.append('};')
    out_path = os.path.join(ROOT, 'data', 'talk.js')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print('wrote %s : %d lessons' % (out_path, len(data)))


if __name__ == '__main__':
    main()
