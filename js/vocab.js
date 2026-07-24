// 记忆曲线引擎（完整版 Leitner 卡片盒 SRS）
// 词库来源：COURSE_DATA 各课的 words 字段（en/zh）；新词 = 前面课没出现过的词。
// 卡片盒：box 1..5，答对升一盒、答错回盒1；每盒有复习间隔（天）。
// 持久化：localStorage['vocab_srs_v1'] = { 词(lower): {box, due, seen, right, wrong, wb} }
//   wb = 分模块的错词本：{ practice:{wrong,lastWrong}, dictate:{...}, course:{...} }
//   不同模块（练习/听写/课程）各有独立错词本，互不混淆。
window.VOCAB = (function () {
  var KEY = 'vocab_srs_v1';
  // 盒子复习间隔（天）：box1 当次即练，box2=1天…box5=7天
  var INTERVALS = { 1: 0, 2: 1, 3: 2, 4: 4, 5: 7 };
  function now() { return Date.now(); }
  function dayMs(d) { return d * 24 * 3600 * 1000; }
  // 旧数据迁移：早期版本只有全局 wrong 字段、没有分模块 wb（wb 为 undefined）。
  // 这类记录才把全局 wrong 当作 practice 错词迁移；新数据 rec.wb 始终存在（可能为空），绝不误迁移。
  function migrate(s) {
    var changed = false;
    Object.keys(s).forEach(function (k) {
      var rec = s[k];
      if (!rec || rec.wb !== undefined) return; // 仅处理真正的旧记录（无 wb 字段）
      rec.wb = {};
      if ((rec.wrong || 0) > 0) rec.wb.practice = { wrong: rec.wrong, lastWrong: rec.lastWrong || 0 };
      changed = true;
    });
    return changed;
  }
  function load() {
    var s;
    try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { s = {}; }
    if (migrate(s)) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  // 聚合课程词库：en(lower) -> {en, zh, enAudio, zhAudio, lessonId, lessonTitle, order}
  function bank() {
    var map = {}, ord = 0;
    var data = window.COURSE_DATA;
    if (!data || !data.chapters) return map;
    data.chapters.forEach(function (ch) {
      (ch.lessons || []).forEach(function (les) {
        (les.words || []).forEach(function (w) {
          var k = String(w.en).toLowerCase();
          if (!map[k]) {
            map[k] = {
              en: w.en, zh: w.zh,
              enAudio: w.enAudio || ('audio/words/' + k + '_en.mp3'),
              zhAudio: w.zhAudio || ('audio/words/' + k + '_zh.mp3'),
              lessonId: les.id, lessonTitle: les.title, order: ord++
            };
          }
        });
      });
    });
    return map;
  }

  // 本课新引入的词（en 小写数组）：按课程顺序扫描，只有第一次出现的才算本课新词
  function newWordsOf(lessonId) {
    var data = window.COURSE_DATA, seen = {}, res = [];
    if (!data || !data.chapters) return res;
    for (var i = 0; i < data.chapters.length; i++) {
      var lessons = data.chapters[i].lessons || [];
      for (var j = 0; j < lessons.length; j++) {
        var les = lessons[j];
        (les.words || []).forEach(function (w) {
          var k = String(w.en).toLowerCase();
          if (!seen[k]) { seen[k] = true; if (les.id === lessonId) res.push(k); }
        });
        if (les.id === lessonId) return res;
      }
    }
    return res;
  }

  // 注册（首次接触）：标 seen、进盒1、立即可练
  function register(words) {
    var s = load();
    (words || []).forEach(function (w) {
      var k = String(w).toLowerCase();
      if (!s[k]) s[k] = { box: 1, due: now(), seen: true, right: 0, wrong: 0, wb: {} };
      else s[k].seen = true;
    });
    save(s);
  }

  // 记一次作答：对→升盒，错→回盒1；重排下次到期时间。
  // source 标记来源模块：'practice'(练习/练字) | 'dictate'(听写) | 'course'(课程练习)，
  // 用于把错词分别归入对应模块的错词本，互不打扰。
  function answer(word, ok, source) {
    source = source || 'practice';
    var s = load();
    var k = String(word).toLowerCase();
    var rec = s[k] || { box: 1, due: now(), seen: true, right: 0, wrong: 0, wb: {} };
    if (!rec.wb) rec.wb = {};
    if (ok) {
      rec.box = Math.min(5, (rec.box || 1) + 1);
      rec.right = (rec.right || 0) + 1;
      rec.lastRight = now();
      if (!rec.wb[source]) rec.wb[source] = { wrong: 0, lastWrong: 0 };
      rec.wb[source].wrong = 0;        // 该模块这次答对 → 移出该模块错词本
    } else {
      rec.box = 1;
      rec.wrong = (rec.wrong || 0) + 1;
      rec.lastWrong = now();
      if (!rec.wb[source]) rec.wb[source] = { wrong: 0, lastWrong: 0 };
      rec.wb[source].wrong = (rec.wb[source].wrong || 0) + 1;
      rec.wb[source].lastWrong = now();
    }
    rec.seen = true;
    rec.due = now() + dayMs(INTERVALS[rec.box] || 0);
    s[k] = rec;
    save(s);
    return rec;
  }

  // 错词本（按来源模块隔离）：
  //   wrongWords('practice') → 只返回「练习/练字」敲错的词
  //   wrongWords('dictate')  → 只返回「听写」敲错的词
  //   wrongWords('course')   → 只返回「课程练习」敲错的词
  //   wrongWords()           → 不传来源时返回所有来源的并集（去重）
  // 直接复用同一套 Leitner 记忆盒，记忆机制与单词本/练字完全一致。
  function wrongWords(source) {
    var s = load(), b = bank(), arr = [], seen = {};
    Object.keys(s).forEach(function (k) {
      var rec = s[k];
      if (!rec || !rec.seen || !b[k]) return;
      var wb = rec.wb || {};
      var srcs = source ? [source] : Object.keys(wb);
      for (var i = 0; i < srcs.length; i++) {
        var e = wb[srcs[i]];
        if (e && e.wrong > 0 && !seen[k]) {
          seen[k] = true;
          arr.push({
            k: k, en: b[k].en, zh: b[k].zh,
            enAudio: b[k].enAudio, zhAudio: b[k].zhAudio,
            wrong: e.wrong || 0, box: rec.box || 1,
            due: rec.due || 0, lastWrong: e.lastWrong || 0, source: srcs[i]
          });
        }
      }
    });
    arr.sort(function (a, c) { return (c.lastWrong || 0) - (a.lastWrong || 0); });
    return arr;
  }
  // 用户主动把某个词移出某模块错词本（只清该模块 wrong 标记，不影响记忆盒等级）
  function forgetWrong(word, source) {
    var s = load();
    var k = String(word).toLowerCase();
    var rec = s[k];
    if (!rec || !rec.wb) return;
    if (source) { if (rec.wb[source]) rec.wb[source].wrong = 0; }
    else { Object.keys(rec.wb).forEach(function (sk) { rec.wb[sk].wrong = 0; }); }
    save(s);
  }
  // 清空某模块错词本（不传来源则清空全部）
  function clearWrongBook(source) {
    var s = load();
    Object.keys(s).forEach(function (k) {
      var rec = s[k];
      if (!rec || !rec.wb) return;
      if (source) { if (rec.wb[source]) rec.wb[source].wrong = 0; }
      else { Object.keys(rec.wb).forEach(function (sk) { rec.wb[sk].wrong = 0; }); }
    });
    save(s);
  }

  // 到期需复习的词（已 seen、due<=now、且在词库里）；excludeSet 排除本课新词；按最久到期优先
  function dueReviews(excludeSet, limit) {
    var s = load(), b = bank(), arr = [];
    Object.keys(s).forEach(function (k) {
      if (excludeSet && excludeSet.has && excludeSet.has(k)) return;
      if (!b[k]) return;
      if (s[k].seen && s[k].due <= now()) arr.push({ k: k, due: s[k].due, box: s[k].box });
    });
    arr.sort(function (a, c) { return a.due - c.due; });
    return arr.slice(0, limit || 3).map(function (x) { return x.k; });
  }

  // 单个词的 SRS 状态
  function state(word) { var s = load(); return s[String(word).toLowerCase()] || null; }

  // 掌握度徽章：未学=🆕，到期复习=🔁，box>=4=✅，其余=📖
  function badge(word) {
    var st = state(word);
    if (!st || !st.seen) return { icon: '🆕', label: '新词' };
    if (st.due <= now()) return { icon: '🔁', label: '该复习' };
    if (st.box >= 4) return { icon: '✅', label: '已掌握' };
    return { icon: '📖', label: '学习中' };
  }

  return {
    bank: bank, newWordsOf: newWordsOf, register: register,
    answer: answer, dueReviews: dueReviews, state: state, badge: badge, load: load,
    wrongWords: wrongWords, forgetWrong: forgetWrong, clearWrongBook: clearWrongBook
  };
})();
