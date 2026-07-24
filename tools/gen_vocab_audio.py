#!/usr/bin/env python3
# 生成单词本真人发音：读取 data/vocab-words.js，为每一个词合成
#   audio/words/{en}_en.mp3  (英文发音, en-US-AriaNeural)
#   audio/words/{en}_zh.mp3  (中文释义, zh-CN-XiaoxiaoNeural)
# 已存在的文件会跳过（可重复运行补生成）。
import asyncio, re, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data', 'vocab-words.js')
WORDS_DIR = os.path.join(ROOT, 'audio', 'words')
os.makedirs(WORDS_DIR, exist_ok=True)

VOICE_EN = 'en-US-AriaNeural'
VOICE_ZH = 'zh-CN-XiaoxiaoNeural'

def parse_terms(path):
    txt = open(path, encoding='utf-8').read()
    # 匹配 { en: 'x', zh: 'y' }
    pat = re.compile(r"en:\s*'([^']*)',\s*zh:\s*'([^']*)'")
    return [(m.group(1), m.group(2)) for m in pat.finditer(txt)]

async def synth(text, voice, out_path):
    import edge_tts
    comm = edge_tts.Communicate(text=text, voice=voice)
    await comm.save(out_path)

async def main():
    terms = parse_terms(SRC)
    print(f'解析到 {len(terms)} 个词条', flush=True)
    sem = asyncio.Semaphore(10)
    todo = []
    for en, zh in terms:
        key = en.lower()
        en_path = os.path.join(WORDS_DIR, f'{key}_en.mp3')
        zh_path = os.path.join(WORDS_DIR, f'{key}_zh.mp3')
        if not os.path.exists(en_path):
            todo.append((en, VOICE_EN, en_path, f'EN:{en}'))
        if not os.path.exists(zh_path):
            todo.append((zh, VOICE_ZH, zh_path, f'ZH:{en}'))
    print(f'需要合成 {len(todo)} 个音频', flush=True)

    async def work(item):
        text, voice, out, label = item
        async with sem:
            try:
                await synth(text, voice, out)
                return f'OK  {label}'
            except Exception as e:
                return f'ERR {label}: {e}'

    results = await asyncio.gather(*[work(t) for t in todo])
    errs = [r for r in results if r.startswith('ERR')]
    oks = [r for r in results if r.startswith('OK')]
    print(f'完成：成功 {len(oks)}，失败 {len(errs)}', flush=True)
    for e in errs[:20]:
        print(e, flush=True)
    # 校验计数
    en_n = len([1 for en, _ in terms if os.path.exists(os.path.join(WORDS_DIR, en.lower()+'_en.mp3'))])
    zh_n = len([1 for en, _ in terms if os.path.exists(os.path.join(WORDS_DIR, en.lower()+'_zh.mp3'))])
    print(f'校验：{en_n}/{len(terms)} 英文, {zh_n}/{len(terms)} 中文 已就绪', flush=True)

if __name__ == '__main__':
    asyncio.run(main())
