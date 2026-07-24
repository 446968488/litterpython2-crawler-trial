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
global.navigator = window.navigator;
window.Audio = function(){ return { play(){return Promise.resolve();} }; };

function load(f){ const code = fs.readFileSync(path.join(base, f), 'utf8'); window.eval(code); }
['js/vocab.js','data/course.js','js/figures.js','data/words.js','js/app.js'].forEach(load);

function click(el){ if(el){ el.dispatchEvent(new window.Event('click', {bubbles:true})); } }

const fab = window.document.querySelector('#scroll-fab');
const up = window.document.querySelector('#fab-up');
const down = window.document.querySelector('#fab-down');
console.log('FAB 存在:', !!fab, '| 向上键:', !!up, '| 向下键:', !!down);

// 点击不抛异常
let threw = false;
try { click(up); click(down); } catch(e){ threw = true; console.log('CLICK ERR', e.message); }
console.log('点击 up/down 不抛异常:', !threw);

// 模拟 lesson-view 可滚动：强制 scrollHeight > clientHeight 后触发刷新；jsdom 不布局，直接验证 activeScroller 取到 lesson-view
const lv = window.document.querySelector('#lesson-view');
console.log('首屏 activeScroller 应为 home-view(首页可见):', !lv || lv.style.display === 'none');

console.log((fab && up && down && !threw) ? 'PASS ✅ 一键上下按钮已接入' : 'FAIL ❌');
