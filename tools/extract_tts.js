// 提取全部课程的可朗读文本，输出 /tmp/tts_tasks.json 供 edge-tts 合成
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = '/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具';
const sb = { window: {}, console }; sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/course.js'), 'utf8'), sb);
const data = sb.COURSE_DATA;

// 去 markdown 标记
function strip(md) {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '，')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*`_]/g, '')
    .replace(/\n{2,}/g, '\n')
    .replace(/[\p{Emoji_Presentation}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
// 按句断句（保留标点），合并过短碎片
function splitSentences(text) {
  const raw = String(text || '').split(/(?<=[。！？!?；;\n])/);
  const out = [];
  for (let s of raw) {
    s = s.trim();
    if (!s) continue;
    if (s.length < 3 && out.length) out[out.length - 1] += s;
    else out.push(s);
  }
  return out;
}
// 选项念法： "A. 红灯停" -> "选项A，红灯停"
function optSay(o) {
  return o.replace(/^([A-Da-d])[.、)\s]+/, (m, c) => '选项' + c.toUpperCase() + '，');
}

const tasks = [];
const AUDIO = path.join(ROOT, 'audio');

for (const ch of data.chapters) {
  for (const les of ch.lessons) {
    const lid = les.id;
    // 讲义：按句断句
    const lect = splitSentences(strip(les.markdown));
    lect.forEach((seg, i) => {
      tasks.push({ lid, kind: 'lecture', idx: i, text: seg, out: path.join(AUDIO, lid, `lecture_${i}.mp3`) });
    });
    // 题目
    (les.exercises || []).forEach((ex, ei) => {
      let q = strip(ex.question);
      if (ex.type === 'choice' && Array.isArray(ex.options)) {
        q += '。' + ex.options.map(optSay).join('。');
      } else if (ex.type === 'order' && Array.isArray(ex.steps)) {
        q += '。顺序应该是：' + ex.steps.join('，');
      } else if (ex.type === 'typing' && Array.isArray(ex.words)) {
        q += '。请依次输入：' + ex.words.join('，');
      } else if (ex.type === 'fill' || ex.type === 'open') {
        if (ex.answer) q += '。参考答案：' + strip(ex.answer);
      }
      tasks.push({ lid, kind: 'exercise', idx: ei, sub: 0, text: q, out: path.join(AUDIO, lid, `ex${ei}_q.mp3`) });
      if (ex.explain) {
        tasks.push({ lid, kind: 'exercise', idx: ei, sub: 1, text: '提示：' + strip(ex.explain), out: path.join(AUDIO, lid, `ex${ei}_e.mp3`) });
      }
    });
    // 学习成果：takeaway（三风格：gentle=口语事实；humor/strict 用专属套话包住事实）
    const TAKE_INTRO = { humor: '来，咱回头瞅瞅这节你学了啥——', strict: '这节学的东西，都给我听好——' };
    const TAKE_OUTRO = { humor: '就这些，够你玩一阵子啦！', strict: '都记牢，下节还要用！' };
    if (les.takeaway) {
      const fact = strip(les.takeaway);
      tasks.push({ lid, kind: 'takeaway', text: fact, out: path.join(AUDIO, lid, 'takeaway.mp3') });
      tasks.push({ lid, kind: 'takeaway', text: TAKE_INTRO.humor + fact + TAKE_OUTRO.humor, out: path.join(AUDIO, lid, 'takeaway_humor.mp3') });
      tasks.push({ lid, kind: 'takeaway', text: TAKE_INTRO.strict + fact + TAKE_OUTRO.strict, out: path.join(AUDIO, lid, 'takeaway_strict.mp3') });
    }
  }
}

// 学习成果·评价模块：按「情况 × 风格 × 多版本」整理真人话术
// 每种情况(未做完/全对/部分对)各给 亲切/幽默/毒舌 三套、每套 3 条不同说法，
// 前端随机抽一条并按风格拼音频后缀，做到"不同情况不同话、同情况也不重复"。
const LEARN_SET = {
  gentle: {
    notDone: [
      '咦，这一节的练习题还空着呢，咱们先去下面做几道，再来听学习成果吧～',
      '这节你还没动笔做题哦，先把练习做完，我再给你讲讲成果～',
      '练习还一道都没做呢，不着急，先去下面做几道，回来听我总结～',
    ],
    allCorrect: [
      '而且你今天的练习全都一次做对啦，太棒了！',
      '更厉害的是，这节的题你每一道都是一次过，稳稳的！',
      '还有呀，今天的练习你全做对了，一个都没错，给你点个大大的赞！',
    ],
    wrongMid: [
      '不过呢，',
      '只是有那么一点点小问题，',
      '不过呀，',
    ],
  },
  humor: {
    notDone: [
      '哎哟，这节的练习题还在这儿晾着呢，先去把它们收拾了再来听我夸你～',
      '活儿还没干完就想听成果？先把下面那几道题做了再说～',
      '练习还空着呢，别让它们等太久，去做完再来领你的学习成果～',
    ],
    allCorrect: [
      '好家伙，今天的练习你全一次做对，这运气我可以分一半！',
      '一节练习零失误，这波操作我给满分，飘了飘了～',
      '全对！而且全是一次过，你这手感今天在线啊～',
    ],
    wrongMid: [
      '不过嘛，',
      '就是有几位「捣蛋鬼」没对，',
      '不过呢，',
    ],
  },
  strict: {
    notDone: [
      '这一节的练习还没做，先去把题做完，再听学习成果。',
      '题都空着，别闲着，先把练习填完再来。',
      '练习一道没动，去做完，我再给你讲成果。',
    ],
    allCorrect: [
      '练习全都一次做对，这回没给我丢脸。',
      '一节零失误，算你过关。',
      '全对，而且都是一次过，可以。',
    ],
    wrongMid: [
      '不过，',
      '只是有几题错了，',
      '但是，',
    ],
  },
};
// 生成：{base}_vN.mp3 = 亲切版；_humor / _strict 为另两版
for (const st of ['gentle', 'humor', 'strict']) {
  for (const base of ['notDone', 'allCorrect', 'wrongMid']) {
    LEARN_SET[st][base].forEach((text, v) => {
      const suf = st === 'gentle' ? '' : '_' + st;
      tasks.push({ lid: 'LEARN', kind: 'learn', key: base, text, out: path.join(AUDIO, '_learn', `${base}_v${v}${suf}.mp3`) });
    });
  }
}
// 第N题第一次没做对（N=1..6）：保持简洁，按风格给各一版
const WRONG_TXT = {
  gentle: (n) => `第${n}题第一次没做对，没关系，改改就好～`,
  humor:  (n) => `第${n}题头回没对，抓出来再练练它～`,
  strict: (n) => `第${n}题第一次错了，拿去改。`,
};
for (let n = 1; n <= 6; n++) {
  for (const st of ['gentle', 'humor', 'strict']) {
    const suf = st === 'gentle' ? '' : '_' + st;
    tasks.push({ lid: 'LEARN', kind: 'learn', key: 'wrong' + n, text: WRONG_TXT[st](n), out: path.join(AUDIO, '_learn', `wrong${n}${suf}.mp3`) });
  }
}

fs.writeFileSync('/tmp/tts_tasks.json', JSON.stringify(tasks, null, 0));
console.log('提取完成：共 ' + tasks.length + ' 段待合成文本');
const byL = {};
tasks.forEach(t => byL[t.lid] = (byL[t.lid] || 0) + 1);
console.log('课程数：' + (Object.keys(byL).length - 1) + ' 课 + 学习成果通用片段');
