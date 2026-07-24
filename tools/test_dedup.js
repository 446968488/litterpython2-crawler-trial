const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const BASE = '/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具';
const html = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
// 去掉外链脚本，改为手动注入本地文件（避免 jsdom 去 http 拉取）
const stripped = html.replace(/<script[^>]*src=[^>]*><\/script>/g, '');
const dom = new JSDOM(stripped, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
window.addEventListener('error', (e) => console.error('JS ERROR:', e.error && e.error.message));

const files = ['data/course.js', 'data/audio.js', 'data/words.js', 'js/vocab.js', 'js/figures.js', 'js/app.js'];
for (const f of files) {
  try {
    const code = fs.readFileSync(path.join(BASE, f), 'utf8');
    const s = window.document.createElement('script');
    s.textContent = code;
    window.document.body.appendChild(s);
    console.log('loaded', f, '| COURSE_DATA?', !!window.COURSE_DATA);
  } catch (e) { console.error('load fail', f, e.message); }
}
console.log('after inject: typeof flatLessons =', typeof window.flatLessons);

setTimeout(() => {
  try {
    const cards = window.document.querySelectorAll('.lesson-card').length;
    console.log('首页课卡:', cards, cards === 36 ? '✅' : '❌');
    const chapters = window.document.querySelectorAll('.chapter').length;
    console.log('首页章节块:', chapters, chapters === 14 ? '✅' : '❌');
    const first = window.document.querySelector('.lesson-card');
    if (first) { first.click(); console.log('进第1课 OK ✅'); } else console.error('无课卡可点');
    process.exit(0);
  } catch (e) { console.error('TEST THREW:', e.message); process.exit(1); }
}, 800);
