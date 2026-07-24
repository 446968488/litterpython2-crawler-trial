# -*- coding: utf-8 -*-
"""中文多音字发音修正（edge-tts 兼容版）。

edge_tts.Communicate 会对输入文本做 XML escape 后再包进自己的 <speak> SSML，
因此不能把 <phoneme> 等 SSML 标签传给它，否则会被当成普通字符读成"一串代码"。
这里改用『同音/近音字替换』：只改传给 TTS 的文本，不改展示文本，零副作用。
"""
import re

# 行：量词读 háng（一行代码 / 三行 / 每行）—— 晓晓常误读为 xíng
_PREFIX = '0123456789一二三四五六七八九十百千两几每上下前后逐号令同半某好那这全'
_SUFFIX = '数尾首号列间里'
_MEASURE_RE = re.compile(r'([' + _PREFIX + r'])( ?)行|行(?=[' + _SUFFIX + r'])')


def _sub_row(m):
    if m.group(1) is not None:
        return m.group(1) + (m.group(2) or '') + '杭'   # 杭 háng，同音
    return '杭'


def fix_pron(text):
    """返回修正后的 TTS 输入文本：命中规则则替换，否则原样返回。"""
    if not text:
        return text

    # 1. 行 háng -> 杭 háng
    text = _MEASURE_RE.sub(_sub_row, text)

    # 2. 重 chóng -> 崇 chóng（重读/重新/重来等）
    for old in ('重复', '重新', '重写', '重来', '重做', '重画'):
        text = text.replace(old, '崇' + old[1:])

    # 3. 长 zhǎng -> 掌 zhǎng（长大/长高/长成/长得）
    for old in ('长大', '长高', '长成', '长得'):
        text = text.replace(old, '掌' + old[1:])

    # 4. 觉 jiào -> 叫 jiào（睡觉）
    text = text.replace('睡觉', '睡叫')

    # 5. 模 mú -> 用近义词"样子"避开（模样）
    text = text.replace('模样', '样子')

    # 6. 中 zhòng -> 众 zhòng（猜中/中奖）
    text = text.replace('猜中', '猜众')
    text = text.replace('中奖', '众奖')

    # 7. 转 zhuǎn：晓晓在"转弯/转向/左转/右转"中通常读对，这里不动

    # 8. 处 chǔ -> 楚 chǔ（处理/处置）
    text = text.replace('处理', '楚理')
    text = text.replace('处置', '楚置')

    # 9. 数 shǔ -> 属 shǔ（数一数/数数）
    text = text.replace('数一数', '属一数')
    text = text.replace('数数', '属数')

    return text


def needs_fix(text):
    """该文本是否含有需要修正的多音字（用于增量判断）。"""
    if not text:
        return False
    if _MEASURE_RE.search(text):
        return True
    for pat in ('重复', '重新', '重写', '重来', '重做', '重画',
                '长大', '长高', '长成', '长得',
                '睡觉', '模样', '猜中', '中奖', '处理', '处置', '数一数', '数数'):
        if pat in text:
            return True
    return False
