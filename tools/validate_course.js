// 课程质量自动校验：真实加载 course.js + figures.js + figures_crawler.js，检查字段完整性与配图引用
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const sandbox = { window: {}, console, document: { createElement: () => ({}) } };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'data/course.js'), 'utf8'), sandbox, { filename: 'course.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'js/figures.js'), 'utf8'), sandbox, { filename: 'figures.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'js/figures_crawler.js'), 'utf8'), sandbox, { filename: 'figures_crawler.js' });

const data = sandbox.COURSE_DATA;
if (!data || !data.chapters) { console.log('❌ 未找到 COURSE_DATA'); process.exit(1); }

const FIG = sandbox.FIGURES || {};
let total = 0, exTotal = 0;
const problems = [];
const noExplain = [];
const figMissing = [];

for (const ch of data.chapters) {
  for (const les of ch.lessons) {
    total++;
    if (!les.title) problems.push(`[${les.id}] 缺标题`);
    if (!les.markdown || !les.markdown.trim()) problems.push(`[${les.id}] 讲义(markdown)为空`);
    if (!les.takeaway || !les.takeaway.trim()) problems.push(`[${les.id}] 缺 takeaway(语音学习成果)`);
    (les.figures || []).forEach(f => {
      if (!FIG[f.key]) figMissing.push(`[${les.id}] 配图 key 未定义: ${f.key}`);
    });
    (les.exercises || []).forEach((ex, i) => {
      exTotal++;
      const tag = `[${les.id}] 题${i + 1}(${ex.type})`;
      if (!ex.question || !ex.question.trim()) problems.push(`${tag} 题干为空`);
      if (ex.type === 'choice') {
        if (!Array.isArray(ex.options) || ex.options.length < 2) problems.push(`${tag} 选项不足`);
        if (typeof ex.answer !== 'number') problems.push(`${tag} 缺 answer`);
        if (!ex.explain) noExplain.push(`${tag} 缺 explain(讲解)`);
      } else if (ex.type === 'fill') {
        if (!ex.answer) problems.push(`${tag} 缺 answer`);
        if (!ex.explain) noExplain.push(`${tag} 缺 explain(讲解)`);
      } else if (ex.type === 'order') {
        if (!Array.isArray(ex.steps) || ex.steps.length < 2) problems.push(`${tag} steps 不足`);
        if (!ex.explain) noExplain.push(`${tag} 缺 explain(讲解)`);
      } else if (ex.type === 'typing') {
        if (!Array.isArray(ex.words) || ex.words.length < 1) problems.push(`${tag} 缺 words`);
      } else if (ex.type === 'open') {
        if (!ex.answer) problems.push(`${tag} 开放题缺参考答案 answer`);
      } else if (ex.type === 'tap') {
        if (!Array.isArray(ex.options) || ex.options.length < 2) problems.push(`${tag} 选项不足`);
        if (!Array.isArray(ex.answer)) problems.push(`${tag} 缺 answer(数组)`);
        if (!ex.explain) noExplain.push(`${tag} 缺 explain(讲解)`);
      } else if (ex.type === 'coding') {
        if (!ex.starter) problems.push(`${tag} 缺 starter(初始代码)`);
        if (!ex.expect) problems.push(`${tag} 缺 expect(期望输出子串)`);
      } else {
        problems.push(`${tag} 未知题型: ${ex.type}`);
      }
    });
    // 代码沙盒
    if (les.code && typeof les.code !== 'string') problems.push(`[${les.id}] code 非字符串`);
  }
}

console.log('=== 课程质量校验报告 ===');
console.log('章节数:', data.chapters.length);
console.log('总课时:', total);
console.log('题目总数:', exTotal);
console.log('配图生成器数量:', Object.keys(FIG).length);
console.log('');
console.log('❌ 严重问题(缺字段/未知题型):', problems.length);
problems.forEach(p => console.log('   - ' + p));
console.log('');
console.log('⚠️ 建议补全 explain 的题:', noExplain.length);
noExplain.forEach(p => console.log('   - ' + p));
console.log('');
console.log('🔍 配图 key 缺失:', figMissing.length);
figMissing.forEach(p => console.log('   - ' + p));
console.log('');
console.log(problems.length === 0 && figMissing.length === 0 ? '✅ 核心字段全部通过' : '⛔ 存在需修复项');
