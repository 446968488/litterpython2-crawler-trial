// 从 data/course.js 提取所有讲义/题目文本，按语义切句，输出 audio/sources.json
// 切句规则：按中文标点切，记录每句后的停顿类型（long=句号级 / short=逗号级 / tiny=无标点）
global.window = {};
require('/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具/data/course.js');
const data = global.window.COURSE_DATA;
const fs = require('fs');
const path = require('path');

function stripMd(md) {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/>\s?/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/[\p{Emoji_Presentation}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function splitSentences(text) {
  const segs = [];
  const re = /([^。！？!?；;，、：]+)([。！？!?；;，、：]?)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const word = m[1].trim();
    const punc = m[2];
    if (!word) continue;
    let pause = 'tiny';
    if ('。！？!?；;'.includes(punc)) pause = 'long';
    else if ('，、：'.includes(punc)) pause = 'short';
    segs.push({ text: word, pause });
  }
  return segs;
}

const out = {};
for (const ch of data.chapters) {
  for (const les of ch.lessons) {
    const lect = splitSentences(stripMd(les.markdown || ''));
    const exs = (les.exercises || []).map((ex) => {
      let q = ex.question || '';
      if (ex.type === 'choice' && Array.isArray(ex.options)) {
        q += ' 选项：' + ex.options.map((o, i) => String.fromCharCode(65 + i) + ' ' + o).join('；');
      } else if (ex.type === 'fill') {
        q += ' 请填空。';
      }
      return splitSentences(q);
    });
    out[les.id] = { lecture: lect, exercises: exs };
  }
}

const dir = '/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具/audio';
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'sources.json'), JSON.stringify(out, null, 2), 'utf8');
let s = 0;
for (const k in out) s += out[k].lecture.length + out[k].exercises.reduce((a, e) => a + e.length, 0);
console.log('提取完成：课时', Object.keys(out).length, '｜ 句子总数', s);
