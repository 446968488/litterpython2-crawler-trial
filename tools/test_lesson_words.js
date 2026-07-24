const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const base = '/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具';

const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8')
  .replace(/<script src="vendor\/skulpt[^>]*><\/script>/g, '')
  .replace(/<script src="data\/audio\.js[^>]*><\/script>/g, '');

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
global.window = window; global.document = window.document;
global.navigator = window.navigator; global.Audio = function(){ return { play(){return Promise.resolve();} }; };

function load(f){ const code = fs.readFileSync(path.join(base, f), 'utf8'); window.eval(code); }

// 先加载数据依赖
['js/vocab.js','data/course.js','js/figures.js','data/words.js'].forEach(load);

// 预置进度：解锁所有课，避免 c0l2 被锁
const flat = window.COURSE_DATA.chapters.flatMap(ch => ch.lessons);
const prog = {};
flat.forEach(l => { prog[l.id] = { parentUnlocked: true }; });
window.localStorage.setItem('course_progress_v1', JSON.stringify(prog));

// 再加载 app（init 会读取上面的进度）
try { load('js/app.js'); } catch(e){ console.log('ERR app', e.message); }

function click(el){ if(el){ const ev = new window.Event('click', {bubbles:true}); el.dispatchEvent(ev); } }

const cards = window.document.querySelectorAll('.lesson-card');
console.log('课程卡片总数:', cards.length);
const c0l2 = cards[1]; // 第2课
if (!c0l2) { console.log('FAIL: 无第2课卡片'); process.exit(1); }
click(c0l2);

const lwBtn = window.document.querySelector('#lesson-words-btn');
console.log('课程内单词按钮存在:', !!lwBtn);
if (!lwBtn) { console.log('FAIL: 未找到 #lesson-words-btn'); process.exit(1); }
click(lwBtn);

const mask = window.document.querySelector('#modal-mask');
const visible = mask && (mask.style.display !== 'none');
const wordChips = window.document.querySelectorAll('.word-chip');
console.log('单词本弹窗可见:', visible, '| 单词芯片:', wordChips.length);
console.log(wordChips.length > 0 && visible ? 'PASS ✅ 课程内单词入口可用' : 'FAIL ❌');
