#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成「全部非视频语音」的真人音（edge-tts 晓晓 XiaoxiaoNeural，统一音色），三种风格：
  gentle 亲切低龄 / humor 幽默话唠 / strict 严厉毒舌
产物：
  audio/<课号>/narrate_<style>.mp3      讲一讲（向导小光的总结/发散，与视频不重复）
  audio/common/<name>_<style>.mp3       fb_right / fb_wrong / enc_0..3 / report_open / report_close
  audio/_learn/<name>_<style>.mp3       学习报告里向导的点评（notDone/allCorrect/encourage/wrongMid/wrong1..6）
规则：同一音色不混搭；风格只改话术，不改发音人；离线打包，家长页一键切换。
"""
import os, sys, io, asyncio, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import narration as N
import pron

VOICE = 'zh-CN-XiaoxiaoNeural'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'audio')
STYLES = ['gentle', 'humor', 'strict']
# FORCE=1 时强制覆盖重合成（用于统一修正多音字发音等），不删文件
FORCE = os.environ.get('FORCE') == '1'

# ---- 讲一讲：幽默/毒舌 用「固定开场+收尾」包住事实总结，形成三种不同语感 ----
HUMOR_INTRO = '哎哎听好喽，小光给你唠两句——'
HUMOR_OUTRO = '就这？下节更带劲，等着！'
STRICT_INTRO = '都听好了，这节你要是还不会，可说不过去。'
STRICT_OUTRO = '记牢了没？没记牢就重看一遍，别到时候抓瞎。'

# ---- 通用短语音（答题对错/鼓励/报告）三风格话术 ----
COMMON = {
 'gentle': {
    'fb_right': '答对啦！你真棒！',
    'fb_wrong': '答错了。再试一次哦。',
    'enc_0': '真棒！', 'enc_1': '越来越厉害了！', 'enc_2': '你已经是小程序员了！', 'enc_3': '坚持了这么久，你太了不起了！',
    'report_open': '来，听一听今天的学习成果！',
    'report_close': '继续加油，你会越来越厉害！',
 },
 'humor': {
    'fb_right': '哈哈答对啦！你这小脑袋瓜可以的嘛！',
    'fb_wrong': '哎呀翻车啦！没关系，重来重来。',
    'enc_0': '可以可以，有点东西！', 'enc_1': '学得挺快嘛，藏得挺深！', 'enc_2': '嚯，小程序员出炉啦！', 'enc_3': '坚持这么久，我服你！',
    'report_open': '来来来，看看你今天折腾出啥名堂！',
    'report_close': '继续整，别停，下回更猛！',
 },
 'strict': {
    'fb_right': '算你答对。这一题总算没丢人。',
    'fb_wrong': '答错了！这都能错？好好看题，重做！',
    'enc_0': '还行，别骄傲。', 'enc_1': '有进步，但还差得远。', 'enc_2': '勉强算个程序员了，继续。', 'enc_3': '坚持到现在，算你硬气。',
    'report_open': '听着，汇报一下你今天学了啥。',
    'report_close': '别松懈，下一课更难。',
 },
}
# 学习报告里向导的点评（不含 takeaway 事实回顾）
# 学习报告里向导的点评（不含 takeaway 事实回顾）。每个状态给 2 个自然说法，前端随机抽，避免每次听都一模一样（消人机感）。
# 注意：不再有独立的 encourage 尾巴——温暖/鼓励已揉进各状态点评里，避免"念报告+通用夸"两段式机器人味。
LEARN = {
 'gentle': {
    'notDone': ['这一节你还没做题呢，先去下面做几道，做完再来听我讲成果呀。',
                '诶，这节的题都还没做哦，先把题做完，再回来听成果吧。'],
    'allCorrect': ['而且今天这些练习，你全都一次做对啦，真厉害！',
                  '今天这几道题，你一次都没错，太棒啦！'],
    'wrongMid': ['不过有几题第一次没做对，没关系，回去再练练就好啦。',
                 '有那么几题头一回没答对，别灰心，改改就会了。'],
    'wrong': ['第1题第一次没做对。', '第2题第一次没做对。', '第3题第一次没做对。',
              '第4题第一次没做对。', '第5题第一次没做对。', '第6题第一次没做对。'],
 },
 'humor': {
    'notDone': ['哎哟，这节题都还没碰呢，先去刷几道，再来听我给你颁奖。',
                '嘿，题都没做就想听成果？快去把题做了再来。'],
    'allCorrect': ['而且今天全一次过，行啊你，运气不错！',
                  '好家伙，这几道题一次都没错，今天状态在线啊！'],
    'wrongMid': ['不过嘛，有题头回翻车了，回去给它抓出来改改。',
                 '有几题第一次没过，别急，回去再战一把就赢啦。'],
    'wrong': ['第1题头回没过。', '第2题头回没过。', '第3题头回没过。',
              '第4题头回没过。', '第5题头回没过。', '第6题头回没过。'],
 },
 'strict': {
    'notDone': ['题都没做就别来听成果，先去把题做了。',
                '这一节一题都没动，先去做完再来。'],
    'allCorrect': ['今天全一次对，算是没给我丢脸。',
                   '这几道题一次没错，这回算你过关。'],
    'wrongMid': ['有题第一次就错，给我回去重练。',
                 '几道题头回没过，拿去改，改完再听。'],
    'wrong': ['第1题第一次就错。', '第2题第一次就错。', '第3题第一次就错。',
              '第4题第一次就错。', '第5题第一次就错。', '第6题第一次就错。'],
 },
}

async def synth(text, out):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    for attempt in range(6):
        try:
            import edge_tts
            comm = edge_tts.Communicate(pron.fix_pron(text), VOICE)
            await comm.save(out)
            if os.path.exists(out) and os.path.getsize(out) > 500:
                return True
        except Exception as e:
            sys.stderr.write('  retry %d: %s\n' % (attempt + 1, e))
            await asyncio.sleep(1.5 * (attempt + 1))
    return False

def log(msg):
    sys.stdout.write(msg + '\n'); sys.stdout.flush()

async def gen_narrate():
    # 每课讲一讲：三风格（总是基于最新 narration.TALK 重合成，确保语音与字幕一致）
    for lid, segs in N.TALK.items():
        gentle_text = ' '.join((s.get('voice') or '') for s in segs).strip()
        base_dir = os.path.join(AUDIO, lid)
        os.makedirs(base_dir, exist_ok=True)
        gentle_style = os.path.join(base_dir, 'narrate_gentle.mp3')
        ok = await synth(gentle_text, gentle_style)
        log(('OK  ' if ok else 'FAIL') + ' narrate_gentle ' + lid)
        for st in ('humor', 'strict'):
            out = os.path.join(base_dir, 'narrate_%s.mp3' % st)
            intro = HUMOR_INTRO if st == 'humor' else STRICT_INTRO
            outro = HUMOR_OUTRO if st == 'humor' else STRICT_OUTRO
            text = (intro + ' ' + gentle_text + ' ' + outro).strip()
            ok = await synth(text, out)
            log(('OK  ' if ok else 'FAIL') + ' narrate_%s %s' % (st, lid))


async def gen_common():
    # 通用短语音：fb_right/fb_wrong/enc_0..3/report_open/report_close
    common_dir = os.path.join(AUDIO, 'common')
    for st in STYLES:
        d = COMMON[st]
        names = ['fb_right', 'fb_wrong', 'enc_0', 'enc_1', 'enc_2', 'enc_3', 'report_open', 'report_close']
        for nm in names:
            out = os.path.join(common_dir, '%s_%s.mp3' % (nm, st))
            if not FORCE and os.path.exists(out):
                continue
            ok = await synth(d[nm], out)
            log(('OK  ' if ok else 'FAIL') + ' %s_%s' % (nm, st))


async def gen_learn():
    # 学习报告向导点评：notDone/allCorrect/wrongMid（各 2 版随机抽，消人机感）/wrong1..6
    learn_dir = os.path.join(AUDIO, '_learn')
    for st in STYLES:
        d = LEARN[st]
        singles = {'notDone': d['notDone'], 'allCorrect': d['allCorrect'], 'wrongMid': d['wrongMid']}
        for nm, val in singles.items():
            items = val if isinstance(val, list) else [val]
            for vi, txt in enumerate(items):
                suf = '' if vi == 0 else ('_v%d' % vi)
                out = os.path.join(learn_dir, '%s%s_%s.mp3' % (nm, suf, st))
                if FORCE or not os.path.exists(out):
                    ok = await synth(txt, out)
                    log(('OK  ' if ok else 'FAIL') + ' learn_%s%s_%s' % (nm, suf, st))
        for i, txt in enumerate(d['wrong'], start=1):
            out = os.path.join(learn_dir, 'wrong%d_%s.mp3' % (i, st))
            if FORCE or not os.path.exists(out):
                ok = await synth(txt, out)
                log(('OK  ' if ok else 'FAIL') + ' learn_wrong%d_%s' % (i, st))
    # 兜底：gentle 基础名（不带风格/变体后缀）也写一份，供旧引用 + 前端随机抽变体
    d = LEARN['gentle']
    singles = {'notDone': d['notDone'], 'allCorrect': d['allCorrect'], 'wrongMid': d['wrongMid']}
    for nm, val in singles.items():
        items = val if isinstance(val, list) else [val]
        for vi, txt in enumerate(items):
            suf = '' if vi == 0 else ('_v%d' % vi)
            base = os.path.join(learn_dir, '%s%s.mp3' % (nm, suf))
            if FORCE or not os.path.exists(base):
                ok = await synth(txt, base)
                log(('OK  ' if ok else 'FAIL') + ' learn_%s%s (base)' % (nm, suf))
    for i, txt in enumerate(d['wrong'], start=1):
        base = os.path.join(learn_dir, 'wrong%d.mp3' % i)
        if FORCE or not os.path.exists(base):
            ok = await synth(txt, base)
            log(('OK  ' if ok else 'FAIL') + ' learn_wrong%d (base)' % i)


async def main():
    # 先生成「通用短语音 + 报告点评」（gentle 优先），让用户能立刻试默认风格的答题语音
    await gen_common()
    await gen_learn()
    # 再生成每课讲一讲（三风格）
    await gen_narrate()
    log('DONE gen_voices')

if __name__ == '__main__':
    asyncio.run(main())
