const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const BASE = '/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具';
const html = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');

// 预解锁全部课，避免卡片锁定
const seeds = { course_progress_v1: {} };
for (let c = 0; c < 14; c++) for (let l = 0; l < 6; l++) seeds.course_progress_v1['c' + c + 'l' + l] = { done: true, exDone: true, taken: 0 };
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
window.localStorage.setItem('course_progress_v1', JSON.stringify(seeds.course_progress_v1));
const files = ['data/course.js','data/audio.js','data/words.js','js/vocab.js','js/figures.js','js/app.js'];
window.onerror = (msg, src, line, col, err) => { console.log('SCRIPT ERROR:', msg, 'at', line+':'+col); };
for (const f of files) {
  try {
    const code = fs.readFileSync(path.join(BASE, f), 'utf8');
    const s = window.document.createElement('script'); s.textContent = code; window.document.body.appendChild(s);
  } catch (e) { console.log('LOAD FAIL', f, e.message); }
}
console.log('COURSE_DATA?', !!window.COURSE_DATA, 'VOCAB?', !!window.VOCAB, 'init?', typeof window.init);
const doc = window.document;
function click(el){ const e = new window.MouseEvent('click',{bubbles:true}); el.dispatchEvent(e); }

const cards = doc.querySelectorAll('.lesson-card');
console.log('卡片数:', cards.length);
// 第1课 = c0l1，索引0
const c0 = cards[0];
click(c0);
const lw = doc.querySelector('#lesson-words-btn');
console.log('本节单词按钮存在:', !!lw);
click(lw);
const modal = doc.querySelector('#modal');
const txt = modal.textContent;
console.log('含"常用基础词":', txt.indexOf('常用基础词') >= 0);
const chips = modal.querySelectorAll('.word-chip');
console.log('常用词芯片数:', chips.length);
console.log('前3个芯片:', Array.from(chips).slice(0,3).map(b=>b.textContent).join(','));
// 点第一个 python
click(chips[0]);
const practice = doc.querySelector('#modal .wp-word');
console.log('练习页单词:', practice ? practice.textContent : '(无)');
const typeRows = doc.querySelectorAll('#wp-type-list .wp-input');
console.log('敲打框数:', typeRows.length, '首框data-en:', typeRows[0] ? typeRows[0].getAttribute('data-en') : '');
console.log('ALL DONE');
