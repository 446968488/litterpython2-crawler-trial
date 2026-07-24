#!/usr/bin/env python3
# 为课程「顶层 words」（带 en/zh、但代码里没有显式 enAudio 字段）的单词补生成真人发音：
#   audio/words/{en}_en.mp3  (英文发音, en-US-AriaNeural)
#   audio/words/{en}_zh.mp3  (中文释义, zh-CN-XiaoxiaoNeural)
# 已存在的文件自动跳过，可重复运行补生成缺词。
import asyncio, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data', 'course.js')
WORDS_DIR = os.path.join(ROOT, 'audio', 'words')
os.makedirs(WORDS_DIR, exist_ok=True)
VOICE_EN = 'en-US-AriaNeural'
VOICE_ZH = 'zh-CN-XiaoxiaoNeural'


def parse_terms(path):
    txt = open(path, encoding='utf-8').read()
    pat = re.compile(r"en:\s*'([^']*)',\s*zh:\s*'([^']*)'")
    terms, seen = [], set()
    for m in pat.finditer(txt):
        en, zh = m.group(1), m.group(2)
        k = en.lower()
        if k in seen:
            continue
        seen.add(k)
        terms.append((en, zh))
    return terms


async def synth(text, voice, out_path):
    import edge_tts
    comm = edge_tts.Communicate(text=text, voice=voice)
    await comm.save(out_path)


async def main():
    terms = parse_terms(SRC)
    todo = []
    for en, zh in terms:
        key = en.lower()
        en_path = os.path.join(WORDS_DIR, f'{key}_en.mp3')
        zh_path = os.path.join(WORDS_DIR, f'{key}_zh.mp3')
        if not os.path.exists(en_path):
            todo.append((en, VOICE_EN, en_path, f'EN:{en}'))
        if not os.path.exists(zh_path):
            todo.append((zh, VOICE_ZH, zh_path, f'ZH:{en}'))
    print(f'课程顶层单词 {len(terms)} 个，需合成 {len(todo)} 个音频', flush=True)
    sem = asyncio.Semaphore(10)

    async def work(item):
        text, voice, out, label = item
        async with sem:
            try:
                await synth(text, voice, out)
                return f'OK  {label}'
            except Exception as e:  # noqa
                return f'ERR {label}: {e}'

    results = await asyncio.gather(*[work(t) for t in todo])
    for r in results:
        if r.startswith('ERR'):
            print(r, flush=True)
    print(f'完成：成功 {sum(1 for r in results if r.startswith("OK"))} / {len(todo)}', flush=True)
    # 校验
    en_n = sum(1 for en, _ in terms if os.path.exists(os.path.join(WORDS_DIR, en.lower() + '_en.mp3')))
    zh_n = sum(1 for en, _ in terms if os.path.exists(os.path.join(WORDS_DIR, en.lower() + '_zh.mp3')))
    print(f'校验：{en_n}/{len(terms)} 英文, {zh_n}/{len(terms)} 中文 已就绪', flush=True)


if __name__ == '__main__':
    asyncio.run(main())
