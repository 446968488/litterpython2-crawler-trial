// 校验 code_practice.js 里每道题的 answer 在真实 Python 下运行能命中 expect。
// 同时做数据完整性检查：fill 题 starter 必含 ____、answer 不得含 ____；coding 题必含 answer+expect。
// 用法: node tools/verify_practice.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const file = path.join(__dirname, '..', 'data', 'code_practice.js');
let src = fs.readFileSync(file, 'utf8');
src = src.replace('window.CODE_PRACTICE', 'globalThis.CODE_PRACTICE');
const sandbox = { globalThis: {} };
const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(src + '\nglobalThis.__cp = globalThis.CODE_PRACTICE;', sandbox);
const CP = sandbox.globalThis.__cp;

const PY = '/usr/bin/python3';
let fail = 0, total = 0;
const KINDS = ['projects', 'advanced', 'hard'];
for (const kind of KINDS) {
  if (!CP[kind]) { console.log(`⚠️ 档位 ${kind} 不存在，跳过`); continue; }
  for (const p of CP[kind]) {
    total++;
    // —— 完整性检查 ——
    const missing = ['id', 'title', 'question', 'expect', 'answer'].filter((k) => !p[k]);
    if (missing.length) {
      console.log(`❌ [${p.id || '?'}] ${p.title || ''} 缺字段: ${missing.join(',')}`);
      fail++;
      continue;
    }
    const isFill = !!p.fill;
    if (isFill) {
      if (!String(p.starter).includes('____')) {
        console.log(`❌ [${p.id}] ${p.title} 是填空却 starter 无 ____`); fail++; continue;
      }
      if (String(p.answer).includes('____')) {
        console.log(`❌ [${p.id}] ${p.title} answer 还残留 ____（填空没补全）`); fail++; continue;
      }
    } else {
      if (!p.starter) {
        console.log(`❌ [${p.id}] ${p.title} coding 题缺 starter`); fail++; continue;
      }
    }
    // —— 运行 answer 校验 expect ——
    let out = '';
    try {
      out = execFileSync(PY, ['-c', p.answer], { encoding: 'utf8' });
    } catch (e) {
      console.log(`❌ [${p.id}] ${p.title} 运行报错:\n${e.stderr || e.message}`);
      fail++;
      continue;
    }
    if (out.includes(p.expect)) {
      console.log(`✅ [${p.id}] ${p.title}${isFill ? ' (填空)' : ' (写代码)'}`);
    } else {
      console.log(`❌ [${p.id}] ${p.title} 期望包含「${p.expect}」实际输出「${out.trim()}」`);
      fail++;
    }
  }
}
console.log(`\n总计 ${total} 题，失败 ${fail} 题。`);
process.exit(fail ? 1 : 0);
