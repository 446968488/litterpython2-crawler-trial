# 把 data/audio.js 里的 window.AUDIO_LEARN 重写为「变体数组」结构：
#   notDone / allCorrect / wrongMid 各为数组（前端随机抽一版，消人机感）
#   wrong 保持 [单条对象, ...]
# 依据 audio/_learn 目录下实际生成的文件（含 _vN 变体、_gentle/_humor/_strict 风格后缀）动态构建。
import os, re, glob, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LD = os.path.join(ROOT, 'audio', '_learn')
AJ = os.path.join(ROOT, 'data', 'audio.js')


def basename_of(fn):
    n = fn[:-4]  # 去掉 .mp3
    for st in ('_gentle', '_humor', '_strict'):
        if n.endswith(st):
            n = n[:-len(st)]
            break
    n = re.sub(r'_v\d+$', '', n)  # 去掉变体后缀 _vN
    return n


groups = {}  # base -> [filenames 无风格后缀]
for f in glob.glob(os.path.join(LD, '*.mp3')):
    fn = os.path.basename(f)
    if '_gentle' in fn or '_humor' in fn or '_strict' in fn:
        continue
    if fn.startswith('encourage'):  # 已废弃，跳过
        continue
    bn = basename_of(fn)
    groups.setdefault(bn, []).append(fn)


def variant_sort(fn):
    m = re.search(r'_v(\d+)\.mp3$', fn)
    return int(m.group(1)) if m else 0


def seglist(bn):
    files = sorted(groups.get(bn, []), key=variant_sort)
    return [{'src': 'audio/_learn/' + fn, 'pause': 'short'} for fn in files]


wrong = []
for i in range(1, 7):
    bn = 'wrong%d' % i
    sl = seglist(bn)
    if sl:
        wrong.append(sl[0])

learn = {
    'notDone': seglist('notDone'),
    'allCorrect': seglist('allCorrect'),
    'wrongMid': seglist('wrongMid'),
    'wrong': wrong,
}

s = open(AJ, encoding='utf-8').read()
new_block = 'window.AUDIO_LEARN = ' + json.dumps(learn, ensure_ascii=False) + ';'
s2 = re.sub(r'window\.AUDIO_LEARN\s*=\s*\{.*?\};\n', new_block + '\n', s, flags=re.S)
if s2 == s:
    s2 = re.sub(r'window\.AUDIO_LEARN\s*=\s*\{.*?\};\s*', new_block + '\n', s, flags=re.S)
open(AJ, 'w', encoding='utf-8').write(s2)
print('rewrote AUDIO_LEARN: notDone=%d allCorrect=%d wrongMid=%d wrong=%d' % (
    len(learn['notDone']), len(learn['allCorrect']), len(learn['wrongMid']), len(wrong)))
