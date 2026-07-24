const { JSDOM } = require('jsdom');
const fs = require('fs');
const base = '/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具';
const html = fs.readFileSync(base + '/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
const { window } = dom;
const document = window.document;
window.AudioContext = class { constructor(){ this.destination={}; } createOscillator(){ return { connect(){}, start(){}, stop(){}, frequency:{} }; } createGain(){ return { connect(){}, gain:{} }; } };
window.SpeechSynthesisUtterance = function(){};
window.speechSynthesis = { cancel(){}, speak(){} };
window.MD = { render: (s) => s };
const files = ['data/course.js','data/audio.js','data/words.js','js/figures.js','js/vocab.js','js/app.js'];
for (const f of files) { try { window.eval(fs.readFileSync(base + '/' + f, 'utf8')); } catch(e){ console.log('EVAL ERR', f, e.message); } }

console.log('1. lesson cards:', document.querySelectorAll('.lesson-card').length);
let target = null;
document.querySelectorAll('.lesson-card').forEach(c => { if (c.textContent.includes('什么是程序')) target = c; });
console.log('2. found c0l1 card:', !!target);
try { target.click(); } catch(e){ console.log('CLICK ERR', e.message); }

const tgt = document.querySelector('#typ-target-2');
console.log('3. typing target text:', tgt ? JSON.stringify(tgt.textContent) : 'NOT FOUND');
const inp = document.querySelector('#typ-input-2');
console.log('4. typing input display:', inp ? JSON.stringify(inp.style.display) : 'N/A');
console.log('5. Q1 radios (choice kept):', document.querySelectorAll('input[name="ex0"]').length);
console.log('6. Q2 radios (choice kept):', document.querySelectorAll('input[name="ex1"]').length);
console.log('7. VOCAB bank has step?', window.VOCAB ? !!window.VOCAB.bank()['step'] : 'NO VOCAB');
console.log('TEST DONE');
