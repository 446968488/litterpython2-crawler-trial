const { JSDOM } = require('jsdom');
const fs = require('fs');
const base = '/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具';
const html = fs.readFileSync(base + '/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
const { window } = dom;
const document = window.document;
// stubs（不加载 skulpt / 不依赖真实音频）
window.AudioContext = class { constructor(){ this.destination={}; } createOscillator(){ return { connect(){}, start(){}, stop(){}, frequency:{} }; } createGain(){ return { connect(){}, gain:{} }; } };
window.SpeechSynthesisUtterance = function(){};
window.speechSynthesis = { cancel(){}, speak(){} };
window.MD = { render: (s) => s };
const files = ['data/course.js','data/audio.js','data/words.js','js/figures.js','js/app.js'];
for (const f of files) { try { window.eval(fs.readFileSync(base + '/' + f, 'utf8')); } catch(e){ console.log('EVAL ERR', f, e.message); } }

const wb = document.getElementById('words-btn');
console.log('1. words-btn found:', !!wb);
wb.click();
const chips = document.querySelectorAll('#modal .word-chip');
console.log('2. word chips:', chips.length);
chips[0].click();
const inputs = document.querySelectorAll('#wp-type-list .wp-input');
console.log('3. type inputs (should = WORD_LIST length):', inputs.length);
// 正确：输入 print 回车
inputs[0].value = 'print';
inputs[0].dispatchEvent(new window.KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
console.log('4. in0 feedback:', inputs[0].parentNode.querySelector('.wp-type-fb').textContent, '| focus moved to in1?', document.activeElement === inputs[1]);
// 错误：输入 xxx 回车
inputs[1].value = 'xxx';
inputs[1].dispatchEvent(new window.KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
console.log('5. in1 feedback:', inputs[1].parentNode.querySelector('.wp-type-fb').textContent, '| focus moved to in2?', document.activeElement === inputs[2]);
// 最后一个回车→总结
inputs[2].value = 'for';
inputs[2].dispatchEvent(new window.KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
console.log('6. summary:', document.querySelector('#wp-type-result').textContent);
// 录音按钮（jsdom 无 MediaRecorder → 应走“不支持”分支，不崩溃）
const rb = document.getElementById('wp-read');
if (rb) { rb.click(); console.log('7. record btn after click (no crash):', rb.textContent); }
console.log('TEST DONE');
