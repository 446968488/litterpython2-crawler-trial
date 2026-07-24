// 网课工具主逻辑：卡片式首页 / 闯关解锁 / 视频 / 讲义 / 练习判分 / 进度
(function () {
  const data = window.COURSE_DATA;
  // 把单词本词库（VOCAB_WORDS）合并进各课 words：单词本与打字题共用
  (function mergeVocabWords() {
    if (!window.VOCAB_WORDS || !data || !data.chapters) return;
    data.chapters.forEach(function (ch) {
      (ch.lessons || []).forEach(function (les) {
        if (window.VOCAB_WORDS[les.id]) les.words = window.VOCAB_WORDS[les.id];
      });
    });
  })();
  const STORE_KEY = 'course_progress_v1';
  const PIN_KEY = 'course_parent_pin';
  const DEFAULT_PIN = '1234';
  let progress = loadProgress();
  let currentLesson = null;
  let lessonStartTime = null; // 进入课时的时间戳，用于累计学习时长
  // 卡片封面色板（自动分配给没有自定义 color 的课时）
  const PALETTE = ['#ff9a3c', '#2f8fe0', '#5bc0a8', '#ff6b8b', '#9b6bff', '#ffcf3c', '#3cc6ff', '#7ed957'];

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveProgress() { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); }
  function loadParentPin() { return localStorage.getItem(PIN_KEY) || DEFAULT_PIN; }
  function saveParentPin(p) { localStorage.setItem(PIN_KEY, p); }

  // 向导小光：带领学习的固定角色，按钮"讲一讲"永远是小光在讲，不与孩子昵称混淆
  const GUIDE_NAME = '小光';
  // 孩子昵称：家长设置，存 localStorage，全站互动（练习反馈/首页欢迎/完成祝贺）复用；默认"宝贝"
  const NICK_KEY = 'course_child_name';
  const DEFAULT_NICK = '宝贝';
  const RESERVED_NICKS = ['小光', '小光老师', '向导']; // 昵称不能和向导小光重复

  // ===== 模块图标：自定义线性 SVG（stroke=currentColor，跟随模块主题色）=====
  const ICON = {
    'parent': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><path d="M3.5 20c0-3 2-5 4.5-5s4.5 2 4.5 5"/><circle cx="17" cy="9.5" r="2"/><path d="M14.5 20c0-2.4 1.3-4 3-4s3 1.6 3 4"/></svg>',
    'student': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5L12 4l9 4.5L12 13z"/><path d="M7 10.5V15c0 1.4 2.2 2.6 5 2.6s5-1.2 5-2.6v-4.5"/><path d="M21 8.5V14"/></svg>',
    'parent-zone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9l-2.1 2.1M6.9 17l-2.1 2.1"/></svg>',
    'student-zone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="11" height="11" rx="2.5"/><rect x="10" y="10" width="11" height="11" rx="2.5"/></svg>',
    'wordbank': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C9.5 4.8 6 4.8 4 6.2v11.6c2-1.4 5.5-1.4 8 0 2.5-1.4 6-1.4 8 0V6.2c-2-1.4-5.5-1.4-8 0z"/><path d="M12 6.5v11.3"/></svg>',
    'practice': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6.5" width="19" height="11" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7.5 14h9"/></svg>',
    'dictate': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5a6 6 0 1 1 12 0c0 2.6-1.5 3.9-2.6 5.3-.9 1.2-1.4 2.2-1.4 4.2a3 3 0 0 1-6 0c0-1.7.9-2.7 1.4-3.8"/></svg>',
    'grad': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v3.5a4 4 0 0 1-8 0z"/><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3"/><path d="M12 11.5V15M9.5 20h5M10.5 15.5h3l-1 4.5h-1z"/></svg>',
    'codepro': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/></svg>',
    'codeadv': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c3 1.6 5 5 5 9l-2.6 2.6H9.6L7 12c0-4 2-7.4 5-9z"/><circle cx="12" cy="9" r="1.7"/><path d="M9 17.5L7.5 20.5M15 17.5l1.5 3"/></svg>',
    'nick': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2"/></svg>',
    'style': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4M8 6.5v11M12 4v16M16 6.5v11M20 10v4"/></svg>',
    'unlock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 7.7-1.6"/></svg>',
    'report': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V4.5M4 20h16"/><path d="M7.5 17v-5h3v5zM12.5 13v-7h3v7zM17.5 10V4h3v12z"/></svg>',
    'pwd': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="4"/><path d="M11 11l8 8M16.5 16.5l1.8-1.8M19.5 19.5l1.8-1.8"/></svg>',
    'backup': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 18a4 4 0 0 1-.5-8 5 5 0 0 1 9.6-1.4A3.4 3.4 0 0 1 16.8 18z"/><path d="M12 11.5V17M9.8 14.2L12 17l2.2-2.8"/></svg>',
    'family': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><path d="M3.5 20c0-3 2-5 4.5-5s4.5 2 4.5 5"/><circle cx="17" cy="9.5" r="2"/><path d="M14.5 20c0-2.4 1.3-4 3-4s3 1.6 3 4"/></svg>',
    'export': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15.5V4M9.5 7L12 4l2.5 3"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
    'import': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11.5M9.5 13L12 16l2.5-3"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>'
  };
  // 激活开关：true=跳过激活门禁直接进首页（仅开发预览用）；正式发版务必改回 false
  // 方案B·离线一机一码（零服务器、不远程吊销）：激活码 = base64(机器码|过期时间戳|RSA-SHA256签名hex)，
  //   前端用内嵌公钥验签——无私钥造不出合法码、一机一码防转借；全程离线，无需联网/后端。
  //   作者发码：node ../license-author/author_gen.js <机器码>  （私钥仅在 license-author/ 内，不随包发出）。
  //   局限：不能远程精准吊销单设备（换公钥重发仅对打开新版者生效，已激活旧版仍可用）；如要远程吊销请回方案A。
  const SKIP_ACTIVATION = true;
  // 归一化 emoji（去掉变体选择符 U+FE0F），用于匹配课程封面 SVG 图标
  function normEmoji(e) { return (e || '').replace(/[️]/g, ''); } // 去掉 U+FE0F 变体选择符
  function coverIcon(icon) {
    const map = window.COVER_ICON || {};
    const key = normEmoji(icon);
    return map[key] || icon; // 找不到对应 SVG 时回退为原 emoji
  }
  function loadNick() { const v = localStorage.getItem(NICK_KEY); return (v && !RESERVED_NICKS.includes(v)) ? v : DEFAULT_NICK; }
  function saveNick(n) { localStorage.setItem(NICK_KEY, (n || '').trim() || DEFAULT_NICK); }
  function childName() { return loadNick(); }

  // ===== 语音风格：家长页可选，全部非视频语音统一成「同一真人音色(晓晓) + 同一风格话术」=====
  const STYLE_KEY = 'course_voice_style';
  const STYLES = [
    { id: 'gentle', label: '亲切低龄' },
    { id: 'humor', label: '幽默话唠' },
    { id: 'humor2', label: '幽默·梗王' },
    { id: 'strict', label: '严厉毒舌' },
    { id: 'strict2', label: '严厉·暴击' },
  ];
  function loadStyle() { const v = localStorage.getItem(STYLE_KEY); return STYLES.some((s) => s.id === v) ? v : 'gentle'; }
  function saveStyle(v) { if (STYLES.some((s) => s.id === v)) localStorage.setItem(STYLE_KEY, v); }
  // 资源版本号：与 tools/gen_audio.py 的 BUILD 保持一致；改语音后同步改这里，浏览器自动拉最新，免硬刷新
  const ASSET_V = '20260725o';
  // 风格化语音文件解析：优先 audio/<base>_<style>.mp3，回退 audio/<base>.mp3（如 narrate_gentle→narrate）
  function vfile(base) { const st = loadStyle(); return 'audio/' + base + '_' + st + '.mp3?v=' + ASSET_V; }

  // ===== 评价模块话术：按「结果状态 × 风格」出自然真人话术（消人机感）=====
  // 状态：notDone=没做完 / partial=做完但部分错 / allCorrect=全做对
  // 每条多给几个说法，随机抽，避免每次一模一样（机器人味来源之一）
  const EVAL = {
    gentle: {
      submitHint: '全部做完啦！确认好就提交吧～',
      notDone: ['还有几道题没做呢，不着急，咱们慢慢来～', '这一节还没做完哦，先把剩下的题填了吧。'],
      partial: ['整节都做完啦！有几题没对，没关系，改改就好。', '全部做完了，小部分没对，再来一次肯定行～'],
      allCorrect: ['哇，整节都做完了，而且还全对！你真棒～', '这一节全做完了，一题都没错，太厉害啦！'],
      right: ['答对啦！', '对咯，就是这样～', '漂亮，做对啦！'],
    },
    humor: {
      submitHint: '活儿干完啦！点提交，听我夸你～',
      notDone: ['哎哟，还有题在等你呢，别让它们孤单～', '活儿还没干完就想跑？先把剩下的题收拾了。'],
      partial: ['整节都交啦！不过有几题偷偷错了，抓出来改改～', '做是做完了，就是有几位「捣蛋鬼」没对，去治治它们。'],
      allCorrect: ['好家伙，全做完了还全对，今天运气不错啊！', '一节全清零失误，这波操作我给满分～'],
      right: ['对啦！这题被你拿下了～', '嘿，答对了！', '可以可以，这题你会了！'],
    },
    strict: {
      submitHint: '做完了就提交，别磨蹭。',
      notDone: ['题都没做完，交什么交？把剩下的补上。', '还有空着的题，先填完再来。'],
      partial: ['做是做完了，但有几题错了，拿去改。', '全节都做了，错的那几题，重做。'],
      allCorrect: ['全做完了，还全对，这回没给我丢脸。', '一节全对，算你过关。'],
      right: ['这题对了。', '嗯，没错。', '过关。'],
    },
    humor2: {
      submitHint: '活儿干完啦！点提交，听我夸你～',
      notDone: ['哎哟，还有题在等你呢，别让它们孤单～', '活儿还没干完就想跑？先把剩下的题收拾了。'],
      partial: ['整节都交啦！不过有几题偷偷错了，抓出来改改～', '做是做完了，就是有几位「捣蛋鬼」没对，去治治它们。'],
      allCorrect: ['好家伙，全做完了还全对，今天运气不错啊！', '一节全清零失误，这波操作我给满分～'],
      right: ['对啦！这题被你拿下了～', '嘿，答对了！', '可以可以，这题你会了！'],
    },
    strict2: {
      submitHint: '做完了就提交，别磨蹭。',
      notDone: ['题都没做完，交什么交？把剩下的补上。', '还有空着的题，先填完再来。'],
      partial: ['做是做完了，但有几题错了，拿去改。', '全节都做了，错的那几题，重做。'],
      allCorrect: ['全做完了，还全对，这回没给我丢脸。', '一节全对，算你过关。'],
      right: ['这题对了。', '嗯，没错。', '过关。'],
    },
  };
  // 取某风格某状态（或 submitHint/right）下的一条随机话术
  function pickEval(kind, style) {
    const set = ((EVAL[style] || EVAL.gentle)[kind]) || (EVAL.gentle[kind] || ['']);
    if (typeof set === 'string') return set; // submitHint 等单句字段直接返回，不要按字符索引
    return set[(Math.random() * set.length) | 0];
  }
  // 授勋提示：按家长所选风格出话（亲切/幽默/毒舌）
  function pickAwardMsg(award) {
    if (!award) return '';
    const st = loadStyle();
    const name = award.badge + award.title;
    if (st === 'humor' || st === 'humor2') return '🏅 好家伙，' + name + ' 勋章到手！这下你是有身份（和勋章）的人了，下一段戴着它出发～';
    if (st === 'strict' || st === 'strict2') return '🏅 行了，赏你 ' + name + ' 勋章，别骄傲，下一段戴着它继续走。';
    return '🏅 恭喜你，宝贝！你获得了「' + name + '」称号，真棒！下一段戴着它出发～';
  }
  // 算出本课当前评价状态（没做完/部分错/全对）
  // 注意：skipped 的题不算 done，必须补做对才算；有"跳过未补做"则不发勋章
  function evalStateOf(les) {
    const pr = progress[les.id] || {};
    const exs = les.exercises || [];
    const exDone = pr.exDone || {};
    const exSkipped = pr.exSkipped || {};
    const total = exs.length;
    let doneCount = 0;
    let wrong = 0;
    let pending = 0;
    exs.forEach((ex, i) => {
      if (exSkipped[i]) return; // 跳过的不算 pending/done
      if (exDone[i]) {
        doneCount++;
        if (pr.firstAttempts && pr.firstAttempts[i] === 'wrong') wrong++;
      } else {
        pending++;
      }
    });
    const skippedCount = Object.keys(exSkipped).length;
    if (pending > 0) return 'notDone';        // 还有题既没做也没跳过 → 不能提交
    if (skippedCount > 0) return 'partial';    // 有跳过未补做 → 可提交但不给勋章
    return wrong > 0 ? 'partial' : 'allCorrect';
  }

  // ===== 刷新不丢进度：同一标签页内记忆「当前课 / 滚动位置 / 已填答案」 =====
  // 用 sessionStorage（刷新保留、关标签页自动清除），不影响跨会话的 localStorage 进度。
  const SESSION_KEY = 'course_session_v1';
  function loadSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {}; } catch (e) { return {}; } }
  function writeSession(s) { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {} }
  function persistOpen(id) { const s = loadSession(); s.openId = id || null; writeSession(s); }
  // 实时抓取练习区已填内容，按 课号->题号 存草稿（choice 选中 / fill·open 文本 / order 排列）
  function captureExDraft() {
    const les = currentLesson; if (!les || !les.exercises) return;
    const s = loadSession(); if (!s.openId) return;
    s.drafts = s.drafts || {};
    const ds = s.drafts[s.openId] = s.drafts[s.openId] || {};
    const wrap = document.getElementById('ex-list'); if (!wrap) return;
    les.exercises.forEach(function (ex, idx) {
      const box = wrap.querySelector('.ex[data-idx="' + idx + '"]'); if (!box) return;
      if (ex.type === 'choice') {
        const sel = box.querySelector('input[name="ex' + idx + '"]:checked');
        if (sel) ds[idx] = { type: 'choice', val: sel.value }; else delete ds[idx];
      } else if (ex.type === 'fill' || ex.type === 'open') {
        const el = box.querySelector(ex.type === 'fill' ? '.ex-input' : '.ex-textarea');
        if (el && el.value) ds[idx] = { type: ex.type, val: el.value }; else delete ds[idx];
      } else if (ex.type === 'order') {
        const doneEl = box.querySelector('.order-done');
        const items = Array.from(doneEl.querySelectorAll('.order-item')).map(function (b) { return b.textContent; });
        if (items.length) ds[idx] = { type: 'order', order: items }; else delete ds[idx];
      } else if (ex.type === 'coding') {
        const el = box.querySelector('.ex-code-input');
        if (el && el.value) ds[idx] = { type: 'coding', val: el.value }; else delete ds[idx];
      } else if (ex.type === 'tap') {
        const optsEl = box.querySelector('.tap-opts');
        if (optsEl) {
          const sel = Array.from(optsEl.querySelectorAll('.tap-card.selected')).map((b) => +b.dataset.val).sort((a, b) => a - b);
          if (sel.length) ds[idx] = { type: 'tap', val: sel }; else delete ds[idx];
        }
      }
    });
    writeSession(s);
  }
  // 重新进入课时，把草稿填回对应控件（仅恢复已填内容，不伪造对错，孩子可重新提交）
  function restoreExDrafts(wrap, les) {
    const s = loadSession();
    if (!s.openId || !s.drafts || !s.drafts[s.openId]) return;
    const ds = s.drafts[s.openId];
    les.exercises.forEach(function (ex, idx) {
      const d = ds[idx]; if (!d) return;
      const box = wrap.querySelector('.ex[data-idx="' + idx + '"]'); if (!box) return;
      if (d.type === 'choice') {
        const r = box.querySelector('input[name="ex' + idx + '"][value="' + d.val + '"]');
        if (r) r.checked = true;
      } else if (d.type === 'fill' || d.type === 'open') {
        const el = box.querySelector(d.type === 'fill' ? '.ex-input' : '.ex-textarea');
        if (el) el.value = d.val;
      } else if (d.type === 'order') {
        const pool = box.querySelector('.order-pool');
        const doneEl = box.querySelector('.order-done');
        const ph = doneEl.querySelector('.order-placeholder');
        if (ph) ph.style.display = 'none';
        (d.order || []).forEach(function (txt) {
          const btn = Array.from(pool.querySelectorAll('.order-item')).find(function (b) { return b.textContent === txt; });
          if (btn) doneEl.appendChild(btn);
        });
      } else if (d.type === 'coding') {
        const el = box.querySelector('.ex-code-input');
        if (el) el.value = d.val;
      } else if (d.type === 'tap') {
        const optsEl = box.querySelector('.tap-opts');
        if (optsEl) {
          (d.val || []).forEach((vi) => {
            const card = optsEl.querySelector('.tap-card[data-val="' + vi + '"]');
            if (card) card.classList.add('selected');
          });
        }
      }
    });
  }
  // 按课程分别记住滚动位置：切换课程时不会沿用上一课的滚动（定位首页）；刷新同课才恢复
  function restoreScroll() {
    const s = loadSession(); const lv = document.getElementById('lesson-view');
    const id = currentLesson && currentLesson.id;
    const y = id && s.scroll && s.scroll[id];
    if (y && lv) { lv.scrollTop = y; setTimeout(function () { lv.scrollTop = s.scroll[id]; }, 250); }
  }

  // 鼓励词分级：按已完成课数（<6/6-15/16-30/31+）变更语气
  const ENCOURAGE = [
    ['真棒！', '好厉害！', '太聪明了！'],
    ['越来越厉害了！', '学得真快！', '进步神速！'],
    ['你已经是小程序员了！', '高手！'],
    ['坚持了这么久，你太了不起了！', '未来可期！']
  ];
  function getLevel(done) {
    if (done >= 31) return 3;
    if (done >= 16) return 2;
    if (done >= 6) return 1;
    return 0;
  }
  function encourage(done) {
    var words = ENCOURAGE[getLevel(done)];
    return words[Math.floor(Math.random() * words.length)];
  }
  function getDoneCount() {
    return flatLessons().filter(function(l) { return progress[l.id] && progress[l.id].done; }).length;
  }
  function $(s) { return document.querySelector(s); }
  function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ===== 评价模块：学习时长累计 + 首答记录 =====
  function fmtTime(sec) {
    sec = sec || 0;
    if (sec < 60) return sec + ' 秒';
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ' 分' + (s ? s + ' 秒' : '');
  }
  function ensureLessonRecord(id) {
    if (!progress[id]) progress[id] = {};
    if (typeof progress[id].studyTime !== 'number') progress[id].studyTime = 0;
    if (!progress[id].firstAttempts) progress[id].firstAttempts = {};
  }
  // ===== 勋章 / 称号系统 =====
  // 每段总结课(grad 为毕业)完成即授予一枚勋章，存 localStorage，可重复进入不重复发。
  const BADGE_KEY = 'course_badges';
  function loadBadges() {
    try { return JSON.parse(localStorage.getItem(BADGE_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveBadges(b) { localStorage.setItem(BADGE_KEY, JSON.stringify(b)); }
  function awardIfNeeded(les) {
    if (!les || !les.award) return;
    // 只有全部做对（含补做）才授予勋章
    if (evalStateOf(les) !== 'allCorrect') return;
    const b = loadBadges();
    if (b.some(function (x) { return x.p === les.award.p; })) return; // 已得，不重复授予
    b.push({ p: les.award.p, title: les.award.title, badge: les.award.badge, desc: les.award.desc || '', ts: Date.now() });
    saveBadges(b);
  }
  // 当前“佩戴中”的勋章 = 已得勋章里进度最高的一枚（在后续进度里一直佩戴）
  function wornBadge() {
    const b = loadBadges();
    if (!b.length) return null;
    b.sort(function (a, x) { return a.p - x.p; });
    return b[b.length - 1];
  }
  // 离开课时时累计学习时长（秒）
  function accumulateStudyTime() {
    if (currentLesson && lessonStartTime) {
      ensureLessonRecord(currentLesson.id);
      const sec = Math.round((Date.now() - lessonStartTime) / 1000);
      if (sec > 0) { const r = progress[currentLesson.id]; r.studyTime += sec; r.lastStudy = Date.now(); saveProgress(); }
      lessonStartTime = null;
    }
  }
  // 记录每题首次提交结果（只记第一次，重做不覆盖）
  function recordFirstAttempt(idx, result) {
    if (!currentLesson) return;
    ensureLessonRecord(currentLesson.id);
    const fa = progress[currentLesson.id].firstAttempts;
    if (fa[idx] === undefined) {
      fa[idx] = result; // 'correct' | 'wrong' | 'viewed'
      saveProgress();
    }
  }

  // ===== 撒花庆祝特效（纯 canvas，无依赖，离线可用）=====
  function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    const colors = ['#ff6b8b', '#ffcf3c', '#5bc0a8', '#2f8fe0', '#9b6bff', '#ff9a3c'];
    const N = 150;
    const parts = [];
    for (let i = 0; i < N; i++) {
      parts.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.6,
        r: 5 + Math.random() * 8,
        c: colors[(Math.random() * colors.length) | 0],
        vy: 2 + Math.random() * 3.5,
        vx: -1.5 + Math.random() * 3,
        rot: Math.random() * Math.PI,
        vr: -0.2 + Math.random() * 0.4,
        shape: Math.random() < 0.5 ? 'rect' : 'circle'
      });
    }
    const start = performance.now();
    const DURATION = 2600;
    function frame(now) {
      const t = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        if (p.shape === 'rect') ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      });
      if (t < DURATION) requestAnimationFrame(frame);
      else canvas.remove();
    }
    requestAnimationFrame(frame);
  }

  // ===== 语音朗读（浏览器自带 SpeechSynthesis，中文，离线可用）=====
  function stripMarkdown(md) {
    return String(md || '')
      .replace(/```[\s\S]*?```/g, '')          // 代码块
      .replace(/`([^`]*)`/g, '$1')              // 行内代码
      .replace(/^#{1,6}\s+/gm, '')              // 标题 #
      .replace(/^\s*>\s?/gm, '')                // 引用 >
      .replace(/^\s*[-*+]\s+/gm, '，')          // 列表项
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // 链接
      .replace(/[*`_]/g, '')                    // 强调符号
      .replace(/[\p{Emoji_Presentation}]/gu, '') // 图标/emoji不读
      .replace(/\n{2,}/g, '\n')
      .trim();
  }
  function pickZhVoice() {
    if (!('speechSynthesis' in window)) return null;
    const vs = speechSynthesis.getVoices() || [];
    return vs.find((v) => /^zh/i.test(v.lang) && /male/i.test(v.name)) ||
           vs.find((v) => /^zh/i.test(v.lang)) ||
           vs.find((v) => /chinese|中文|普通话/i.test(v.name)) || null;
  }
  // 语音引擎可能延迟加载：提前拉一次并在 voiceschanged 时刷新缓存
  if ('speechSynthesis' in window) {
    try { speechSynthesis.getVoices(); } catch (e) {}
    speechSynthesis.onvoiceschanged = () => { try { speechSynthesis.getVoices(); } catch (e) {} };
  }
  // 把长文本切成朗读小块（按句/标点），避免 Chrome 长 utterance 截断不出声
  function chunkText(txt, maxLen) {
    maxLen = maxLen || 160;
    const segs = txt.split(/(?<=[。！？!?；;\n])/).map((s) => s.trim()).filter(Boolean);
    const out = [];
    let buf = '';
    for (const s of segs) {
      if (buf.length + s.length > maxLen && buf) { out.push(buf); buf = ''; }
      // 单句过长（如代码段被保留）再按长度硬切
      if (s.length > maxLen) {
        for (let k = 0; k < s.length; k += maxLen) out.push(s.slice(k, k + maxLen));
      } else {
        buf += (buf ? ' ' : '') + s;
      }
    }
    if (buf) out.push(buf);
    return out.length ? out : [txt];
  }
  function clearSpeaking() {
    document.querySelectorAll('.speak-btn.speaking').forEach((b) => b.classList.remove('speaking'));
  }
  // ===== 统一语音控制器：所有真人语音（讲义/小结/题目/单词/讲解/反馈）走同一管理器 =====
  // 特性：① 同一语音再次点击 = 暂停，再点 = 继续；② 任意新语音自动停掉旧的（互斥）；
  //       ③ 发声时通知背景乐闪避（window.__musicDuck(true/false)）。
  let _vEl = null, _vKey = null, _vPaused = false, _vList = null, _vIdx = 0, _vBtn = null, _vSeq = true, _ttsBtn = null;
  function _voiceDuck(on) {
    if (typeof window.__musicDuck === 'function') window.__musicDuck(on);
  }
  function _voiceEnd() {
    if (_vBtn) _vBtn.classList.remove('speaking');
    _vEl = null; _vKey = null; _vPaused = false; _vList = null; _vIdx = 0; _vBtn = null; _vSeq = true;
    _voiceDuck(false);
  }
  function _voiceStopAll() {
    if (_vEl) { try { _vEl.pause(); } catch (e) {} _vEl = null; }
    if (_wEl) { try { _wEl.pause(); } catch (e) {} _wEl = null; }
    if (_ttsBtn) { try { _ttsBtn.classList.remove('speaking'); } catch (e) {} _ttsBtn = null; }
    if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
    clearSpeaking();
    _vKey = null; _vPaused = false; _vList = null; _vIdx = 0; _vBtn = null; _vSeq = true;
    _wKey = null; _wPaused = false;
  }
  function _voiceNext() {
    if (!_vList || _vIdx >= _vList.length) { _voiceEnd(); return; }
    const raw = _vList[_vIdx];
    const obj = (raw && raw.src) ? raw : { src: raw };
    const a = new Audio(obj.src);
    _vEl = a;
    a.onended = () => { if (_vSeq) { _vIdx++; _voiceNext(); } else { _voiceEnd(); } };
    a.onerror = () => { _vIdx++; _voiceNext(); };
    const p = a.play();
    if (p && p.catch) p.catch(() => { _vIdx++; _voiceNext(); });
  }
  // key 相同的语音：再点 = 暂停/继续；不同 key 的新语音会先停掉旧的
  function _startVoice(key, list, btn, seq) {
    list = (typeof list === 'string') ? [list] : (list || []);
    if (key && key === _vKey && _vEl) {
      if (_vPaused) { const p = _vEl.play(); if (p && p.catch) p.catch(() => {}); _vPaused = false; _voiceDuck(true); }
      else { _vEl.pause(); _vPaused = true; _voiceDuck(false); }
      return;
    }
    _voiceStopAll();
    _vKey = key; _vPaused = false; _vList = list; _vIdx = 0; _vBtn = btn || null; _vSeq = seq;
    if (_vBtn) _vBtn.classList.add('speaking');
    _voiceDuck(true);
    _voiceNext();
  }
  function voicePlaySeq(key, list, btn) { _startVoice(key, list, btn, true); }
  function voicePlayOnce(key, list, btn) { _startVoice(key, list, btn, false); }
  // 兼容旧调用：顺序播放数组（encQ 等）
  function startQueue(arr, btn, key) { voicePlaySeq(key || 'queue', arr, btn); }
  // 评价话术选音（按家长风格拼后缀）；保持返回单个 {src}，供顺序列表使用
  function learnSeg(s) {
    if (!s) return s;
    const pick = Array.isArray(s) ? s[Math.floor(Math.random() * s.length)] : s;
    if (pick && pick.src) {
      const st = loadStyle();
      const suf = st === 'gentle' ? '' : '_' + st;
      return Object.assign({}, pick, { src: pick.src.replace(/\.mp3$/, suf + '.mp3') });
    }
    if (typeof pick === 'string') return { src: pick };  // 纯路径字符串也包成 {src}
    return pick;
  }
  // 小结/评价：返回 [风格版, base版]，风格文件缺失时自动回退（只播第一个成功的）
  function learnSegAlt(s) {
    if (!s) return [];
    const base = (s && s.src) ? s.src : (typeof s === 'string' ? s : null);
    const styled = learnSeg(s);
    const styledSrc = styled && styled.src ? styled.src : null;
    if (!styledSrc) return [];
    if (styledSrc === base) return [styledSrc];
    return [styledSrc, base];
  }
  function stopVoiceAudio() { _voiceStopAll(); }
  function pauseAllAudio() {
    _voiceStopAll();
    document.querySelectorAll('video').forEach((v) => { try { if (!v.paused) v.pause(); } catch (e) {} });
  }
  // 播放风格化真人语音（反馈等）：风格版缺失自动回退 base 版
  function startVoice(src, btn, fallback) {
    if (!src) return;
    const list = (fallback && fallback !== src) ? [src, fallback] : [src];
    voicePlayOnce('fx', list, btn);
  }
  function stopSpeak() { _voiceStopAll(); }
  // 浏览器 TTS 兜底（仅在预生成音频缺失时使用）；同样支持再点暂停
  function speak(text, btn) {
    if (!('speechSynthesis' in window)) {
      toast('当前浏览器不支持语音朗读，请用 Chrome / Edge 打开，或用「听讲解/听读音」按钮（真人声）');
      return;
    }
    const txt = String(text || '').trim();
    if (!txt) return;
    if (btn && btn.classList.contains('speaking')) { _voiceStopAll(); return; }
    _voiceStopAll();
    if (btn) { btn.classList.add('speaking'); _ttsBtn = btn; }
    _voiceDuck(true);
    // 长文本按句切块：规避 Chrome 对长 utterance 截断/不出声的 bug
    const chunks = chunkText(txt);
    let i = 0;
    function speakNext() {
      if (i >= chunks.length) {
        if (btn) btn.classList.remove('speaking');
        _ttsBtn = null;
        _voiceDuck(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(chunks[i]);
      u.lang = 'zh-CN';
      const v = pickZhVoice();
      if (v) u.voice = v;
      u.rate = 0.95; u.pitch = 1.0;
      u.onend = () => { i++; setTimeout(speakNext, 120); };
      u.onerror = () => { i++; speakNext(); };
      // 延迟一拍再 speak，规避 cancel()->speak() 同 tick 被吞掉的竞态
      speechSynthesis.speak(u);
    }
    setTimeout(speakNext, 60);
  }

  // 单词发音/讲解：优先预生成云希男生 mp3（统一真人男声），缺失则男声 TTS 兜底。再次点击 = 暂停/继续
  let _wEl = null, _wKey = null, _wPaused = false;
  function playWordAudio(en, kind, btn) {
    if (!en) return;
    const key = 'word:' + String(en).toUpperCase() + '|' + (kind || 'en');
    if (key === _wKey && _wEl) {
      if (_wPaused) { const p = _wEl.play(); if (p && p.catch) p.catch(() => {}); _wPaused = false; _voiceDuck(true); }
      else { _wEl.pause(); _wPaused = true; _voiceDuck(false); }
      return;
    }
    if (_wEl) { try { _wEl.pause(); } catch (e) {} _wEl = null; }
    _wPaused = false;
    _voiceStopAll();
    _wKey = key;
    const file = 'audio/words/' + String(en).toLowerCase() + '_' + (kind || 'en') + '.mp3?v=' + ASSET_V;
    const fallback = () => { if ((kind || 'en') === 'en') speakEnTop(en); else speak(en, null); };
    const a = new Audio(file);
    _wEl = a;
    _voiceDuck(true);
    a.onended = () => { _wEl = null; _wKey = null; _voiceDuck(false); };
    a.onerror = () => { _wEl = null; _wKey = null; _voiceDuck(false); fallback(); };
    const p = a.play();
    if (p && p.catch) p.catch(() => { _wEl = null; _wKey = null; _voiceDuck(false); fallback(); });
  }
  // 英文单词朗读：优先男声
  function speakEnTop(text) {
    if (!('speechSynthesis' in window) || !text) return;
    stopSpeak();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'en-US';
    const vs = speechSynthesis.getVoices() || [];
    const v = vs.find((x) => /male/i.test(x.name) && /^en(-|_)/i.test(x.lang)) ||
              vs.find((x) => /^en(-|_)/i.test(x.lang)) || null;
    if (v) u.voice = v;
    u.rate = 0.92; u.pitch = 0.9;
    speechSynthesis.speak(u);
  }

  // ===== 音效引擎（WebAudio 合成，无需任何音频文件，纯离线可用）=====
  let _audioCtx = null;
  function audioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { _audioCtx = null; }
    }
    if (_audioCtx && _audioCtx.state === 'suspended') { try { _audioCtx.resume(); } catch (e) {} }
    return _audioCtx;
  }
  function _beep(freq, dur, type, gain) {
    const ctx = audioCtx();
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      const peak = gain || 0.06;
      g.gain.value = peak;
      o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime;
      o.start(t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
      o.stop(t + (dur || 0.12) + 0.02);
    } catch (e) {}
  }
  function playClick() { _beep(880, 0.05, 'square', 0.04); }
  function playCorrect() { _beep(660, 0.10, 'sine', 0.06); setTimeout(() => _beep(990, 0.12, 'sine', 0.06), 90); }
  function playWrong() { _beep(220, 0.16, 'sawtooth', 0.06); setTimeout(() => _beep(160, 0.22, 'sawtooth', 0.06), 110); }

  // 做题时任何点击都有"点击声"（朗读按钮除外，避免叠加）
  document.addEventListener('click', function (e) {
    const t = e.target.closest('.ex .opt, .ex .order-item, .ex button');
    if (!t) return;
    if (t.getAttribute('data-act') === 'speak-q') return;
    playClick();
  }, true);

  // 真跑代码（Skulpt 纯 JS Python 引擎，file:// 双击即跑，无需服务器）
  // 预处理：把 input("提示") 换成运行前弹窗取到的值（Skulpt 同步版不支持 input 异步）
  function prepareInput(code) {
    // 自动把中文输入法常见的全角引号，换成 Python 能识别的半角引号
    code = String(code)
      .replace(/[\u201C\u201D]/g, '"')   // “ ” -> "
      .replace(/[\u2018\u2019]/g, "'");  // ‘ ’ -> '
    return code.replace(/input\s*\(([^)]*)\)/g, function (m, arg) {
      var promptText = '';
      arg = (arg || '').trim();
      if (arg) {
        var c0 = arg.charAt(0);
        if ((c0 === '"' || c0 === "'") && arg.charAt(arg.length - 1) === c0) {
          promptText = arg.slice(1, -1);
        }
      }
      var val = '';
      try { val = window.prompt(promptText || '请输入：') || ''; } catch (e) { val = ''; }
      return JSON.stringify(val);
    });
  }
  // 海龟课代码（forward/left 等）Skulpt 默认不认识，预置同名桩函数：
  // 让"运行"不报错，并在输出里用中文显示小海龟的动作，和视频里的指令一致。
  function isTurtleCode(code) {
    return /(?:^|\W)(?:forward|back|backward|left|right)\s*\(|\bturtle\b/i.test(code);
  }
  var TURTLE_STUB = [
    'def forward(n):',
    '    print("🐢 向前走 " + str(n) + " 步")',
    'def back(n):',
    '    print("🐢 向后走 " + str(n) + " 步")',
    'def backward(n):',
    '    print("🐢 向后走 " + str(n) + " 步")',
    'def left(n):',
    '    print("🐢 向左转 " + str(n) + " 度")',
    'def right(n):',
    '    print("🐢 向右转 " + str(n) + " 度")',
    ''
  ].join('\n');

  function runUserCode(code, outEl) {
    if (!outEl) return;
    if (typeof Sk === 'undefined') {
      outEl.textContent = '⚠️ Python 引擎还没加载好，请稍等或刷新页面重试。';
      return;
    }
    code = prepareInput(code);
    if (isTurtleCode(code)) {
      code = TURTLE_STUB + '\n' + code;
    }
    outEl.textContent = '';
    Sk.configure({
      output: function (text) { outEl.textContent += text; },
      read: function (filename) {
        if (Sk.builtinFiles && Sk.builtinFiles.files[filename] !== undefined) {
          return Sk.builtinFiles.files[filename];
        }
        throw new Error("找不到模块文件: '" + filename + "'");
      },
      inputfun: function (promptText) {
        return Promise.resolve(window.prompt(promptText || '请输入：'));
      },
      inputfunTakesPrompt: true,
      __future__: undefined
    });
    try {
      Sk.importMainWithBody('<stdin>', false, code);
    } catch (e) {
      outEl.textContent += '\n❌ 出错了：' + (e && e.message ? e.message : String(e));
    }
    if (/Traceback|Error:|SyntaxError/.test(outEl.textContent)) {
      outEl.textContent += '\n⚠️ 上面有报错，请检查代码～';
    } else {
      outEl.textContent += '\n✅ 运行结束';
    }
  }

  // 海龟代码真画图：解析 forward/back/left/right/penup/pendown/goto/setheading 与 for range 循环，
  // 在 canvas 上把轨迹画出来，海龟小图标跟着移动。非海龟代码仍走上面的 Skulpt。
  function turtleDraw(code, canvas, outEl) {
    if (!canvas || !canvas.getContext) { runUserCode(code, outEl); return; }
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    function parseTurtle(src) {
      src = String(src)
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'");
      const raw = src.replace(/\t/g, '  ').split('\n');
      const items = [];
      for (let i = 0; i < raw.length; i++) {
        const line = raw[i]; if (!line.trim()) continue;
        const m = line.match(/^(\s*)(.*)$/);
        items.push({ indent: m[1].length, content: m[2].trim() });
      }
      let idx = 0;
      function parseBlock(minIndent) {
        const stmts = [];
        while (idx < items.length && items[idx].indent >= minIndent) {
          const it = items[idx];
          const lm = it.content.match(/^for\s+\w+\s+in\s+range\((.*)\)\s*:$/);
          if (lm) {
            const node = { loop: true, range: lm[1].trim(), body: [] };
            idx++;
            node.body = parseBlock(it.indent + 1);
            stmts.push(node);
          } else {
            const cm = it.content.match(/^(\w+)\s*\((.*)\)$/);
            if (cm) {
              const args = cm[2].split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
              stmts.push({ cmd: cm[1], arg: args });
            }
            idx++;
          }
        }
        return stmts;
      }
      return parseBlock(0);
    }
    function rangeOf(s) {
      s = s.replace(/\s/g, '');
      const parts = s.split(',').map(Number);
      if (parts.length === 1) return parts[0];
      if (parts.length === 2) return parts[1] - parts[0];
      return 0;
    }

    let ast;
    try { ast = parseTurtle(code); }
    catch (e) { outEl.textContent = '⚠️ 暂时只支持 forward/back/left/right 和 for 循环哦～'; return; }
    if (!ast.length) { outEl.textContent = '⚠️ 没找到海龟指令～'; return; }

    // 执行，收集线段与每段结束时的海龟位置
    const segs = [];
    const poses = [];
    const st = { x: 0, y: 0, h: 0, pen: true };
    function run(stmts) {
      for (const s of stmts) {
        if (s.loop) {
          const n = rangeOf(s.range);
          for (let i = 0; i < n; i++) run(s.body);
        } else {
          const c = s.cmd, a = s.arg;
          if (c === 'forward' || c === 'back' || c === 'goto') {
            const len = (c === 'back' ? -a[0] : a[0]);
            const nx = c === 'goto' ? a[0] : st.x + len * Math.cos(st.h * Math.PI / 180);
            const ny = c === 'goto' ? a[1] : st.y + len * Math.sin(st.h * Math.PI / 180);
            if (st.pen) { segs.push({ x1: st.x, y1: st.y, x2: nx, y2: ny }); poses.push({ x: nx, y: ny, h: st.h }); }
            st.x = nx; st.y = ny;
          } else if (c === 'left' || c === 'right') {
            st.h += (c === 'left' ? a[0] : -a[0]);
          } else if (c === 'setheading') {
            st.h = a[0];
          } else if (c === 'penup') { st.pen = false; }
          else if (c === 'pendown') { st.pen = true; }
        }
      }
    }
    run(ast);
    if (!segs.length) { outEl.textContent = '🐢 小海龟这次没画线（也许只转了身）～'; return; }

    // 坐标映射（数学坐标 y 向上 -> 画布 y 向下）
    let minx = 0, maxx = 0, miny = 0, maxy = 0;
    segs.forEach(s => { minx = Math.min(minx, s.x1, s.x2); maxx = Math.max(maxx, s.x1, s.x2); miny = Math.min(miny, s.y1, s.y2); maxy = Math.max(maxy, s.y1, s.y2); });
    const pad = 24;
    const aw = W - pad * 2, ah = H - pad * 2 - 16;
    const ww = (maxx - minx) || 1, wh = (maxy - miny) || 1;
    let scale = Math.min(aw / ww, ah / wh); scale = Math.min(scale, 3.0);
    const uw = ww * scale, uh = wh * scale;
    const ox = pad + (aw - uw) / 2 - minx * scale;
    const baseY = pad + 16 + (ah - uh) / 2 + maxy * scale;
    function w2c(wx, wy) { return [ox + wx * scale, baseY - wy * scale]; }

    // 逐段动画绘制
    let segIdx = 0, segT = 0;
    const SEG_FRAMES = 16;
    function drawFrame() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#3C5FB4'; ctx.font = '13px sans-serif';
      ctx.fillText('🐢 小海龟画板', 12, 20);
      ctx.strokeStyle = '#5A82DC'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < segIdx; i++) {
        const s = segs[i]; const a = w2c(s.x1, s.y1), b = w2c(s.x2, s.y2);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
      if (segIdx < segs.length) {
        const s = segs[segIdx]; const a = w2c(s.x1, s.y1), b = w2c(s.x2, s.y2);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * segT, a[1] + (b[1] - a[1]) * segT);
      }
      ctx.stroke();
      // 海龟图标
      let hx, hy, hh;
      if (segIdx < segs.length) { const p = poses[segIdx]; hx = p.x; hy = p.y; hh = p.h; }
      else { const p = poses[poses.length - 1]; hx = p.x; hy = p.y; hh = p.h; }
      const c = w2c(hx, hy);
      const rad = hh * Math.PI / 180;
      const dx = Math.cos(rad), dy = -Math.sin(rad), px = -dy, py = dx;
      const tip = [c[0] + 12 * dx, c[1] + 12 * dy];
      const b1 = [c[0] - 8 * dx + 7 * px, c[1] - 8 * dy + 7 * py];
      const b2 = [c[0] - 8 * dx - 7 * px, c[1] - 8 * dy - 7 * py];
      ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); ctx.closePath();
      ctx.fillStyle = '#FFC478'; ctx.fill(); ctx.strokeStyle = '#E6A050'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(tip[0], tip[1], 2.5, 0, 7); ctx.fillStyle = '#2D3246'; ctx.fill();

      if (segIdx < segs.length) {
        segT += 1 / SEG_FRAMES;
        if (segT >= 1) { segT = 0; segIdx++; if (segIdx >= segs.length) segT = 1; }
        requestAnimationFrame(drawFrame);
      } else {
        outEl.textContent = '🐢 小海龟画好啦！一共画了 ' + segs.length + ' 段线～';
      }
    }
    drawFrame();
  }

  // 听学习成果：真人语音优先（晓晓），拼接 学到什么→哪题没做对→鼓励词
  function playLearningReport(les, btn) {
    if (!les) return;
    const pr = progress[les.id] || {};
    const exDone = pr.exDone || {};
    const exs = les.exercises || [];
    const wrong = [];
    exs.forEach((ex, i) => {
      if (exDone[i] && pr.firstAttempts && pr.firstAttempts[i] === 'wrong') wrong.push(i + 1);
    });
    const doneCount = Object.keys(exDone).length;

    // 真人语音：用预生成的晓晓片段拼接（向导点评部分按家长所选风格切换）
    const map = window.AUDIO_MAP && window.AUDIO_MAP[les.id];
    const learn = window.AUDIO_LEARN;
    if (map && map.takeaway) {
      voicePlayOnce('takeaway:' + les.id, learnSegAlt(map.takeaway), btn || null); // 学习成果 = 知识点回顾（口语化，按风格选音）；结尾点评段已移到「第一次提交作业」时播放，平时不播
      return;
    }
    // 兜底：无预生成语音时，只念知识点回顾（机械音）
    speak(les.takeaway || '', btn || null);
  }

  // 把全部课时拉成一条线性顺序，用于解锁判断
  function flatLessons() {
    const arr = [];
    data.chapters.forEach((ch) => ch.lessons.forEach((l) => arr.push(l)));
    return arr;
  }
  // 家长解锁：爬虫教程版面向 14+ 自学者，默认全部开放、无需解锁（保留逻辑以备将来切回少儿版）
  function isUnlocked(lesson) {
    return true;
  }
  function lessonPercent(lesson) {
    if (progress[lesson.id] && progress[lesson.id].done) return 100;
    if (progress[lesson.id] && progress[lesson.id].viewed) return 8;
    return 0;
  }
  function findLesson(id) {
    for (const ch of data.chapters) for (const l of ch.lessons) if (l.id === id) return l;
    return null;
  }

  // ===== 激活门禁（离线一机一码：作者私钥签名，前端公钥离线验签，零服务器）=====
  // 机器码 = 本机持久随机串(存 localStorage)；激活码 = 作者私钥对机器码签名。
  // 前端用内嵌公钥验签：无私钥造不出合法激活码；一机一码防复制传播。全程离线，无需联网/后端。
  // 作者发码：node license-author/author_gen.js <机器码>  （见 license-author/ 说明）
  const LICENSE_API = ''; // 离线模式不使用；保留字段以备将来切回在线模式
  const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlG58cfiYUJM5iWYjz1eh
KOWaLh+n9wSvoy3ioWKy+mrdJ/8AvS7Fp7n4B2hgMhWDcSTe2+3itJpl61ZRlzxz
cLV4unG+oGjkwZ7qDSI4aN40VE8jY3V83EBcMGpnKipwUZOqPFwXRc9mQosA8T/k
bPyqn/V268Y2Cv+StEMjzLw+v4RNNteNptyxUiw6RW1BWki+E9mdP6h6XIBZmub/
9xx7lvIyPknDf58rlGwzFanxJGjEuS/KPolqSLXRuTrrBVO8HTEwpPGVGcnTKsj5
8KFgBrWKswn+wjTUHvfEozrUaxbQogybartQBOKzh58PD5pYuuKgUYkNpOf9leto
CQIDAQAB
-----END PUBLIC KEY-----`;

  function randHex(n) { let s = ''; const c = '0123456789abcdef'; for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * 16)]; return s; }
  function shaHex(str) { return KJUR.crypto.Util.sha256(str); }
  function getMachineId() {
    // 离线一机一码：仅用持久随机串，不含易变浏览器指纹 → 机器码稳定，激活码长期有效
    let mid = localStorage.getItem('wb_mid_v1');
    if (!mid) { mid = randHex(16); try { localStorage.setItem('wb_mid_v1', mid); } catch (e) {} }
    return mid;
  }
  function loadLic() {
    try { return JSON.parse(localStorage.getItem('wb_lic_v1') || 'null'); } catch (e) { return null; }
  }
  // base64url → hex（用于把 token 签名喂给 jsrsasign 验签）
  function b64urlToHex(s) {
    const bin = atob(String(s).replace(/-/g, '+').replace(/_/g, '/'));
    let h = '';
    for (let i = 0; i < bin.length; i++) h += ('0' + bin.charCodeAt(i).toString(16)).slice(-2);
    return h;
  }
  // 本地验 token（离线信任）：公钥验签名 + 机器码匹配 + 未过期
  // token 格式与服务端一致：base64url(machineId|exp|nonce) + '.' + base64url(RSA签名(payload))
  function verifyTokenLocal(token, mid) {
    try {
      const parts = String(token).split('.');
      if (parts.length !== 2) return false;
      const payload = parts[0];
      const hexSig = b64urlToHex(parts[1]);
      const s = new KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
      s.init(PUBLIC_KEY_PEM);
      s.updateString(payload);
      if (!s.verify(hexSig)) return false; // 本地造不出合法 token（无私钥）
      const dec = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const segs = dec.split('|');
      if (segs[0] !== mid) return false;
      const exp = Number(segs[1]);
      if (!exp || exp < Date.now()) return false;
      return true;
    } catch (e) { return false; }
  }
  function isActivatedLocal() {
    const l = loadLic();
    if (!l || !l.mid || !l.code) return false;
    if (l.mid !== getMachineId()) return false; // 机器码变化（清缓存/换浏览器）→ 需重新激活
    return verifyActivation(l.code, l.mid); // 公钥验签：无私钥造不出合法激活码
  }
  function parseActivation(code) {
    try {
      const raw = atob(String(code).trim());
      const segs = raw.split('|');
      if (segs.length === 3) return { mid: segs[0], exp: Number(segs[1]), sigHex: segs[2], hasExp: true };
      if (segs.length === 2) return { mid: segs[0], sigHex: segs[1], hasExp: false }; // 兼容旧格式（无有效期）
    } catch (e) {}
    return null;
  }
  function verifyActivation(code, mid) {
    const p = parseActivation(code);
    if (!p) return false;
    if (p.mid !== mid) return false; // 一机一码：激活码必须对应本机机器码
    if (p.hasExp && p.exp && p.exp < Date.now()) return false; // 过期 → 视为无效
    const payload = p.hasExp ? (p.mid + '|' + p.exp) : p.mid;
    try {
      const sig = new KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
      sig.init(PUBLIC_KEY_PEM);
      sig.updateString(payload);
      return sig.verify(p.sigHex); // 本地造不出合法激活码（无私钥）
    } catch (e) { return false; }
  }
  function activate() {
    const input = document.getElementById('lic-input');
    const err = document.getElementById('lic-err');
    if (!input || !input.value.trim()) { if (err) { err.textContent = '请先粘贴激活码。'; err.style.display = 'block'; } return; }
    const mid = getMachineId();
    const p = parseActivation(input.value);
    const msg = '激活码无效：请确认复制完整，且激活码对应本机机器码。';
    if (!p || p.mid !== mid) {
      if (err) { err.textContent = msg; err.style.display = 'block'; }
      return;
    }
    if (p.hasExp && p.exp && p.exp < Date.now()) {
      if (err) { err.textContent = '激活码已过期（有效期 2 年），请联系作者重新获取激活码。'; err.style.display = 'block'; }
      return;
    }
    // 离线一机一码：本地公钥验签激活码（无私钥造不出合法码；一机一码防转借）
    if (!verifyActivation(input.value, mid)) {
      if (err) { err.textContent = msg; err.style.display = 'block'; }
      return;
    }
    if (err) err.style.display = 'none';
    try { localStorage.setItem('wb_lic_v1', JSON.stringify({ mid: mid, code: input.value.trim() })); } catch (e) {}
    location.reload();
  }
  // 离线一机一码：不联网核验，激活码本地公钥验签即信任（无后端、可离线长期使用）
  function verifyServerAsync() { /* no-op in offline mode */ }
  function renderActivation(mid) {
    const home = document.getElementById('home-view'); if (home) home.style.display = 'none';
    const less = document.getElementById('lesson-view'); if (less) less.style.display = 'none';
    let mask = document.getElementById('lic-mask');
    if (!mask) { mask = document.createElement('div'); mask.id = 'lic-mask'; mask.className = 'lic-mask'; document.body.appendChild(mask); }
    mask.innerHTML =
      '<div class="lic-card">' +
        '<div class="lic-lock">🔒</div>' +
        '<h1 class="lic-title">激活后使用</h1>' +
        '<p class="lic-sub">本工具需要激活码才能使用。请把下面的「本机机器码」发给作者，拿到激活码后粘贴到下方即可激活。完全离线，无需联网。</p>' +
        '<div class="lic-row"><span class="lic-label">本机机器码</span>' +
        '<code class="lic-mid" id="lic-mid">' + mid + '</code>' +
        '<button class="speak-btn sm" id="lic-copy">📋 复制</button></div>' +
        '<textarea class="lic-input" id="lic-input" placeholder="在此粘贴作者给你的激活码…" spellcheck="false"></textarea>' +
        '<div class="lic-err" id="lic-err" style="display:none"></div>' +
        '<button class="btn submit" id="lic-activate">✅ 激活</button>' +
        '<p class="lic-tip">每台设备需单独激活，激活码与机器绑定、不可转给他人，有效期 2 年（到期需重新向作者获取）。本工具离线可用，激活后随时打开即可，无需联网核验。</p>' +
      '</div>';
    mask.style.display = 'flex';
    const act = document.getElementById('lic-activate'); if (act) act.onclick = activate;
    const copy = document.getElementById('lic-copy');
    if (copy) copy.onclick = function () {
      const t = document.getElementById('lic-mid').textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(function () { toast('已复制机器码'); }, function () { toast('已复制机器码'); });
      } else {
        const r = document.createRange(); r.selectNode(document.getElementById('lic-mid'));
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        try { document.execCommand('copy'); toast('已复制机器码'); } catch (e) {}
      }
    };
  }

  function init() {
    // 激活门禁：未激活则只显示激活界面，其余功能全部隐藏
    const mid = getMachineId();
    if (!SKIP_ACTIVATION && !isActivatedLocal()) { renderActivation(mid); return; }
    if (!SKIP_ACTIVATION) verifyServerAsync(); // 方案B·离线：verifyServerAsync 为 no-op，不联网核验、无远程吊销
    if (!data || !data.chapters) { document.body.innerHTML = '<p style="padding:40px">未找到课程数据，请检查 data/course.js</p>'; return; }
    $('#course-title').textContent = data.title || '我的网课';
    // 第 1 课默认开放，并记录解锁状态（供家长面板显示）
    const flat = flatLessons();
    if (flat[0]) {
      if (!progress[flat[0].id]) progress[flat[0].id] = {};
      if (!progress[flat[0].id].parentUnlocked) { progress[flat[0].id].parentUnlocked = true; saveProgress(); }
    }
    $('#parent-btn').onclick = openParentPanel;
    window.addEventListener('beforeunload', accumulateStudyTime);
    initScrollFab();
    renderHome();
    const lv0 = document.getElementById('lesson-view');
    if (lv0) lv0.addEventListener('scroll', function () { const s = loadSession(); s.scroll = s.scroll || {}; if (currentLesson) { s.scroll[currentLesson.id] = lv0.scrollTop; writeSession(s); } });
    // 刷新不丢进度：若上次停在某课，自动重新打开并恢复滚动/答案
    const s0 = loadSession();
    if (s0.openId) { const l = findLesson(s0.openId); if (l) openLesson(l); }
    updateProgress();
  }

  // ===== 一键向上 / 向下 悬浮按钮 =====
  function activeScroller() {
    const lv = $('#lesson-view');
    if (lv && lv.style.display !== 'none') return lv;
    const hv = $('#home-view');
    if (hv && hv.style.display !== 'none') return hv;
    return null;
  }
  function initScrollFab() {
    const fab = $('#scroll-fab');
    const up = $('#fab-up'), down = $('#fab-down');
    if (!fab || !up || !down) return;
    up.onclick = function () { const s = activeScroller(); if (s) { if (s.scrollTo) s.scrollTo({ top: 0, behavior: 'smooth' }); else s.scrollTop = 0; } };
    down.onclick = function () { const s = activeScroller(); if (s) { const t = s.scrollHeight; if (s.scrollTo) s.scrollTo({ top: t, behavior: 'smooth' }); else s.scrollTop = t; } };
    const refresh = function () {
      const s = activeScroller();
      const scrollable = s && s.scrollHeight > s.clientHeight + 8;
      fab.classList.toggle('hidden', !scrollable);
    };
    window.addEventListener('resize', refresh);
    // 进入课程 / 回首页时刷新可见性
    const mo = new MutationObserver(refresh);
    if ($('#lesson-view')) mo.observe($('#lesson-view'), { attributes: true, attributeFilter: ['style'] });
    fab._refresh = refresh;
    setTimeout(refresh, 60);
  }
  function refreshScrollFab() { const fab = $('#scroll-fab'); if (fab && fab._refresh) fab._refresh(); }

  // 首页视图状态：'hub' 枢纽 / 'parent' 家长课程列表 / 'student' 学生课程列表 / 'student-zone' 学生园地
  let homeViewName = 'hub';
  // 全部可能获得的勋章（按 award.p 去重，用于荣誉架剪影）
  function allAwards() {
    const seen = {}; const arr = [];
    flatLessons().forEach((l) => {
      if (l.award && !seen[l.award.p]) { seen[l.award.p] = 1; arr.push({ p: l.award.p, title: l.award.title, badge: l.award.badge, desc: l.award.desc || '' }); }
    });
    return arr.sort((a, b) => a.p - b.p);
  }
  function renderHome() {
    $('#lesson-view').style.display = 'none';
    $('#home-view').style.display = 'block';
    if (homeViewName === 'parent') return renderCourseList('parent');
    if (homeViewName === 'student') return renderCourseList('student');
    if (homeViewName === 'student-zone') return renderStudentZone();
    return renderHub();
  }
  // 一张课的卡片（枢纽/列表共用）
  function makeLessonCard(les, displayIdx, color, icon) {
    const unlocked = isUnlocked(les);
    const pct = lessonPercent(les);
    const done = pct === 100;
    const card = document.createElement('div');
    card.className = 'lesson-card' + (unlocked ? '' : ' locked') + (done ? ' done' : '');
    const pctLabel = done ? '已完成' : (unlocked ? (pct > 0 ? '学习中' : '未开始') : '需家长解锁');
    card.innerHTML =
      '<div class="card-cover" style="background:' + color + '">' +
        '<span class="cover-icon">' + coverIcon(icon) + '</span>' +
        (done ? '<span class="badge-done">✓</span>' : '') +
        (unlocked ? '' : '<span class="lock">🔒</span>') +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-label">第 ' + displayIdx + ' 课</div>' +
        '<div class="card-title">' + escapeHtml(les.title) + '</div>' +
        '<div class="card-progress">' +
          '<div class="card-bar"><div class="card-fill" style="width:' + pct + '%"></div></div>' +
          '<span class="card-pct">' + pctLabel + '</span>' +
        '</div>' +
        (unlocked ? '' : '<button class="unlock-btn" type="button">🔓 家长解锁</button>') +
      '</div>';
    if (unlocked) card.onclick = () => openLesson(les);
    else card.onclick = () => requestUnlock(les);
    return card;
  }

  // ===== 首页枢纽 =====
  function renderHub() {
    const home = $('#home-view');
    home.innerHTML = '';
    const worn = wornBadge();

    // 欢迎横幅
    const banner = document.createElement('div');
    banner.className = 'home-banner';
    banner.innerHTML = '<h1>👋 欢迎，' + childName() + (worn ? ' <span class="worn-badge">' + worn.badge + ' ' + worn.title + '</span>' : '') + '！准备好写你的第一个爬虫了吗？</h1>' +
      '<p>这是一套爬虫实战课：从 Python 基本功、看懂网页与 HTTP，一路打到能独立写爬虫小脚本。</p>' +
      '<p style="margin-top:8px;color:#1f3a5f;background:#eaf3ff;display:inline-block;padding:6px 12px;border-radius:8px">🕷️ 共 11 章 40 节，每节看完讲义、做练习、勾掉动手任务即可；代码课还能在页面里真跑。</p>';
    home.appendChild(banner);

    // 分区入口
    const grid = document.createElement('div');
    grid.className = 'zone-grid';
    const zones = [
      { key: 'parent', icon: '📋', color: '#9b6bff', title: '家长课程 🔒', desc: '给家长看的入门课：Python 是什么、学习路线图怎么走（需家长密码）' },
      { key: 'student', icon: '📚', color: '#2f8fe0', title: '学生课程', desc: '正式课：从入门一路打到能写爬虫脚本' },
      { key: 'parent-zone', icon: '🛡️', color: '#ff9a3c', title: '家长园地 🔒', desc: '家长设置：昵称、语音风格、解锁、学习报告、密码（需家长密码）' },
      { key: 'student-zone', icon: '🎮', color: '#5bc0a8', title: '学生园地', desc: '练习小站：练字、单词本，随时巩固' }
    ];
    // 爬虫教程版无家长课内容：自动隐藏家长相关分区，首屏更干净
    const hasParent = data.chapters.some((ch) => ch.lessons.some((l) => l.forParent));
    zones.filter((z) => hasParent || (z.key !== 'parent' && z.key !== 'parent-zone')).forEach((z) => {
      const tile = document.createElement('div');
      tile.className = 'zone-tile';
      tile.style.setProperty('--zc', z.color);
      tile.innerHTML = '<div class="zt-icon">' + (ICON[z.key] || z.icon) + '</div>' +
        '<div class="zt-title">' + z.title + '</div>' +
        '<div class="zt-desc">' + z.desc + '</div>';
      tile.onclick = () => {
        if (z.key === 'parent') { promptPin(() => { homeViewName = 'parent'; renderHome(); }); }
        else if (z.key === 'student') { homeViewName = 'student'; renderHome(); }
        else if (z.key === 'student-zone') { homeViewName = 'student-zone'; renderHome(); }
        else if (z.key === 'parent-zone') { openParentPanel(); }
      };
      grid.appendChild(tile);
    });
    home.appendChild(grid);
    refreshScrollFab();
  }

  // 荣誉架 UI
  function buildHonorShelf(worn) {
    const earned = {};
    loadBadges().forEach((b) => { earned[b.p] = b; });
    const awards = allAwards();
    const shelf = document.createElement('div');
    shelf.className = 'honor-shelf';
    const medals = awards.map((a) => {
      const e = earned[a.p];
      if (e) {
        const on = worn && worn.p === a.p;
        return '<div class="hs-medal earned" title="' + escapeHtml(a.desc) + '">' +
          '<div class="m-badge">' + a.badge + '</div>' +
          '<div class="m-title">' + escapeHtml(a.title) + '</div>' +
          (on ? '<div class="m-on">佩戴中</div>' : '') + '</div>';
      }
      return '<div class="hs-medal locked" title="完成对应关卡即可获得">' +
        '<div class="m-badge">❔</div>' +
        '<div class="m-title">未解锁</div></div>';
    }).join('');
    const got = loadBadges().length, total = awards.length;
    shelf.innerHTML = '<div class="hs-title">🏅 荣誉架<span class="hs-count">已得 ' + got + ' / ' + total + '</span></div>' +
      '<div class="hs-board">' + medals + '</div>' +
      '<div class="hs-note">集齐全部勋章，你就是真正的 Python 小学士啦！</div>';
    return shelf;
  }

  // 课程列表（家长课程 / 学生课程）
  function renderCourseList(scope) {
    const home = $('#home-view');
    home.innerHTML = '';
    const isParent = scope === 'parent';
    const head = document.createElement('div');
    head.className = 'list-head';
    head.innerHTML = '<button class="back-home" id="back-home">← 返回首页</button>' +
      '<h2 class="list-title">' + (isParent ? '👨‍👩‍👧 家长课程' : '📚 学生课程') + '</h2>';
    home.appendChild(head);
    $('#back-home').onclick = () => { homeViewName = 'hub'; renderHome(); };

    // 统计用于编号
    let si = 0;
    data.chapters.forEach((ch) => {
      const lessons = ch.lessons.filter((l) => isParent ? l.forParent : !l.forParent);
      if (!lessons.length) return;
      const unit = document.createElement('section');
      unit.className = 'unit';
      unit.innerHTML = '<h2 class="unit-title">' + escapeHtml(isParent ? '给家长看的小课' : ch.title) + '</h2>';
      const grid = document.createElement('div');
      grid.className = 'card-grid';
      lessons.forEach((les) => {
        si++;
        const idx = isParent ? si : si; // 学生课用全局连续编号
        const color = les.color || PALETTE[(si - 1) % PALETTE.length];
        const icon = les.icon || '📘';
        grid.appendChild(makeLessonCard(les, idx, color, icon));
      });
      unit.appendChild(grid);
      home.appendChild(unit);
    });
    refreshScrollFab();
  }

  // ===== 学生园地 · 项目练习（初级项目练习 / 中级项目练习）=====
  // 复用 runUserCode 在浏览器里真跑 Python；完成进度单独存 localStorage，不污染课程进度。
  function openCodePractice(kind) {
    const all = (window.CODE_PRACTICE && window.CODE_PRACTICE[kind]) || [];
    if (!all.length) { toast('练习还在准备中～'); return; }
    const meta = ({
      projects: { title: '🛠️ 初级项目练习（简单）', tip: '动手做小项目：有的题补全代码里的 ____（填空），有的题要你写完整函数（写代码）。运行结果命中目标就算过关，卡住可点「👀 看参考答案」或「💡 提示」。' },
      advanced: { title: '🚀 中级项目练习（难）', tip: '进阶算法挑战：填空补全 + 写完整函数都有。运行结果命中目标就算过关，卡住可点「👀 看参考答案」或「💡 提示」。' },
      hard: { title: '🏆 高级项目练习（实战）', tip: '综合实战项目：每题都要写完整函数，模拟真实爬虫流水线。运行结果命中目标就算过关，卡住可点「👀 看参考答案」或「💡 提示」。' }
    })[kind] || { title: '项目练习', tip: '' };
    const title = meta.title, tip = meta.tip;
    let doneMap = {};
    try { doneMap = (JSON.parse(localStorage.getItem('code_practice_done_v1') || '{}'))[kind] || {}; } catch (e) {}
    function saveDone() {
      let store = {};
      try { store = JSON.parse(localStorage.getItem('code_practice_done_v1') || '{}'); } catch (e) {}
      store[kind] = doneMap;
      try { localStorage.setItem('code_practice_done_v1', JSON.stringify(store)); } catch (e) {}
    }
    function doneCount() { let c = 0; for (const k in doneMap) if (doneMap[k]) c++; return c; }

    const cards = all.map((p, i) => {
      const done = !!doneMap[p.id];
      const isFill = !!p.fill;
      return '<div class="cp-card' + (done ? ' done' : '') + (isFill ? ' fill' : '') + '" id="cp-' + p.id + '">' +
        '<div class="cp-head"><span class="cp-no">' + (i + 1) + '</span>' +
        '<span class="cp-title">' + escapeHtml(p.title) + '</span>' +
        '<span class="cp-fill-tag">' + (isFill ? '✏️ 填空' : '💻 写代码') + '</span>' +
        '<span class="cp-badge" id="cp-badge-' + p.id + '">' + (done ? '✅ 已完成' : '') + '</span></div>' +
        '<div class="cp-q">' + escapeHtml(p.question) +
        ' <button class="speak-btn sm" data-cpact="read" data-id="' + p.id + '">🔊 读题</button>' +
        (p.hint ? ' <button class="speak-btn sm" data-cpact="hint" data-id="' + p.id + '">💡 提示</button>' : '') +
        ' <button class="speak-btn sm" data-cpact="answer" data-id="' + p.id + '">👀 看参考答案</button></div>' +
        (p.hint ? '<div class="cp-hint" id="cp-hint-' + p.id + '" style="display:none">' + escapeHtml(p.hint) + '</div>' : '') +
        '<div class="cp-answer" id="cp-answer-' + p.id + '" style="display:none"><b>参考答案：</b>\n' + escapeHtml(p.answer || '') + '</div>' +
        '<textarea class="ex-code-input" id="cp-code-' + p.id + '" spellcheck="false" placeholder="' + (isFill ? '把代码里的 ____ 换成你的内容…' : '在这里写 Python 代码…') + '">' + escapeHtml(p.starter || '') + '</textarea>' +
        '<div class="ex-code-actions"><button class="btn submit" data-cpact="run" data-id="' + p.id + '">▶ 运行代码</button>' +
        '<button class="btn ghost" data-cpact="reset" data-id="' + p.id + '">🔄 重置代码</button>' +
        '<span class="cp-target">目标：输出里出现「' + escapeHtml(p.expect) + '」</span></div>' +
        '<pre class="ex-code-output" id="cp-out-' + p.id + '">点"运行代码"看结果～</pre></div>';
    }).join('');

    const html = '<div class="words-modal code-practice"><div class="cp-top">' +
      '<h2>' + title + '</h2>' +
      '<div class="cp-progress">已完成 <b id="cp-count">' + doneCount() + '</b> / ' + all.length + '</div>' +
      '<div id="cp-tier-done" class="cp-tier-done" style="display:' + (doneCount() === all.length ? '' : 'none') + '">🎉 本关已全部完成！</div>' +
      '<button class="btn ghost" id="cp-close">关闭</button></div>' +
      '<p class="cp-tip">' + tip + '</p>' +
      '<div class="cp-list">' + cards + '</div></div>';

    showModal(html);
    const modalEl = document.getElementById('modal');
    modalEl.classList.add('wide');
    const m = modalEl;
    if (m.querySelector('#cp-close')) m.querySelector('#cp-close').onclick = () => { modalEl.classList.remove('wide'); hideModal(); };
    m.querySelectorAll('button[data-cpact]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const p = all.filter((x) => x.id === id)[0];
        if (btn.dataset.cpact === 'hint') {
          const h = m.querySelector('#cp-hint-' + id);
          if (h) h.style.display = (h.style.display === 'none') ? '' : 'none';
          return;
        }
        if (btn.dataset.cpact === 'read') { speak(p.question, btn); return; }
        if (btn.dataset.cpact === 'answer') {
          const a = m.querySelector('#cp-answer-' + id);
          if (a) a.style.display = (a.style.display === 'none') ? '' : 'none';
          return;
        }
        if (btn.dataset.cpact === 'reset') {
          const ta = m.querySelector('#cp-code-' + id);
          if (ta) ta.value = p.starter || '';
          const out = m.querySelector('#cp-out-' + id);
          if (out) { out.textContent = '点"运行代码"看结果～'; out.classList.remove('ok-out'); }
          return;
        }
        const code = m.querySelector('#cp-code-' + id).value;
        const out = m.querySelector('#cp-out-' + id);
        runUserCode(code, out);
        const hasErr = /Traceback|Error:|SyntaxError|⚠️/.test(out.textContent);
        const beforeDone = doneCount();
        if (p.expect && !hasErr && out.textContent.indexOf(p.expect) >= 0) {
          out.classList.add('ok-out');
          if (!doneMap[id]) {
            doneMap[id] = true; saveDone();
            const card = m.querySelector('#cp-' + id); if (card) card.classList.add('done');
            const badge = m.querySelector('#cp-badge-' + id); if (badge) badge.textContent = '✅ 已完成';
            const cnt = m.querySelector('#cp-count'); if (cnt) cnt.textContent = doneCount();
            playCorrect();
            startVoice(vfile('common/fb_right'));
          }
          if (beforeDone < all.length && doneCount() === all.length) {
            launchConfetti();
            const td = m.querySelector('#cp-tier-done'); if (td) td.style.display = '';
            toast('🎉 这一关全部完成啦！回学生园地看看你的成就勋章～');
          }
        } else {
          out.classList.remove('ok-out');
        }
      };
    });
  }

  // 学生园地：练习小站
  function renderStudentZone() {
    const home = $('#home-view');
    home.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'list-head';
    head.innerHTML = '<button class="back-home" id="back-home">← 返回首页</button>' +
      '<h2 class="list-title">🎮 学生园地</h2>';
    home.appendChild(head);
    $('#back-home').onclick = () => { homeViewName = 'hub'; renderHome(); };

    // 荣誉架：把勋章墙放在学生园地，已得的亮起、未得的显示剪影
    home.appendChild(buildHonorShelf(wornBadge()));

    const grid = document.createElement('div');
    grid.className = 'zone-grid';
    const tools = [
      { key: 'wordbank', icon: '📚', color: '#3cc6ff', title: '单词本', desc: '本工具全部单词，可顺序播放、勾选读解释，方便磨耳朵', act: () => openWordBankAll() },
      { key: 'practice', icon: '⌨️', color: '#5bc0a8', title: '单词练习', desc: '练习敲写全部单词；敲错的词单独收进「练习错词本」', act: () => openPracticeHub() },
      { key: 'dictate', icon: '✍️', color: '#7b8cff', title: '单词听写', desc: '只听发音默写单词；听写敲错的词单独收进「听写错词本」', act: () => openDictateHub() },
      { key: 'grad', icon: '🎓', color: '#ffcf3c', title: '毕业典礼回顾', desc: '重温最后的毕业考试，挑战那 9 道编程题', act: () => { const g = findLesson('grad'); if (g) openLesson(g); } },
      { key: 'codepro', icon: '🛠️', color: '#ff9a3c', title: '初级项目练习（简单）', desc: '20 道趣味小项目（填空 + 写代码），给学得快的孩子练手，打好编程底子', act: () => openCodePractice('projects') },
      { key: 'codeadv', icon: '🚀', color: '#9b6bff', title: '中级项目练习（难）', desc: '25 道进阶项目（填空 + 写代码），挑战思维极限', act: () => openCodePractice('advanced') },
      { key: 'codehard', icon: '🏆', color: '#ff5c8a', title: '高级项目练习（实战）', desc: '3 道综合实战项目（写完整函数），模拟真实爬虫流水线，挑战综合能力', act: () => openCodePractice('hard') }
    ];
    tools.forEach((t) => {
      const tile = document.createElement('div');
      tile.className = 'zone-tile';
      tile.style.setProperty('--zc', t.color);
      tile.innerHTML = '<div class="zt-icon">' + (ICON[t.key] || t.icon) + '</div>' +
        '<div class="zt-title">' + t.title + '</div>' +
        '<div class="zt-desc">' + t.desc + '</div>';
      tile.onclick = t.act;
      grid.appendChild(tile);
    });
    home.appendChild(grid);
    home.appendChild(buildCodePracticeAchievements());
    refreshScrollFab();
  }

  // 学生园地：项目练习成就面板（三档通关勋章，读完一整关亮一枚）
  function buildCodePracticeAchievements() {
    const tiers = [
      { key: 'projects', icon: '🛠️', title: '初级通关', sub: '完成全部初级项目练习' },
      { key: 'advanced', icon: '🚀', title: '中级通关', sub: '完成全部中级项目练习' },
      { key: 'hard', icon: '🏆', title: '实战通关', sub: '完成全部高级实战项目' }
    ];
    let store = {};
    try { store = JSON.parse(localStorage.getItem('code_practice_done_v1') || '{}'); } catch (e) {}
    const wrap = document.createElement('div');
    wrap.className = 'cp-achieve';
    const medals = tiers.map((t) => {
      const tierDone = (store[t.key] || {});
      let c = 0; for (const k in tierDone) if (tierDone[k]) c++;
      const total = (window.CODE_PRACTICE && window.CODE_PRACTICE[t.key] || []).length;
      const complete = total > 0 && c >= total;
      return '<div class="cp-ach' + (complete ? ' got' : '') + '">' +
        '<div class="cp-ach-medal">' + (complete ? t.icon : '🔒') + '</div>' +
        '<div class="cp-ach-title">' + t.title + '</div>' +
        '<div class="cp-ach-sub">' + (complete ? '已达成！' : (c + ' / ' + total)) + '</div></div>';
    }).join('');
    wrap.innerHTML = '<div class="cp-ach-head">🏅 项目练习成就<span class="cp-ach-hint">做完一整关，勋章就亮起来</span></div>' +
      '<div class="cp-ach-row">' + medals + '</div>';
    return wrap;
  }

  // ===== 单词练习 / 单词听写 入口（各自带独立的错词本）=====
  function openPracticeHub() {
    const n = (window.VOCAB && VOCAB.wrongWords('practice').length) || 0;
    const html = '<div class="words-modal"><h2>⌨️ 单词练习</h2>' +
      '<p class="wm-tip">练习敲写单词；敲错的词会自动进「练习错词本」，和听写、课程的错词本分开记。</p>' +
      '<div class="wm-group"><h3>📝 全部单词</h3>' +
      '<button class="btn hub-btn" id="h-p-all">⌨️ 练习全部单词</button></div>' +
      '<div class="wm-group"><h3>❌ 练习错词本</h3>' +
      '<button class="btn hub-btn" id="h-p-wb">' + (n ? ('❌ 练习错词本 · 专项练习（' + n + '）') : '❌ 练习错词本 · 专项练习') + '</button></div>' +
      '<div class="modal-actions"><button class="btn ghost" id="h-close">关闭</button></div></div>';
    showModal(html);
    const m = document.getElementById('modal');
    if (m.querySelector('#h-p-all')) m.querySelector('#h-p-all').onclick = () => { hideModal(); openTypingDrill('type'); };
    if (m.querySelector('#h-p-wb')) m.querySelector('#h-p-wb').onclick = () => openWrongBook('practice');
    if (m.querySelector('#h-close')) m.querySelector('#h-close').onclick = hideModal;
  }
  function openDictateHub() {
    const n = (window.VOCAB && VOCAB.wrongWords('dictate').length) || 0;
    const html = '<div class="words-modal"><h2>✍️ 单词听写</h2>' +
      '<p class="wm-tip">只听发音、不显示拼写，照着听到的把单词打出来；听写敲错的词会自动进「听写错词本」。</p>' +
      '<div class="wm-group"><h3>✍️ 全部单词</h3>' +
      '<button class="btn hub-btn" id="h-d-all">✍️ 听写全部单词</button></div>' +
      '<div class="wm-group"><h3>❌ 听写错词本</h3>' +
      '<button class="btn hub-btn" id="h-d-wb">' + (n ? ('❌ 听写错词本 · 专项练习（' + n + '）') : '❌ 听写错词本 · 专项练习') + '</button></div>' +
      '<div class="modal-actions"><button class="btn ghost" id="h-close">关闭</button></div></div>';
    showModal(html);
    const m = document.getElementById('modal');
    if (m.querySelector('#h-d-all')) m.querySelector('#h-d-all').onclick = () => { hideModal(); openTypingDrill('dictate'); };
    if (m.querySelector('#h-d-wb')) m.querySelector('#h-d-wb').onclick = () => openWrongBook('dictate');
    if (m.querySelector('#h-close')) m.querySelector('#h-close').onclick = hideModal;
  }
  // 单词本：本工具全部单词，按课程顺序播放，可勾选「同时读解释」磨耳朵
  function openWordBankAll() {
    const bankMap = (window.VOCAB && VOCAB.bank()) || {};
    const keys = Object.keys(bankMap).sort((a, b) => bankMap[a].order - bankMap[b].order);
    const list = keys.map((k) => { const w = bankMap[k]; return { en: w.en, zh: w.zh, enAudio: w.enAudio, zhAudio: w.zhAudio }; });
    if (!list.length) { toast('还没有单词可以播放～'); return; }
    const html = '<div class="words-modal wordbank-modal"><h2>📚 单词本（全部 ' + list.length + ' 个）</h2>' +
      '<p class="wm-tip">按课程顺序播放全部单词，可勾选「同时读解释」当磨耳朵。点单词也能单独听。</p>' +
      '<div class="wb-seq">' +
        '<button class="btn" id="wb-play">▶ 顺序播放全部</button>' +
        '<button class="btn ghost" id="wb-stop" style="display:none">⏸ 停止</button>' +
        '<label class="drill-readexpl"><input type="checkbox" id="wb-zh"> 🔊 同时读解释（中文意思）</label>' +
      '</div>' +
      '<div class="ex-feedback" id="wb-status">——</div>' +
      '<div class="word-grid">' + list.map((w) => '<button class="word-chip" data-en="' + escapeHtml(String(w.en).toLowerCase()) + '">' + escapeHtml(w.en) + '</button>').join('') + '</div>' +
      '<div class="modal-actions"><button class="btn ghost" id="wb-close">关闭</button></div></div>';
    showModal(html);
    const m = document.getElementById('modal');
    const statusEl = m.querySelector('#wb-status');
    const playBtn = m.querySelector('#wb-play');
    const stopBtn = m.querySelector('#wb-stop');
    const zhChk = m.querySelector('#wb-zh');
    try { if (zhChk) zhChk.checked = localStorage.getItem('wordbank_readexpl') === '1'; } catch (e) {}
    if (zhChk) zhChk.onchange = () => { try { localStorage.setItem('wordbank_readexpl', zhChk.checked ? '1' : '0'); } catch (e) {} };
    function enSrcOf(w) { if (w.enAudio) { return w.enAudio.indexOf('?') === -1 && w.enAudio.indexOf('audio/') === 0 ? w.enAudio + '?v=' + ASSET_V : w.enAudio; } return 'audio/words/' + String(w.en).toLowerCase() + '_en.mp3?v=' + ASSET_V; }
    function zhSrcOf(w) { if (w.zhAudio) { return w.zhAudio.indexOf('?') === -1 && w.zhAudio.indexOf('audio/') === 0 ? w.zhAudio + '?v=' + ASSET_V : w.zhAudio; } return 'audio/words/' + String(w.en).toLowerCase() + '_zh.mp3?v=' + ASSET_V; }
    // 读完英文后按需读中文（带停顿，避免和英文重叠）
    function afterEn(w, withZh, cb) {
      if (withZh && w.zh) {
        const pause = 600 + Math.min(1800, String(w.en).length * 200);
        setTimeout(() => {
          const a = new Audio(zhSrcOf(w));
          let done = false;
          const fin = () => { if (done) return; done = true; cb(); };
          a.onended = fin;
          a.onerror = () => { stopSpeak(); speak(w.zh); setTimeout(fin, 1200); };
          const p = a.play(); if (p && p.catch) p.catch(() => { stopSpeak(); speak(w.zh); setTimeout(fin, 1200); });
        }, pause);
      } else cb();
    }
    function playOne(w, withZh, cb) {
      const a = new Audio(enSrcOf(w));
      let done = false;
      const fin = () => { if (done) return; done = true; afterEn(w, withZh, cb); };
      a.onended = fin;
      a.onerror = () => { stopSpeak(); speakEn(w.en); setTimeout(fin, 1200); };
      const p = a.play(); if (p && p.catch) p.catch(() => { stopSpeak(); speakEn(w.en); setTimeout(fin, 1200); });
    }
    let seqToken = 0;
    function startSeq() {
      const token = ++seqToken;
      const withZh = zhChk && zhChk.checked;
      playBtn.style.display = 'none'; stopBtn.style.display = '';
      let i = 0;
      (function step() {
        if (token !== seqToken) return;
        if (i >= list.length) { statusEl.textContent = '✅ 播放完毕，共 ' + list.length + ' 个单词'; statusEl.className = 'ex-feedback correct'; playBtn.style.display = ''; stopBtn.style.display = 'none'; return; }
        const w = list[i];
        statusEl.textContent = '▶ 播放中…（' + (i + 1) + '/' + list.length + '）：' + w.en;
        statusEl.className = 'ex-feedback';
        playOne(w, withZh, () => { i++; step(); });
      })();
    }
    function stopSeq() { seqToken++; statusEl.textContent = '⏸ 已停止'; statusEl.className = 'ex-feedback'; playBtn.style.display = ''; stopBtn.style.display = 'none'; }
    playBtn.onclick = startSeq;
    stopBtn.onclick = stopSeq;
    m.querySelectorAll('.word-chip').forEach((b) => {
      b.onclick = () => {
        const w = list.find((x) => String(x.en).toLowerCase() === b.dataset.en);
        if (w) { statusEl.textContent = '🔊 ' + w.en; playOne(w, zhChk && zhChk.checked, () => {}); }
      };
    });
    if (m.querySelector('#wb-close')) m.querySelector('#wb-close').onclick = hideModal;
  }

  // ===== 家长验证 / 家长解锁 =====
  function showModal(html) {
    $('#modal').innerHTML = html;
    $('#modal-mask').style.display = 'flex';
  }
  function hideModal() { $('#modal-mask').style.display = 'none'; }
  // 单文件播放（单词发音/解释）
  function playFile(src) {
    if (!src) return;
    if (src.indexOf('?') === -1 && src.indexOf('audio/') === 0) src = src + '?v=' + ASSET_V;
    try { const a = new Audio(src); a.play().catch(() => {}); } catch (e) {}
  }
  // ===== 单词本模块（小样）=====
  let lastWordsLesson = null;
  // 常用基础词（兜底）：日常高频、非专业术语，但编程里老用到。无本课/前面课单词时显示这些。
  const COMMON_WORDS = [
    { en: 'python', zh: 'Python，一种很好上手的编程语言，我们就是用它在电脑上学习的。', enAudio: 'audio/common/python_en.mp3', zhAudio: 'audio/common/python_zh.mp3' },
    { en: 'hello', zh: '你好。写程序的第一句常常是 print("hello")，在屏幕上打出"你好"。', enAudio: 'audio/common/hello_en.mp3', zhAudio: 'audio/common/hello_zh.mp3' },
    { en: 'name', zh: '名字。常用来练习：让电脑问你的名字，再把名字显示出来。', enAudio: 'audio/common/name_en.mp3', zhAudio: 'audio/common/name_zh.mp3' },
    { en: 'run', zh: '运行。点一下，让写好的程序跑起来。', enAudio: 'audio/common/run_en.mp3', zhAudio: 'audio/common/run_zh.mp3' },
    { en: 'play', zh: '玩、玩耍。也可以指播放声音或动画。', enAudio: 'audio/common/play_en.mp3', zhAudio: 'audio/common/play_zh.mp3' },
    { en: 'number', zh: '数字。比如 1、2、3，程序里经常用到。', enAudio: 'audio/common/number_en.mp3', zhAudio: 'audio/common/number_zh.mp3' },
    { en: 'color', zh: '颜色。红、蓝、绿都是颜色，画图时常用。', enAudio: 'audio/common/color_en.mp3', zhAudio: 'audio/common/color_zh.mp3' },
    { en: 'draw', zh: '画。用程序画出图形，比如一个圆、一个正方形。', enAudio: 'audio/common/draw_en.mp3', zhAudio: 'audio/common/draw_zh.mp3' }
  ];
  // 单词本范围：本课 + 之前所有课（绝不塞后面课的/不存在的词）
  function wordsScope(les) {
    const flat = flatLessons();
    const idx = flat.findIndex((l) => l.id === les.id);
    const scope = new Set();
    if (idx < 0) {
      (les.words || []).forEach((w) => scope.add(String(w.en).toLowerCase()));
    } else {
      for (let i = 0; i <= idx; i++) (flat[i].words || []).forEach((w) => scope.add(String(w.en).toLowerCase()));
    }
    return scope;
  }
  function openWords(les) {
    les = les || currentLesson || lastWordsLesson;
    if (!les) { toast('先在课里打开单词本吧～'); return; }
    lastWordsLesson = les;
    const scope = wordsScope(les);
    const bankMap = (window.VOCAB && VOCAB.bank()) || {};
    const keys = Object.keys(bankMap)
      .filter((k) => scope.has(k))
      .sort((a, b) => bankMap[a].order - bankMap[b].order);
    if (!keys.length) {
      // 实在没有本课/前面课的单词 → 兜底显示常用基础词（日常高频、非专业术语）
      let html = '<div class="words-modal"><h2>📕 单词本</h2>' +
        '<p class="wm-tip">这一节还没有专属单词，先记几个平时最常用到的词吧～</p>' +
        '<div class="wm-group"><h3>📗 常用基础词</h3><div class="word-grid">' +
        COMMON_WORDS.map(function (w) {
          return '<button class="word-chip" data-en="' + escapeHtml(String(w.en).toLowerCase()) + '">' + escapeHtml(w.en) + '</button>';
        }).join('') + '</div></div>' +
        '<div class="modal-actions"><button class="btn ghost" id="wm-close">关闭</button></div></div>';
      showModal(html);
      const m = document.getElementById('modal');
      m.querySelectorAll('.word-chip').forEach(function (b) {
        const w = COMMON_WORDS.find(function (c) { return String(c.en).toLowerCase() === b.dataset.en; });
        if (w) b.onclick = function () { openWordPractice(w); };
      });
      const c = m.querySelector('#wm-close'); if (c) c.onclick = hideModal;
      return;
    }
    // 本课新词 vs 前面课的复习词
    const newSet = new Set((les.words || []).map((w) => String(w.en).toLowerCase()));
    const due = [], fresh = [], learning = [], mastered = [];
    keys.forEach((k) => {
      if (newSet.has(k)) { fresh.push(k); return; }
      const icon = VOCAB.badge(k).icon;
      if (icon === '🔁') due.push(k);
      else if (icon === '✅') mastered.push(k);
      else learning.push(k);
    });
    function chips(arr) {
      return arr.map((k) => '<button class="word-chip" data-k="' + escapeHtml(k) + '"><span class="wc-badge">' +
        VOCAB.badge(k).icon + '</span>' + escapeHtml(bankMap[k].en) + '</button>').join('');
    }
    let html = '<div class="words-modal"><h2>📕 单词本</h2>' +
      '<p class="wm-tip">只显示这一节和前面学过的词，没学过的不凑数。🔁该复习 · 🆕新词 · 📖学习中 · ✅已掌握</p>';
    const courseWb = (window.VOCAB && VOCAB.wrongWords('course').length) || 0;
    html += '<div class="wm-group"><h3>❌ 课程错词本（' + courseWb + '）<button class="wm-practice" id="wm-course-wb">📖 专项练习</button></h3>' +
      '<p class="wm-tip" style="margin:0">在「练习对应词」里敲错的词会单独记到这里，和练字、听写的错词本分开。</p></div>';
    if (fresh.length) html += '<div class="wm-group"><h3>🆕 新学的词（' + fresh.length + '）<button class="wm-practice" data-keys="' + fresh.join(',') + '">🎯 练习对应词</button></h3><div class="word-grid">' + chips(fresh) + '</div></div>';
    if (due.length) html += '<div class="wm-group"><h3>🔁 该复习了（' + due.length + '）</h3><div class="word-grid">' + chips(due) + '</div></div>';
    if (learning.length) html += '<div class="wm-group"><h3>📖 学习中（' + learning.length + '）<button class="wm-practice" data-keys="' + learning.join(',') + '">🎯 练习对应词</button></h3><div class="word-grid">' + chips(learning) + '</div></div>';
    if (mastered.length) html += '<div class="wm-group"><h3>✅ 已掌握（' + mastered.length + '）</h3><div class="word-grid">' + chips(mastered) + '</div></div>';
    html += '<div class="modal-actions"><button class="btn ghost" id="wm-close">关闭</button></div></div>';
    showModal(html);
    const m = document.getElementById('modal');
    m.querySelectorAll('.word-chip').forEach((b) => { b.onclick = () => openWordPractice(bankMap[b.dataset.k], bankMap); });
    // 「练习对应词」：直接复用练字模块的打字练习，只练这一组词，记忆机制与练字完全对齐
    m.querySelectorAll('.wm-practice').forEach((b) => {
      b.onclick = () => {
        const ks = (b.dataset.keys || '').split(',').filter(Boolean);
        const words = ks.map((k) => { const w = bankMap[k]; return w ? { en: w.en, zh: w.zh, enAudio: w.enAudio, zhAudio: w.zhAudio } : null; }).filter(Boolean);
        if (!words.length) { toast('这些词暂时没法练习～'); return; }
        hideModal();
        runDrill(words, { kind: 'scope', mode: 'type', source: 'course', title: '🎯 练习对应词（' + words.length + ' 个）' });
      };
    });
    const c = m.querySelector('#wm-close'); if (c) c.onclick = hideModal;
    if (m.querySelector('#wm-course-wb')) m.querySelector('#wm-course-wb').onclick = () => openWrongBook('course');
  }
  function openWordPractice(w, bankMap) {
    bankMap = bankMap || (window.VOCAB && VOCAB.bank()) || {};
    // 敲打列表 = 当前词 + 本课范围内 Leitner 到期复习词（去重，最多4个），绝不塞后面课的
    const scope = wordsScope(lastWordsLesson || { words: [] });
    const curKey = String(w.en).toLowerCase();
    const practice = [curKey];
    ((window.VOCAB && VOCAB.dueReviews(new Set([curKey]), 4)) || []).forEach((k) => {
      if (scope.has(k) && practice.indexOf(k) < 0) practice.push(k);
    });
    const html = '<div class="word-practice">' +
      '<button class="wp-back" id="wp-back">← 返回单词本</button>' +
      '<div class="wp-word">' + escapeHtml(w.en) + '</div>' +
      '<div class="wp-btns"><button class="btn ghost" id="wp-en">🔊 听发音</button>' +
      '<button class="btn ghost" id="wp-zh">🔊 听解释</button></div>' +
      '<div class="wp-zh">' + escapeHtml(w.zh) + '</div>' +
      '<div class="wp-section"><h3>🎤 录音练习</h3><p>点"开始录音"，念出单词，再点"停止"，可以回放听自己的发音。</p>' +
      '<button class="btn" id="wp-read">🎤 开始录音</button>' +
      '<button class="btn ghost" id="wp-play" style="display:none">▶ 播放我的录音</button>' +
      '<div class="wp-result" id="wp-read-result">——</div></div>' +
      '<div class="wp-section"><h3>⌨️ 敲打练习</h3><p>把下面的单词都打出来（当前词 + 该复习的词；敲完按回车自动跳下一个框）：</p>' +
      '<div class="wp-type-list" id="wp-type-list"></div>' +
      '<button class="btn" id="wp-check-all">🔍 检查全部</button>' +
      '<div class="wp-result" id="wp-type-result">——</div></div>' +
      '<div class="modal-actions"><button class="btn ghost" id="wp-close2">关闭</button></div></div>';
    showModal(html);
    const m = document.getElementById('modal');
    if (m.querySelector('#wp-back')) m.querySelector('#wp-back').onclick = function () { openWords(lastWordsLesson); };
    if (m.querySelector('#wp-close2')) m.querySelector('#wp-close2').onclick = hideModal;
    const enBtn = m.querySelector('#wp-en'); if (enBtn) enBtn.onclick = () => playFile(w.enAudio);
    const zhBtn = m.querySelector('#wp-zh'); if (zhBtn) zhBtn.onclick = () => playFile(w.zhAudio);
    const typeList = m.querySelector('#wp-type-list');
    const typeRes = m.querySelector('#wp-type-result');
    if (typeList && practice.length) {
      practice.forEach(function (k) {
        const label = (bankMap[k] && bankMap[k].en) || (w && w.en) || k;
        const row = document.createElement('div');
        row.className = 'wp-type-row';
        row.innerHTML = '<span class="wp-type-en">' + escapeHtml(label) + '</span>' +
          '<input class="wp-input" data-en="' + escapeHtml(k) + '" autocomplete="off" spellcheck="false" placeholder="打这里…">' +
          '<span class="wp-type-fb"></span>';
        typeList.appendChild(row);
      });
      const inputs = Array.prototype.slice.call(typeList.querySelectorAll('.wp-input'));
      function checkOne(inp) {
        const en = inp.getAttribute('data-en');
        const val = (inp.value || '').trim().toLowerCase();
        const fb = inp.parentNode.querySelector('.wp-type-fb');
        if (!val) { if (fb) { fb.textContent = ''; fb.className = 'wp-type-fb'; } return false; }
        const ok = val === en;
        if (fb) { fb.textContent = ok ? '✅' : '❌'; fb.className = 'wp-type-fb ' + (ok ? 'ok' : 'wrong'); }
        if (window.VOCAB) VOCAB.answer(en, ok, 'course'); // 单词本敲打也回写记忆曲线（归入课程错词本）
        if (ok) playCorrect(); else playWrong();
        return ok;
      }
      inputs.forEach(function (inp, idx) {
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            checkOne(inp);
            const next = inputs[idx + 1];
            if (next) { next.focus(); }
            else {
              let all = true, done = 0;
              inputs.forEach(function (i2) { if ((i2.value || '').trim()) { done++; if (!checkOne(i2)) all = false; } });
              typeRes.textContent = done === inputs.length ? (all ? '🎉 全部打对啦！' : '有几处不对，红框再改改～') : '还有框没填呢～';
              typeRes.className = 'wp-result ' + (done === inputs.length && all ? 'ok' : 'wrong');
            }
          }
        });
        inp.addEventListener('blur', function () { if ((inp.value || '').trim()) checkOne(inp); });
      });
      const checkAll = m.querySelector('#wp-check-all');
      if (checkAll) checkAll.onclick = function () {
        let all = true, done = 0;
        inputs.forEach(function (i2) { if ((i2.value || '').trim()) { done++; if (!checkOne(i2)) all = false; } });
        typeRes.textContent = done === 0 ? '先打几个试试～' : (done === inputs.length ? (all ? '🎉 全部打对啦！' : '有几处不对，红框再改改～') : '还有框没填呢～');
        typeRes.className = 'wp-result ' + (done === inputs.length && all ? 'ok' : (done === 0 ? '' : 'wrong'));
      };
    }
    const readBtn = m.querySelector('#wp-read');
    const readRes = m.querySelector('#wp-read-result');
    const playBtn = m.querySelector('#wp-play');
    if (readBtn) readBtn.onclick = () => startOrStopRecording(readRes, readBtn, playBtn);
  }

  // ===== 单独练字模块：一次练完课程里所有单词 =====
  function collectAllWords() {
    const seen = new Set();
    const list = [];
    flatLessons().forEach((les) => {
      (les.words || []).forEach((w) => {
        const k = String((w && w.en) || '').toLowerCase();
        if (!k || seen.has(k)) return;
        seen.add(k);
        list.push(w);
      });
    });
    if (!list.length) list.push.apply(list, COMMON_WORDS);
    return list;
  }
  // 错词本来源模块的中文名（练习/听写/课程各自独立）
  const SRC_LABEL = { practice: '练习', dictate: '听写', course: '课程' };
  function openTypingDrill(mode) { runDrill(collectAllWords(), { kind: 'all', mode: mode || 'type', source: (mode === 'dictate' ? 'dictate' : 'practice') }); }
  function openWrongDrill(mode, source) {
    source = source || 'practice';
    const ww = (window.VOCAB && VOCAB.wrongWords(source)) || [];
    if (!ww.length) { toast('🎉 ' + SRC_LABEL[source] + '错词本空空如也，还没有敲错的词呢！'); return; }
    const words = ww.map((x) => ({ en: x.en, zh: x.zh, enAudio: x.enAudio, zhAudio: x.zhAudio }));
    runDrill(words, { kind: 'wrong', mode: mode || 'type', source: source });
  }
  // 通用打字练习核心：全部单词 / 错词本专项练习 共用同一套记忆机制（VOCAB.answer 回写 Leitner 记忆盒）
  function runDrill(words, opts) {
    opts = opts || {};
    const n = words.length;
    const resumeKey = opts.kind === 'all' ? 'course_drill_pos' : null;
    // 接着上次的位置继续（用单词英文小写作锚点，避免课程顺序变化导致错位）
    let wi = 0;
    try {
      if (resumeKey) {
        const saved = localStorage.getItem(resumeKey);
        if (saved) {
          const idx = words.findIndex((w) => String(w.en).toLowerCase() === saved);
          if (idx >= 0) wi = idx;
        }
      }
    } catch (e) {}
    let startTime = null, errChars = 0;
    let curEnAudio = null, _explainTimer = null;
    const resumeNote = resumeKey && wi > 0 ? '（接着上次的进度，从第 ' + (wi + 1) + ' 个继续）' : '';
    const isDictate = opts.mode === 'dictate';
    // 来源模块：决定错词记到哪个错词本（练习/听写/课程各自独立）
    const source = opts.source || (isDictate ? 'dictate' : 'practice');
    const title = opts.title || (opts.kind === 'wrong'
      ? (isDictate ? ('✍️ 听写 · 错词本（' + n + ' 个）') : ('❌ 错词本 · 专项练习（' + n + ' 个）'))
      : (isDictate ? ('✍️ 听写 · 全部单词（' + n + ' 个）') : ('⌨️ 练字 · 全部单词（' + n + ' 个）')));
    const tip = isDictate
      ? '只听发音、不显示拼写！每个词自动读出发音（默认就有），你照着听到的把它打出来。词是隐藏的，敲满长度才判定；敲错会闪一下正确答案再重听。可以勾选「读解释」让小光顺便读出中文意思。' + resumeNote
      : (opts.kind === 'wrong'
        ? '这些都是你之前敲错过、还没完全记住的词。照着敲出来，敲对自动跳下一个。每个词出现自动读发音。练到记住，它们就会自动离开错词本啦～' + resumeNote
        : '照着上面的单词，一个字母一个字母敲出来。敲对自动跳下一个，敲错会清空重敲。每个词出现时会自动读出发音并显示中文意思。' + resumeNote);
    const placeholder = isDictate ? '听一听，把单词打出来 ↑' : '在这里照着敲 ↑';
    const html =
      '<div class="drill-wrap">' +
        '<div class="drill-head">' + title + '</div>' +
        '<p class="drill-tip">' + tip + '</p>' +
        '<div class="typing-box">' +
          '<div class="typing-target" id="drill-target"></div>' +
          '<div class="drill-zh" id="drill-zh"></div>' +
          '<input class="typing-input" id="drill-input" autocomplete="off" spellcheck="false" placeholder="' + placeholder + '">' +
          '<div class="typing-progress" id="drill-prog"></div>' +
        '</div>' +
        '<div class="drill-audio"><button class="btn ghost" id="drill-hear">🔊 再听一次</button>' +
          '<button class="btn ghost" id="drill-wb">❌ 错词本</button></div>' +
        '<label class="drill-readexpl"><input type="checkbox" id="drill-readexpl"> 🔊 自动读解释（中文意思）</label>' +
        '<div class="ex-feedback" id="drill-fb">——</div>' +
        '<div class="modal-actions">' +
          '<button class="btn ghost" id="drill-again" style="display:none">🔄 再练一次</button>' +
          '<button class="btn ghost" id="drill-close">关闭</button>' +
        '</div>' +
      '</div>';
    showModal(html);
    const m = document.getElementById('modal');
    const targetEl = m.querySelector('#drill-target');
    const zhEl = m.querySelector('#drill-zh');
    const input = m.querySelector('#drill-input');
    const progEl = m.querySelector('#drill-prog');
    const fb = m.querySelector('#drill-fb');
    const hearBtn = m.querySelector('#drill-hear');
    // 计算一个词的最佳英文发音音频地址：优先用显式 enAudio，否则用 audio/words/<en>_en.mp3（真人发音）
    function wordEnSrc(w) {
      if (w.enAudio) {
        return w.enAudio.indexOf('?') === -1 && w.enAudio.indexOf('audio/') === 0 ? w.enAudio + '?v=' + ASSET_V : w.enAudio;
      }
      if (w.en) return 'audio/words/' + String(w.en).toLowerCase() + '_en.mp3?v=' + ASSET_V;
      return null;
    }
    function hear() {
      const w = words[wi];
      if (!w || !w.en) return;
      const src = wordEnSrc(w);
      if (src) voicePlayOnce('auto-en:' + String(w.en).toUpperCase(), src, null);
      else speakEn(w.en);
    }
    // 浏览器英语 TTS 兜底：音频文件缺失时也能读出发音
    function speakEn(text) {
      if (!('speechSynthesis' in window) || !text) return;
      stopSpeak();
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = 'en-US';
      const vs = speechSynthesis.getVoices() || [];
      const v = vs.find((x) => /male/i.test(x.name) && /^en(-|_)/i.test(x.lang)) ||
                vs.find((x) => /^en(-|_)/i.test(x.lang)) || vs.find((x) => /english/i.test(x.name)) || null;
      if (v) u.voice = v;
      u.rate = 0.9; u.pitch = 0.9;
      speechSynthesis.speak(u);
    }
    // 计算一个词的最佳中文解释发音地址：优先用显式 zhAudio，否则用 audio/words/<en>_zh.mp3（真人发音）
    function wordZhSrc(w) {
      if (w.zhAudio) {
        return w.zhAudio.indexOf('?') === -1 && w.zhAudio.indexOf('audio/') === 0 ? w.zhAudio + '?v=' + ASSET_V : w.zhAudio;
      }
      if (w.en) return 'audio/words/' + String(w.en).toLowerCase() + '_zh.mp3?v=' + ASSET_V;
      return null;
    }
    // 读中文解释：优先真人中文 mp3，缺失则浏览器中文 TTS（晓晓）兜底
    function readExplanation(w) {
      if (!readExplChk || !readExplChk.checked) return;
      if (!w || w !== words[wi] || !w.zh) return; // 词已切换或已过关，不再读旧解释
      const src = wordZhSrc(w);
      if (src) voicePlayOnce('auto-zh:' + String(w.en).toUpperCase(), src, null);
      else speak(w.zh);
    }
    // 显示一个新词：渲染字母 + 显示中文意思 + 播发音（单词出现时触发）
    // 读当前词：播发音 +（勾选「读解释」时）播中文解释。由「输入框聚焦」触发，
    // 第一个词收到光标定位后开始读，后面每个词切换（仍聚焦）时同理。
    function readCurrentWord() {
      const w = words[wi];
      if (!w) return;
      hear();
      if (readExplChk && readExplChk.checked && w.zh) {
        const pause = 600 + Math.min(1800, String(w.en).length * 200);
        clearTimeout(_explainTimer);
        _explainTimer = setTimeout(() => readExplanation(w), pause);
      }
    }
    function showWord() {
      if (wi >= n) return;
      const w = words[wi];
      clearTimeout(_explainTimer);
      if (isDictate) {
        zhEl.style.display = 'none';
        zhEl.classList.remove('reveal');
        renderMask(String(w.en), '');
      } else {
        if (w.zh) { zhEl.textContent = '📖 ' + w.zh; zhEl.style.display = ''; }
        else { zhEl.textContent = ''; zhEl.style.display = 'none'; }
        renderTarget();
      }
      // 收到光标定位（聚焦）后开始读单词与解释；若输入框已聚焦则直接读
      if (document.activeElement === input) readCurrentWord();
      else input.focus();
    }
    // 听写模式：隐藏正确拼写，只显示已敲字母 + 剩余占位（▪）
    function renderMask(w, val) {
      if (wi >= n) { targetEl.innerHTML = '🎉 全部完成！'; input.style.display = 'none'; progEl.textContent = ''; return; }
      let h = '';
      for (let i = 0; i < w.length; i++) {
        if (i < val.length) h += '<span class="t-char typed">' + escapeHtml(val[i]) + '</span>';
        else h += '<span class="t-char mask">▪</span>';
      }
      targetEl.innerHTML = h;
      progEl.textContent = wi < n ? ('进度 ' + (wi + 1) + '/' + n + ' · 听一听，把单词打出来') : '';
    }
    // 听写敲错：闪现正确答案 + 中文意思，再重听
    function revealFlash(w) {
      targetEl.innerHTML = '<span class="t-char bad reveal">' + escapeHtml(w) + '</span>';
      if (words[wi] && words[wi].zh) { zhEl.textContent = '📖 ' + words[wi].zh; zhEl.style.display = ''; zhEl.classList.add('reveal'); }
    }
    function renderTarget() {
      if (wi >= n) { targetEl.innerHTML = '🎉 全部完成！'; input.style.display = 'none'; progEl.textContent = ''; return; }
      const w = String(words[wi].en);
      const val = input.value;
      let h = '';
      for (let i = 0; i < w.length; i++) {
        let cls = 't-char';
        if (i < val.length) cls += (val[i].toUpperCase() === w[i].toUpperCase() ? ' ok' : ' bad');
        h += '<span class="' + cls + '">' + escapeHtml(w[i]) + '</span>';
      }
      targetEl.innerHTML = h;
      progEl.textContent = wi < n ? ('进度 ' + (wi + 1) + '/' + n + ' · 现在敲：' + w) : '';
    }
    function finish() {
      try { if (resumeKey) localStorage.removeItem(resumeKey); } catch (e) {}
      const timeSec = startTime ? (Date.now() - startTime) / 1000 : 0;
      const totalChars = words.reduce((a, w) => a + String(w.en).length, 0);
      const accuracy = totalChars ? Math.max(0, Math.round((1 - errChars / (totalChars + errChars)) * 100)) : 100;
      let extra = '';
      if (opts.kind === 'wrong') {
        const remain = (window.VOCAB && VOCAB.wrongWords(source).length) || 0;
        extra = remain > 0 ? ('<br>错词本还剩 ' + remain + ' 个没记牢，随时回来专项练习～') : '<br>🎉 错词本已经清空啦，你都记住了！';
      }
      fb.className = 'ex-feedback correct';
      fb.innerHTML = '🎉 全部练完！共 ' + n + ' 个词，用时 ' + timeSec.toFixed(1) + ' 秒，准确率 ' + accuracy + '%' + extra;
      if (m.querySelector('#drill-again')) m.querySelector('#drill-again').style.display = '';
      targetEl.innerHTML = '🎉 全部完成！';
      input.style.display = 'none';
      progEl.textContent = '';
      playCorrect();
    }
    input.addEventListener('input', () => {
      if (startTime === null && input.value.length > 0) startTime = Date.now();
      playClick();
      const w = String(words[wi].en);
      const val = input.value;
      if (isDictate) {
        // 听写：只听发音、词隐藏；敲满长度才判定，不足长度只更新占位
        if (val.length < w.length) { renderMask(w, val); return; }
        if (val.toUpperCase() === w.toUpperCase()) {
          if (window.VOCAB) VOCAB.answer(String(words[wi].en).toLowerCase(), true, source);
          wi++; input.value = '';
          playCorrect();
          if (wi >= n) { try { if (resumeKey) localStorage.removeItem(resumeKey); } catch (e) {} finish(); }
          else { try { if (resumeKey) localStorage.setItem(resumeKey, String(words[wi].en).toLowerCase()); } catch (e) {} showWord(); }
        } else {
          if (window.VOCAB) VOCAB.answer(String(words[wi].en).toLowerCase(), false, source);
          playWrong(); errChars += 1;
          revealFlash(w);                 // 闪现正确答案 + 中文意思
          input.value = '';
          setTimeout(() => {               // 1.4 秒后重听并恢复占位
            if (wi < n) { zhEl.style.display = 'none'; zhEl.classList.remove('reveal'); renderMask(w, ''); hear(); }
          }, 1400);
        }
        return;
      }
      if (val.toUpperCase() === w.toUpperCase()) {
        if (window.VOCAB) VOCAB.answer(String(words[wi].en).toLowerCase(), true, source);
        wi++; input.value = '';
        playCorrect();
        if (wi >= n) { try { if (resumeKey) localStorage.removeItem(resumeKey); } catch (e) {} finish(); }
        else { try { if (resumeKey) localStorage.setItem(resumeKey, String(words[wi].en).toLowerCase()); } catch (e) {} showWord(); }
        return;
      }
      if (val.length > 0 && !w.toUpperCase().startsWith(val.toUpperCase())) {
        if (window.VOCAB) VOCAB.answer(String(words[wi].en).toLowerCase(), false, source);
        playWrong();
        errChars += 1;
        input.value = '';
        renderTarget();
        return;
      }
      let err = 0;
      for (let i = 0; i < val.length; i++) if (val[i].toUpperCase() !== w[i].toUpperCase()) err++;
      errChars = err;
      renderTarget();
    });
    m.querySelector('#drill-close').onclick = hideModal;
    m.querySelector('#drill-again').onclick = () => {
      try { if (resumeKey) localStorage.removeItem(resumeKey); } catch (e) {}
      if (opts.kind === 'wrong') openWrongDrill(opts.mode, source);
      else if (opts.kind === 'scope') runDrill(words, opts);
      else openTypingDrill(opts.mode);
    };
    hearBtn.onclick = hear;
    if (m.querySelector('#drill-wb')) m.querySelector('#drill-wb').onclick = () => openWrongBook(source);
    // 「自动读解释」勾选框：记住用户选择，勾上后立刻读当前词解释
    const readExplChk = m.querySelector('#drill-readexpl');
    try { if (readExplChk) readExplChk.checked = localStorage.getItem('course_drill_readexpl') === '1'; } catch (e) {}
    if (readExplChk) readExplChk.onchange = () => {
      try { localStorage.setItem('course_drill_readexpl', readExplChk.checked ? '1' : '0'); } catch (e) {}
      if (readExplChk.checked) readExplanation(words[wi]);
    };
    // 先挂监听，再 showWord/聚焦：确保首个词在光标定位后也能读到（之前监听挂在 focus() 之后，首词不读）
    input.addEventListener('focus', () => { readCurrentWord(); });
    showWord();
    setTimeout(() => input.focus(), 60);
  }
  // ===== 错词本（按来源模块隔离）：自动收集某模块敲错的词，集中复习 =====
  function openWrongBook(source) {
    source = source || 'practice';
    const label = SRC_LABEL[source] || '练习';
    const ww = (window.VOCAB && VOCAB.wrongWords(source)) || [];
    if (!ww.length) {
      showModal('<div class="wrongbook-modal"><h2>❌ ' + label + '错词本</h2>' +
        '<p class="wb-tip">还没有在「' + label + '」里敲错的词，太棒了！🎉<br>在对应的练习里敲错的单词会自动进到这里，方便你集中复习（和听写、课程的错词本互不打扰）。</p>' +
        '<div class="modal-actions"><button class="btn ghost" id="wb-close">关闭</button></div></div>');
      const m = document.getElementById('modal');
      if (m.querySelector('#wb-close')) m.querySelector('#wb-close').onclick = hideModal;
      return;
    }
    function row(x) {
      const b = VOCAB.badge(x.k);
      return '<div class="wb-row">' +
        '<span class="wb-word">' + escapeHtml(x.en) + '</span>' +
        '<span class="wb-zh">' + escapeHtml(x.zh || '') + '</span>' +
        '<span class="wb-badge" title="' + escapeHtml(b.label) + '">' + b.icon + '</span>' +
        '<button class="btn ghost wb-hear" data-k="' + escapeHtml(x.k) + '" title="听发音">🔊</button>' +
        '<button class="btn ghost wb-remove" data-k="' + escapeHtml(x.k) + '">✕ 移出</button>' +
      '</div>';
    }
    const html = '<div class="wrongbook-modal"><h2>❌ ' + label + '错词本（' + ww.length + ' 个）</h2>' +
      '<p class="wb-tip">这些都是你在「' + label + '」里敲错过、还没完全记住的词（与听写、课程错词本分开）。点「专项练习」集中攻克，记住了就会自动离开这里。🔁该复习 · 📖学习中</p>' +
      '<div class="wb-list">' + ww.map(row).join('') + '</div>' +
      '<div class="modal-actions">' +
        '<button class="btn" id="wb-practice">▶ 专项练习</button>' +
        (source === 'dictate' ? '' : '<button class="btn ghost" id="wb-dictate">✍️ 听写</button>') +
        '<button class="btn ghost" id="wb-clear">🧹 清空错词本</button>' +
        '<button class="btn ghost" id="wb-close">关闭</button>' +
      '</div></div>';
    showModal(html);
    const m = document.getElementById('modal');
    m.querySelectorAll('.wb-hear').forEach((b) => {
      b.onclick = () => {
        const x = ww.find((q) => q.k === b.dataset.k);
        if (x && x.enAudio) playFile(x.enAudio);
      };
    });
    m.querySelectorAll('.wb-remove').forEach((b) => {
      b.onclick = () => { if (window.VOCAB) VOCAB.forgetWrong(b.dataset.k, source); openWrongBook(source); };
    });
    if (m.querySelector('#wb-practice')) m.querySelector('#wb-practice').onclick = () => openWrongDrill('type', source);
    if (m.querySelector('#wb-dictate')) m.querySelector('#wb-dictate').onclick = () => openWrongDrill('dictate', source);
    if (m.querySelector('#wb-clear')) m.querySelector('#wb-clear').onclick = () => {
      if (window.VOCAB) VOCAB.clearWrongBook(source);
      toast('🧹 已清空' + label + '错词本');
      openWrongBook(source);
    };
    if (m.querySelector('#wb-close')) m.querySelector('#wb-close').onclick = hideModal;
  }
  // 录音练习：录下自己的发音，可回放对比（MediaRecorder，比语音识别更稳、不依赖联网识别）
  let _mediaRecorder = null, _recChunks = [];
  function startOrStopRecording(resEl, recBtn, playBtn) {
    if (_mediaRecorder && _mediaRecorder.state === 'recording') { _mediaRecorder.stop(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      resEl.textContent = '⚠️ 当前浏览器不支持录音。请用 Chrome / Edge，并通过「双击打开」启动器起本地服务器打开（file:// 下麦克风常被拦）。';
      resEl.className = 'wp-result wrong';
      return;
    }
    resEl.textContent = '🎤 录音中…念出单词吧'; resEl.className = 'wp-result';
    recBtn.textContent = '⏹ 停止录音';
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      _mediaRecorder = new MediaRecorder(stream);
      _recChunks = [];
      _mediaRecorder.ondataavailable = function (e) { if (e.data && e.data.size) _recChunks.push(e.data); };
      _mediaRecorder.onstop = function () {
        const blob = new Blob(_recChunks, { type: _mediaRecorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        if (playBtn) { playBtn.style.display = ''; playBtn.onclick = function () { new Audio(url).play(); }; }
        const _pa = new Audio(url); _pa.play().catch(function () {}); // 停止后自动回放
        resEl.textContent = '✅ 录音完成！正在播放你的发音～（也可点"播放我的录音"重听）';
        resEl.className = 'wp-result ok';
        recBtn.textContent = '🎤 重新录音';
        stream.getTracks().forEach(function (t) { t.stop(); });
      };
      _mediaRecorder.start();
    }).catch(function (err) {
      resEl.textContent = '⚠️ 无法录音：' + (err && err.message ? err.message : err) + '（请允许麦克风，并用「双击打开」启动器起服务器打开）';
      resEl.className = 'wp-result wrong';
      recBtn.textContent = '🎤 开始录音';
    });
  }
  // 验证家长密码后执行 cb
  function promptPin(cb) {
    showModal(
      '<h3 class="modal-title">🔐 家长验证</h3>' +
      '<p class="modal-desc">请输入家长密码以继续。</p>' +
      '<input type="password" id="pin-input" class="pin-input" placeholder="家长密码" maxlength="20" autocomplete="off">' +
      '<div class="modal-actions"><button class="btn ghost" id="pin-cancel">取消</button>' +
      '<button class="btn" id="pin-ok">确定</button></div>' +
      '<div class="pin-err" id="pin-err"></div>'
    );
    const input = $('#pin-input');
    setTimeout(() => input.focus(), 50);
    $('#pin-cancel').onclick = hideModal;
    input.onkeydown = (e) => { if (e.key === 'Enter') $('#pin-ok').click(); };
    $('#pin-ok').onclick = () => {
      if (input.value === loadParentPin()) { hideModal(); cb(); }
      else { $('#pin-err').textContent = '密码错误，请重试'; input.value = ''; input.focus(); }
    };
  }
  // 卡片上的「家长解锁」
  function requestUnlock(les) {
    promptPin(() => {
      if (!progress[les.id]) progress[les.id] = {};
      progress[les.id].parentUnlocked = true;
      saveProgress(); renderHome(); updateProgress();
      toast('🔓 已解锁：' + les.title);
    });
  }
  // 家长面板折叠状态（跨重渲染保持）
  const ppCollapsed = { unlock: true, report: true };

  // ===== 进度导出 / 导入（换电脑、更新工具、备份用；不含激活记录，激活绑机器需重激活）=====
  const BACKUP_KEYS = [
    'course_progress_v1', 'course_parent_pin', 'course_child_name', 'course_voice_style',
    'course_badges', 'course_drill_pos', 'course_drill_readexpl', 'wordbank_readexpl', 'code_practice_done_v1'
  ];
  function exportProgress() {
    try {
      const out = {};
      BACKUP_KEYS.forEach(function (k) { const v = localStorage.getItem(k); if (v !== null) out[k] = v; });
      out.__meta = { app: 'course', v: 1, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = '我的课程进度.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast('进度已导出为「我的课程进度.json」');
    } catch (e) { toast('导出失败'); }
  }
  function importProgress(file) {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const obj = JSON.parse(String(reader.result));
        if (!obj || typeof obj !== 'object') { toast('文件格式不对'); return; }
        let n = 0;
        BACKUP_KEYS.forEach(function (k) { if (obj[k] !== undefined) { localStorage.setItem(k, obj[k]); n++; } });
        toast('已导入 ' + n + ' 项资料，即将刷新…');
        setTimeout(function () { location.reload(); }, 800);
      } catch (e) { toast('导入失败：文件不是有效的进度备份'); }
    };
    reader.onerror = function () { toast('读取文件失败'); };
    reader.readAsText(file);
  }
  function openParentPanel() { promptPin(showParentPanelContent); }
  function showParentPanelContent() {
    const flat = flatLessons();

    // 推荐解锁的下一课（折叠态用）：第一门还锁着的课
    const recUnlock = flat.find((l) => !isUnlocked(l)) || null;
    // 最近一课（学习报告折叠态用）：lastStudy 最新，回退到最后有记录的课
    let recLesson = null, recTs = 0;
    flat.forEach((l) => {
      const ts = (progress[l.id] || {}).lastStudy || 0;
      if (ts > recTs) { recTs = ts; recLesson = l; }
    });
    if (!recLesson) {
      for (let i = flat.length - 1; i >= 0; i--) {
        const rec = progress[flat[i].id] || {};
        if (rec.studyTime > 0 || rec.done || (rec.firstAttempts && Object.keys(rec.firstAttempts).length)) { recLesson = flat[i]; break; }
      }
      if (!recLesson) recLesson = flat[flat.length - 1];
    }

    // === 课程解锁状态：每一行 ===
    const rows = flat.map((l, i) => {
      const pu = isUnlocked(l);
      const done = !!(progress[l.id] && progress[l.id].done);
      let badge, bcls;
      if (done) { badge = '已完成'; bcls = 'st-done'; }
      else if (pu) { badge = '已解锁'; bcls = 'st-open'; }
      else { badge = '未解锁'; bcls = 'st-lock'; }
      return '<div class="pp-row">' +
        '<span class="pp-name">第 ' + (i + 1) + ' 课 · ' + escapeHtml(l.title) + '</span>' +
        '<span class="pp-badge ' + bcls + '">' + badge + '</span>' +
        '<button class="btn ' + (pu ? 'ghost' : '') + '" data-pu="' + l.id + '">' + (pu ? '锁定' : '解锁') + '</button>' +
      '</div>';
    }).join('');

    // 折叠态：推荐解锁摘要（带一键解锁）
    const unlockSummary = recUnlock
      ? ('推荐解锁：第 ' + (flat.indexOf(recUnlock) + 1) + ' 课 · ' + escapeHtml(recUnlock.title) +
         ' <button class="btn" data-pu-rec="' + recUnlock.id + '">解锁</button>')
      : '🎉 全部课程已解锁，孩子可以畅学啦！';

    // === 学习报告：每一行 ===
    const reportRows = flat.map((l, i) => {
      const rec = progress[l.id] || {};
      const t = fmtTime(rec.studyTime);
      const fa = rec.firstAttempts || {};
      const exs = l.exercises || [];
      let correct = 0, wrong = 0, viewed = 0, typed = 0;
      let marks = '';
      exs.forEach((ex, ei) => {
        const r = fa[ei];
        if (r === 'correct') { correct++; marks += '✅'; }
        else if (r === 'wrong') { wrong++; marks += '❌'; }
        else if (r === 'viewed') { viewed++; marks += '👁'; }
        else if (r === 'typed') { typed++; marks += '⌨️'; }
        else { marks += '—'; }
      });
      const answered = correct + wrong;
      const rate = answered ? Math.round((correct / answered) * 100) : null;
      const rateStr = rate === null ? '—' : (rate + '%（' + correct + '/' + answered + '）');
      const done = !!rec.done;
      const typing = rec.typing;
      const typingStr = typing ? (' ｜ ⌨️ 打字 ' + typing.timeSec + '秒 · ' + typing.accuracy + '%') : '';
      return '<div class="rp-row">' +
        '<div class="rp-head"><span class="rp-name">第' + (i + 1) + '课 · ' + escapeHtml(l.title) + '</span>' +
          (done ? '<span class="rp-done">✅已完成</span>' : '<span class="rp-undone">未完</span>') + '</div>' +
        '<div class="rp-meta">⏱ 学习 ' + t + ' ｜ 首答正确率 ' + rateStr + typingStr + '</div>' +
        (exs.length ? '<div class="rp-marks">每题首答：' + marks + (viewed ? '（👁=已看参考）' : '') + '</div>' : '<div class="rp-marks">本节无练习</div>') +
      '</div>';
    }).join('');

    // 折叠态：最近一课摘要
    const ri = flat.indexOf(recLesson);
    const rrec = progress[recLesson.id] || {};
    const rfa = rrec.firstAttempts || {};
    const rexs = recLesson.exercises || [];
    let rc = 0, rw = 0;
    rexs.forEach((ex, ei) => { const r = rfa[ei]; if (r === 'correct') rc++; else if (r === 'wrong') rw++; });
    const rAns = rc + rw;
    const rRate = rAns ? Math.round((rc / rAns) * 100) + '%' : '—';
    const reportSummary = '最近一课：第 ' + (ri + 1) + ' 课 · ' + escapeHtml(recLesson.title) +
      ' — ' + (rrec.done ? '✅ 已完成' : '进行中') + ' ｜ 首答正确率 ' + rRate + ' ｜ 学习 ' + fmtTime(rrec.studyTime || 0);

    const chev = (c) => '<span class="pp-chev">' + (c ? '▸' : '▾') + '</span>';
    const secUnlock = ppCollapsed.unlock
      ? '<div class="pp-summary">' + unlockSummary + '</div>'
      : '<div class="pp-body">' + rows + '</div>';
    const secReport = ppCollapsed.report
      ? '<div class="pp-summary">' + reportSummary + '</div>'
      : '<div class="pp-body">' + reportRows + '</div>';

    showModal(
      '<button class="modal-x" id="pp-x" aria-label="关闭">✕</button>' +
      '<h3 class="modal-title">' + ICON.family + '家长面板</h3>' +
      // 孩子昵称（最前）
      '<div class="pp-section pp-theme-nick">' +
        '<div class="pp-h"><span class="pp-ico">' + ICON.nick + '</span>孩子昵称</div>' +
        '<input type="text" id="nick-input" class="pin-input" placeholder="例如：宝贝" value="' + escapeHtml(loadNick()) + '" maxlength="12" style="margin-bottom:8px">' +
        '<button class="btn" id="nick-save">保存昵称</button>' +
      '</div>' +
      // 语音风格（已删备注，放昵称后）
      '<div class="pp-section pp-theme-style">' +
        '<div class="pp-h"><span class="pp-ico">' + ICON.style + '</span>语音风格</div>' +
        '<div class="style-pick">' +
          STYLES.map((s) => '<button class="style-opt' + (loadStyle() === s.id ? ' on' : '') + '" data-style="' + s.id + '">' + s.label + '</button>').join('') +
        '</div>' +
      '</div>' +
      // 课程解锁状态（可折叠）
      '<div class="pp-section pp-theme-unlock">' +
        '<div class="pp-h collapsible" data-sec="unlock">' + chev(ppCollapsed.unlock) + '<span class="pp-ico">' + ICON.unlock + '</span>课程解锁状态</div>' +
        secUnlock +
      '</div>' +
      // 学习报告（可折叠）
      '<div class="pp-section pp-theme-report">' +
        '<div class="pp-h collapsible" data-sec="report">' + chev(ppCollapsed.report) + '<span class="pp-ico">' + ICON.report + '</span>学习报告</div>' +
        secReport +
      '</div>' +
      // 修改家长密码
      '<div class="pp-section pp-theme-pwd">' +
        '<div class="pp-h"><span class="pp-ico">' + ICON.pwd + '</span>修改家长密码</div>' +
        '<input type="password" id="pin-old" class="pin-input" placeholder="当前密码" autocomplete="off">' +
        '<input type="password" id="pin-new" class="pin-input" placeholder="新密码（留空=不修改）" autocomplete="off">' +
        '<button class="btn" id="pin-change">保存密码</button>' +
      '</div>' +
      // 数据备份（导出 / 导入进度）
      '<div class="pp-section pp-backup">' +
        '<div class="pp-h"><span class="pp-ico">' + ICON.backup + '</span>数据备份（换电脑 / 更新工具不丢进度）</div>' +
        '<div class="pp-backup-btns">' +
          '<button class="btn" id="pp-export">' + ICON.export + '导出进度</button>' +
          '<button class="btn" id="pp-import">' + ICON.import + '导入进度</button>' +
        '</div>' +
        '<p class="pp-tip-sm">导出会生成「我的课程进度.json」，存到U盘或网盘；换设备后点「导入进度」选它即可恢复。激活状态绑定本机，换设备需重新激活。</p>' +
        '<input type="file" id="pp-import-file" accept="application/json,.json" style="display:none">' +
      '</div>' +
      '<div class="modal-actions"><button class="btn ghost" id="pp-close">关闭</button></div>'
    );
    $('#pp-close').onclick = hideModal;
    const ppX = $('#pp-x');
    if (ppX) ppX.onclick = hideModal;
    $('#pin-change').onclick = () => {
      const old = $('#pin-old').value, nw = $('#pin-new').value.trim();
      if (old !== loadParentPin()) { toast('当前密码错误'); return; }
      if (nw) { saveParentPin(nw); toast('密码已更新'); } else { toast('密码未更改'); }
      hideModal();
    };
    const nickSave = $('#nick-save');
    if (nickSave) nickSave.onclick = () => {
      const raw = ($('#nick-input').value || '').trim();
      if (RESERVED_NICKS.includes(raw)) { toast('这个昵称是向导' + GUIDE_NAME + '的，不能用哦～换一个吧'); return; }
      saveNick(raw);
      toast('昵称已设为：' + childName());
      renderHome(); // 首页欢迎语立即刷新
    };
    // 进度导出 / 导入
    const expBtn = $('#pp-export');
    if (expBtn) expBtn.onclick = exportProgress;
    const impBtn = $('#pp-import');
    if (impBtn) impBtn.onclick = () => { const f = $('#pp-import-file'); if (f) f.click(); };
    const impFile = $('#pp-import-file');
    if (impFile) impFile.onchange = () => {
      if (impFile.files && impFile.files[0]) importProgress(impFile.files[0]);
      impFile.value = '';
    };
    $('#modal').querySelectorAll('.style-opt').forEach((b) => {
      b.onclick = () => {
        saveStyle(b.dataset.style);
        const lab = (STYLES.find((s) => s.id === b.dataset.style) || {}).label || '';
        toast('语音风格已切换为：' + lab);
        showParentPanelContent(); // 重渲染，刷新选中态
      };
    });
    // 折叠标题：点击切换
    $('#modal').querySelectorAll('.pp-h.collapsible').forEach((h) => {
      h.onclick = () => { ppCollapsed[h.dataset.sec] = !ppCollapsed[h.dataset.sec]; showParentPanelContent(); };
    });
    // 折叠态：一键解锁推荐课（解锁后自动推荐下一课）
    const recBtn = $('#modal').querySelector('[data-pu-rec]');
    if (recBtn) recBtn.onclick = () => {
      const id = recBtn.dataset.puRec;
      if (!progress[id]) progress[id] = {};
      progress[id].parentUnlocked = true;
      saveProgress();
      showParentPanelContent();
      renderHome(); updateProgress();
    };
    // 展开态：逐行解锁/锁定
    $('#modal').querySelectorAll('button[data-pu]').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.pu;
        if (!progress[id]) progress[id] = {};
        progress[id].parentUnlocked = !progress[id].parentUnlocked;
        saveProgress();
        showParentPanelContent(); // 重新渲染本面板
        renderHome(); updateProgress();
      };
    });
  }

  function openLesson(les) {
    stopSpeak();
    accumulateStudyTime(); // 结算上一课的学习时长
    currentLesson = les;
    lessonStartTime = Date.now();
    ensureLessonRecord(les.id);
    persistOpen(les.id); // 记住当前打开的课，刷新后自动恢复
    const lv = $('#lesson-view');
    lv.style.display = 'block';
    $('#home-view').style.display = 'none';
    lv.innerHTML = '<button class="back-btn" id="back-btn">← 返回</button><div class="lesson-inner" id="lesson-inner"></div>';
    $('#back-btn').onclick = () => {
      stopSpeak();
      accumulateStudyTime();
      const s = loadSession(); s.openId = null; if (s.drafts) delete s.drafts[les.id]; if (s.scroll) delete s.scroll[les.id]; writeSession(s);
      lv.style.display = 'none';
      $('#home-view').style.display = 'block';
      renderHome();
      updateProgress();
    };
    renderLessonContent(les, lv.querySelector('#lesson-inner'));
  }

  // 把「小光讲一讲」的文案显示成字幕，并支持按钮切换显示/隐藏（避免重复标题）
  function toggleTalk(lid, btn) {
    const box = document.getElementById('talk-box');
    if (!box) return;
    if (box.style.display === 'block') {
      box.style.display = 'none';
      btn.innerHTML = '🔊 ' + GUIDE_NAME + '讲一讲 · 看字幕';
      stopVoiceAudio();
      return;
    }
    const arr = (window.LESSON_TALK && window.LESSON_TALK[lid]) || [];
    if (!arr.length) { box.style.display = 'none'; return; }
    box.innerHTML = '<div class="talk-head">📋 字幕全文</div>' +
      '<div class="talk-body">' + arr.map(function (t) { return '<p>' + escapeHtml(t) + '</p>'; }).join('') + '</div>';
    box.style.display = 'block';
    btn.innerHTML = '🔇 收起字幕';
  }

  function renderLessonContent(les, c) {
    let html = '<h1 class="lesson-title">' + escapeHtml(les.title) + '</h1>';

    if (les.video) {
      html += '<div class="video-box"><video controls preload="metadata" src="' + les.video + '?v=' + ASSET_V + '"></video>' +
        (les.videoCaption ? '<div class="video-caption">' + escapeHtml(les.videoCaption) + '</div>' : '') +
        '<div class="video-fallback" id="video-fallback" style="display:none">📹 本节视频：把文件 <code>' +
        escapeHtml(les.video) + '</code> 放进 <code>video/</code> 文件夹即可播放。</div></div>';
    }
    // 小光讲一讲（总结/发散真人语音 + 字幕）：与视频解耦，纯图文课更要它，故无论有无视频都渲染
    if (!les.forParent) {
      html += '<div class="read-bar"><button class="speak-btn" id="speak-video">🔊 ' + GUIDE_NAME + '讲一讲 · 看字幕</button></div>' +
        '<div class="talk-box" id="talk-box" style="display:none"></div>';
    }

    if (les.markdown && les.markdown.trim()) {
      html += '<div class="read-bar"><button class="speak-btn" id="speak-lecture">🔊 朗读讲义</button></div>';
    }
    html += '<div class="lecture">' + (window.MD ? window.MD.render(les.markdown) : '<pre>' + escapeHtml(les.markdown || '') + '</pre>') + '</div>';
    // 总结课/毕业课的「鼓励引导 + 发勋章提示」：按家长所选风格出话（亲切/幽默/毒舌）
    if (les.encourage && les.encourage[loadStyle()]) {
      html += '<div class="encourage-box">' + (window.MD ? window.MD.render(les.encourage[loadStyle()]) : '<p>' + escapeHtml(les.encourage[loadStyle()]) + '</p>') + '</div>';
    }
    if (les.figures && les.figures.length) {
      html += '<div class="figures">';
      les.figures.forEach(function (f) {
        var fn = window.FIGURES && window.FIGURES[f.key];
        if (fn) html += '<figure class="figure">' + fn() + '<figcaption>' + escapeHtml(f.caption || '') + '</figcaption></figure>';
      });
      html += '</div>';
    }

    // 梗王小结：把 takeaway 渲染成"💡 小光敲黑板"高亮块
    if (les.takeaway && les.takeaway.trim()) {
      html += '<div class="takeaway-box"><div class="takeaway-head">💡 小光敲黑板</div>' +
        '<div class="takeaway-body">' + escapeHtml(les.takeaway) + '</div>' +
        '<div class="read-bar"><button class="speak-btn" id="speak-takeaway">🔊 朗读小结</button></div></div>';
    }

    // 动手任务清单：带本地勾选持久化
    if (les.tasks && les.tasks.length) {
      const tkey = 'tasks_v1_' + les.id;
      let done = {};
      try { done = JSON.parse(localStorage.getItem(tkey) || '{}'); } catch (e) { done = {}; }
      html += '<div class="lesson-tasks"><div class="tasks-head">🛠️ 本节动手任务（' + les.tasks.length + '）</div><ul class="task-list">';
      les.tasks.forEach(function (t, i) {
        const checked = done[i] ? 'checked' : '';
        html += '<li class="task-item' + (done[i] ? ' done' : '') + '">' +
          '<label><input type="checkbox" class="task-check" data-i="' + i + '" ' + checked + '> ' +
          '<span>' + escapeHtml(t) + '</span></label></li>';
      });
      html += '</ul><div class="tasks-progress" id="tasks-progress"></div></div>';
    }

    if (les.code) {
      html += '<div class="code-playground"><div class="cp-head"><span>🧪 试一试：真跑代码</span><button class="btn ghost sm" id="run-code-btn">▶ 运行</button></div><textarea class="cp-input" id="cp-input" spellcheck="false">' + escapeHtml(les.code) + '</textarea><canvas id="cp-canvas" width="440" height="240" style="display:none;width:100%;max-width:440px;height:240px;background:#fff;border:2px solid #c8d6f0;border-radius:12px;margin:8px 0"></canvas><pre class="cp-output" id="cp-output">点"运行"看结果～</pre></div>';
    }
    // 课程内单词入口：跟随课程，点开看本课新词 + 该复习的词
    if (!les.forParent) html += '<div class="lesson-words"><button class="speak-btn" id="lesson-words-btn">📕 本节单词</button></div>';
    if (!les.forParent) {
      if (les.exercises && les.exercises.length) {
        html += '<div class="exercises"><h2>📝 练习</h2><div id="ex-list"></div>' +
          '<div class="submit-lesson" id="submit-bar" style="display:none">' +
          '<div class="submit-hint">' + pickEval('submitHint', loadStyle()) + '</div>' +
          '<button class="btn" id="submit-lesson-btn">🎉 提交本节</button></div>' +
          '</div>';
      } else {
        // 无练习的课：提供「完成本节」按钮（避免后面关卡卡死）
        const alreadyDone = progress[les.id] && progress[les.id].done;
        html += '<div class="finish-lesson">' +
          (alreadyDone
            ? '<span class="finish-done">✅ 本节已完成</span>'
            : '<button class="btn" id="finish-lesson">✅ 完成本节</button>') +
          '</div>';
      }
    }
    if (!les.forParent) html += '<div class="report-row"><button class="btn ghost" id="report-btn">🔊 听听我的学习成果</button></div>';
    c.innerHTML = html;
    const runBtn = c.querySelector('#run-code-btn');
    if (runBtn) runBtn.onclick = function () {
      const out = c.querySelector('#cp-output');
      const cv = c.querySelector('#cp-canvas');
      const code = c.querySelector('#cp-input').value;
      if (isTurtleCode(code) && cv) {
        cv.style.display = 'block';
        turtleDraw(code, cv, out);
      } else {
        if (cv) cv.style.display = 'none';
        runUserCode(code, out);
      }
    };
    const rbtn = c.querySelector('#report-btn');
    if (rbtn) rbtn.onclick = function () { playLearningReport(les, rbtn); };
    const lwbtn = c.querySelector('#lesson-words-btn');
    if (lwbtn) lwbtn.onclick = function () { openWords(les); };

    // 任务清单勾选持久化
    const tkey = 'tasks_v1_' + les.id;
    const checks = c.querySelectorAll('.task-check');
    function updTaskProgress() {
      const prog = c.querySelector('#tasks-progress');
      if (!prog) return;
      let n = 0;
      checks.forEach(function (ck) { if (ck.checked) n++; });
      prog.textContent = '已搞定 ' + n + ' / ' + checks.length + (n === checks.length && checks.length ? ' 🎉' : '');
    }
    if (checks.length) {
      let done = {};
      try { done = JSON.parse(localStorage.getItem(tkey) || '{}'); } catch (e) { done = {}; }
      checks.forEach(function (ck) {
        ck.onchange = function () {
          done[ck.getAttribute('data-i')] = ck.checked;
          localStorage.setItem(tkey, JSON.stringify(done));
          ck.closest('.task-item').classList.toggle('done', ck.checked);
          updTaskProgress();
        };
      });
      updTaskProgress();
    }
    const stb = c.querySelector('#speak-takeaway');
    if (stb) stb.onclick = function () {
      if (!currentLesson) return;
      const map = window.AUDIO_MAP && window.AUDIO_MAP[currentLesson.id];
      if (map && map.takeaway) {
        voicePlayOnce('takeaway:' + currentLesson.id, learnSegAlt(map.takeaway), stb); // 真人男生声
        return;
      }
      speak(currentLesson.takeaway || '', stb); // 兜底：无预生成语音时用浏览器 TTS
    };

    if (les.video) {
      const v = c.querySelector('.video-box video');
      if (v) {
        v.addEventListener('error', () => {
          v.style.display = 'none';
          const fb = c.querySelector('#video-fallback');
          if (fb) fb.style.display = 'block';
        });
        // 视频一开始播放，就暂停任何正在响的语音（视频优先，但语音不再叠着放）
        v.addEventListener('play', stopVoiceAudio);
      }
      const sv = c.querySelector('#speak-video');
      if (sv) sv.onclick = () => {
        if (!currentLesson) return;
        // 讲一讲 = 向导小光的「总结/发散」真人语音（与视频详细讲解不重复），按家长所选风格播放
        // 同时把文案显示在「看字幕」框里：有些知识点太专业，听一遍跟不上，看着字幕更好懂
        toggleTalk(currentLesson.id, sv);
        // 只有在展开字幕时才播放语音；收起时上面已经停止
        if (document.getElementById('talk-box').style.display === 'block') {
          // 回退：风格文件尚在生成时，用已存在的 narrate.mp3（gentle 内容）
          startVoice('audio/' + currentLesson.id + '/narrate.mp3?v=' + ASSET_V, sv);
        }
      };
    }
    if (!les.forParent && les.exercises && les.exercises.length) {
      renderExercises(les.exercises, c);
      const exWrap = c.querySelector('#ex-list');
      if (exWrap) restoreExDrafts(exWrap, les); // 刷新后把已填答案填回
      const sb = c.querySelector('#submit-lesson-btn');
      if (sb) sb.onclick = () => {
        const lesId = currentLesson.id;
        if (progress[lesId] && progress[lesId].done) return; // 已提交过，避免重复播报
        const lesObj = findLesson(lesId);
        const state = evalStateOf(lesObj);
        if (state === 'notDone') {
          toast(pickEval('notDone', loadStyle()));
          return;
        }
        const pr = progress[lesId] || {};
        const skippedKeys = Object.keys(pr.exSkipped || {});
        try {
          ensureLessonRecord(lesId);
          progress[lesId].done = true;
          saveProgress(); updateProgress();
          awardIfNeeded(lesObj); // 只有全部做对（含补做）才授勋章
          const bar = c.querySelector('#submit-bar');
          if (bar) { bar.innerHTML = '<span class="finish-done">✅ 本节已提交</span>'; bar.style.display = 'block'; }
          launchConfetti();
          if (skippedKeys.length > 0) {
            toast('⏭ 还有 ' + skippedKeys.length + ' 题待补做，补做完就能拿勋章～', 4800);
          } else if (lesObj.award) {
            toast(pickAwardMsg(lesObj.award), 4800);
          } else {
            toast(pickEval(evalStateOf(lesObj), loadStyle()) + ' 叫家长来解锁下一课吧～');
          }
          // 第一次提交全部作业：先播分级鼓励，再播「学习成果后面那段」全对夸奖（仅此刻播，平时不播）
          const encQ = [{ src: vfile('common/enc_' + getLevel(getDoneCount())), pause: 'short' }];
          if (window.AUDIO_LEARN && window.AUDIO_LEARN.allCorrect) encQ.push(learnSeg(window.AUDIO_LEARN.allCorrect));
          startQueue(encQ, null, 'enc');
        } catch (e) {
          console.error('提交本节失败', e);
          toast('提交时出小差了，再点一次试试～');
        }
      };
    }
    const fl = c.querySelector('#finish-lesson');
    if (fl) fl.onclick = () => {
      ensureLessonRecord(les.id);
      progress[les.id].done = true;
      saveProgress(); updateProgress();
      awardIfNeeded(les); // 总结课/毕业课完成 → 授予勋章（不重复）
      launchConfetti();
      if (les.award) {
        toast(pickAwardMsg(les.award), 4800);
      } else {
        toast(pickEval(evalStateOf(les), loadStyle()) + ' 叫家长来解锁下一课吧～');
      }
      startVoice(vfile('common/enc_' + getLevel(getDoneCount()))); // 鼓励语音(按风格)
      renderLessonContent(les, c);
    };
    const sl = c.querySelector('#speak-lecture');
    if (sl) sl.onclick = () => {
      if (!currentLesson) return;
      const map = window.AUDIO_MAP && window.AUDIO_MAP[currentLesson.id];
      if (map && map.lecture && map.lecture.length) {
        voicePlaySeq('lecture:' + currentLesson.id, map.lecture, sl);
        return;
      }
      speak(stripMarkdown(les.markdown || ''), sl);
    };

    if (!progress[les.id]) progress[les.id] = {};
    progress[les.id].viewed = true;
    saveProgress();
    // 重进课时：若所有题都已做完或跳过（无待处理），恢复「提交本节」按钮
    if (les.exercises && les.exercises.length) {
      const pr = progress[les.id] || {};
      const total = les.exercises.length;
      const doneCount = Object.keys(pr.exDone || {}).length;
      const skipCount = Object.keys(pr.exSkipped || {}).length;
      if (total > 0 && !pr.done && (doneCount + skipCount) >= total) {
        const bar = c.querySelector('#submit-bar');
        if (bar) bar.style.display = 'block';
      }
    }
    refreshScrollFab();
    setTimeout(refreshScrollFab, 250); // 视频/字体晚加载后再次校准
    restoreScroll(); // 刷新后恢复到原来的滚动位置
  }

  function shuffleArray(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }

  // 根据 skipped 状态设置「放弃/撤销」按钮文案与高亮
  function setSkipBtnState(btn, skipped) {
    if (!btn) return;
    btn.textContent = skipped ? '↩ 撤销放弃' : '⏭ 放弃';
    btn.classList.toggle('skip-active', !!skipped);
  }
  // 刷新「提交本节」按钮：所有题都已做完或跳过（无待处理）时才显示
  function refreshSubmitBar() {
    if (!currentLesson) return;
    const les = currentLesson;
    if (les.forParent || !les.exercises || !les.exercises.length) return;
    const pr = progress[les.id] || {};
    const total = les.exercises.length;
    const doneCount = Object.keys(pr.exDone || {}).length;
    const skipCount = Object.keys(pr.exSkipped || {}).length;
    const bar = document.getElementById('submit-bar');
    if (!bar) return;
    if (!pr.done && total > 0 && (doneCount + skipCount) >= total) {
      bar.style.display = 'block';
    }
  }

  function renderExercises(exs, container) {
    const wrap = container.querySelector('#ex-list');
    wrap.innerHTML = '';
    // 待补做横幅：之前跳过的题还没补做完
    const pr0 = progress[currentLesson.id] || {};
    const skippedN = Object.keys(pr0.exSkipped || {}).length;
    if (skippedN > 0) {
      const banner = document.createElement('div');
      banner.className = 'ex-makeup-banner';
      banner.innerHTML = '⏭ 你有 <b>' + skippedN + '</b> 题待补做，做完就能拿勋章（标了「↩ 撤销放弃」的题直接做对即可补做）';
      wrap.appendChild(banner);
    }
    exs.forEach((ex, idx) => {
      const box = document.createElement('div');
      box.className = 'ex';
      box.dataset.idx = idx;
      box.dataset.type = ex.type;
      let inner = '<div class="ex-q"><b>题' + (idx + 1) + '.</b> ' + escapeHtml(ex.question) +
        ' <button class="speak-btn sm" data-act="speak-q" data-idx="' + idx + '" title="朗读题目">🔊</button></div>';
      if (ex.type === 'choice') {
        inner += '<div class="ex-opts">';
        ex.options.forEach((opt, oi) => {
          inner += '<label class="opt"><input type="radio" name="ex' + idx + '" value="' + oi + '"> ' + escapeHtml(opt) + '</label>';
        });
        inner += '</div><button class="btn submit" data-act="check-choice" data-idx="' + idx + '">提交</button> <button class="btn ghost" data-act="reset-ex" data-idx="' + idx + '">🔄 重置</button>';
      } else if (ex.type === 'fill') {
        inner += '<input type="text" class="ex-input" placeholder="输入答案"><button class="btn submit" data-act="check-fill" data-idx="' + idx + '">提交</button> <button class="btn ghost" data-act="reset-ex" data-idx="' + idx + '">🔄 重置</button>';
      } else if (ex.type === 'open') {
        inner += '<textarea class="ex-textarea" placeholder="写下你的想法…"></textarea><button class="btn submit" data-act="show-open" data-idx="' + idx + '">看参考答案</button> <button class="btn ghost" data-act="reset-ex" data-idx="' + idx + '">🔄 重置</button>';
      } else if (ex.type === 'order') {
        const shuffled = shuffleArray(ex.steps);
        if (shuffled.length > 1 && shuffled.every((s, i) => s === ex.steps[i])) {
          [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
        }
        inner += '<div class="order-tip">👉 按正确顺序，一个一个<strong>点下面的步骤</strong>，它们会排到下面的框里；全部排好后点【检查顺序】。</div>';
        inner += '<div class="order-label">🟦 可以点的步骤：</div>';
        inner += '<div class="order-pool" id="order-pool-' + idx + '">';
        shuffled.forEach((s) => { inner += '<button class="order-item">' + escapeHtml(s) + '</button>'; });
        inner += '</div>';
        inner += '<div class="order-label">🟩 你排的顺序（从上到下）：</div>';
        inner += '<div class="order-done" id="order-done-' + idx + '"><span class="order-placeholder">排好的步骤会出现在这里 ↑</span></div>';
        inner += '<div class="order-actions"><button class="btn submit" data-act="check-order" data-idx="' + idx + '">检查顺序</button> <button class="btn ghost" data-act="reset-order" data-idx="' + idx + '">🔄 重置</button></div>';
      } else if (ex.type === 'typing') {
        inner += '<div class="typing-box" id="typing-' + idx + '">' +
          '<div class="typing-target" id="typ-target-' + idx + '"></div>' +
          '<div class="word-card" id="word-card-' + idx + '"></div>' +
          '<input type="text" class="typing-input" id="typ-input-' + idx + '" autocomplete="off" spellcheck="false" placeholder="在这里照着敲 ↑">' +
          '<div class="typing-progress" id="typ-prog-' + idx + '"></div>' +
          '<label class="drill-readexpl typ-readexpl"><input type="checkbox" id="typ-readexpl-' + idx + '"> 🔊 自动读解释（中文意思）</label></div>';
      } else if (ex.type === 'coding') {
        inner += '<div class="ex-code-wrap">' +
          '<textarea class="ex-code-input" id="ex-code-' + idx + '" spellcheck="false" placeholder="在这里写 Python 代码…">' + escapeHtml(ex.starter || '') + '</textarea>' +
          '<div class="ex-code-actions">' +
          '<button class="btn submit" data-act="run-code-ex" data-idx="' + idx + '">▶ 运行代码</button>' +
          '<button class="btn ghost" data-act="reset-code-ex" data-idx="' + idx + '">🔄 重置代码</button>' +
          (ex.expect ? '' : '<button class="btn ghost" data-act="done-coding" data-idx="' + idx + '">标记完成</button>') +
          '</div>' +
          '<canvas class="ex-code-canvas" id="ex-cv-' + idx + '" width="260" height="200" style="display:none"></canvas>' +
          '<pre class="ex-code-output" id="ex-out-' + idx + '">点"运行代码"看结果～</pre></div>';
      } else if (ex.type === 'tap') {
        const allowMulti = !!ex.multi;
        inner += '<div class="tap-tip">👉 ' + (allowMulti ? '本题可以选多个，把对的都点出来；' : '本题只有一个对的，') + '点下面的卡片选答案，再点【检查】。</div>';
        inner += '<div class="tap-opts" id="tap-opts-' + idx + '" data-multi="' + (allowMulti ? 1 : 0) + '">';
        ex.options.forEach((opt, oi) => {
          inner += '<button type="button" class="tap-card" data-val="' + oi + '">' + escapeHtml(opt) + '</button>';
        });
        inner += '</div><button class="btn submit" data-act="check-tap" data-idx="' + idx + '">检查</button> <button class="btn ghost" data-act="reset-ex" data-idx="' + idx + '">🔄 重置</button>';
      }
      // 非 typing/coding 题型加"放弃"按钮（跳过本题，复习时可补做）
      if (ex.type !== 'typing' && ex.type !== 'coding') {
        inner += '<button class="btn ghost skip-btn" data-act="skip-ex" data-idx="' + idx + '" title="跳过本题，稍后补做">⏭ 放弃</button>';
      }
      inner += '<div class="ex-feedback" id="fb-' + idx + '"></div>';
      box.innerHTML = inner;
      wrap.appendChild(box);
    });

    // 之前跳过的题：重进课时显示为「待补做」，保持可交互（保留 skipped 标记，补做完才清）
    if (currentLesson && progress[currentLesson.id] && progress[currentLesson.id].exSkipped) {
      const skipped = progress[currentLesson.id].exSkipped;
      Object.keys(skipped).forEach((idx) => {
        const box = wrap.querySelector('.ex[data-idx="' + idx + '"]');
        if (box) {
          box.classList.add('ex-skipped');
          const fb = wrap.querySelector('#fb-' + idx);
          if (fb) { fb.className = 'ex-feedback skipped'; fb.innerHTML = '<span class="skip-hint">⏭ 待补做 · 做完这题才能拿勋章</span>'; }
          const skipBtn = wrap.querySelector('button[data-act="skip-ex"][data-idx="' + idx + '"]');
          setSkipBtnState(skipBtn, true);
        }
      });
      saveProgress();
    }

    wrap.querySelectorAll('button[data-act]').forEach((btn) => {
      btn.onclick = () => {
        const idx = +btn.dataset.idx;
        const ex = exs[idx];
        const fb = wrap.querySelector('#fb-' + idx);
        if (btn.dataset.act === 'check-choice') {
          const sel = wrap.querySelector('input[name="ex' + idx + '"]:checked');
          if (!sel) { toast('请先选择一个答案'); return; }
          const ok = (+sel.value) === ex.answer;
          recordFirstAttempt(idx, ok ? 'correct' : 'wrong');
          fb.className = 'ex-feedback ' + (ok ? 'correct' : 'wrong');
          fb.innerHTML = (ok ? '✅ ' + pickEval('right', loadStyle()) : '❌') + (ex.explain ? '<br>' + escapeHtml(ex.explain) : '');
          // 答错：文字只亮红叉，口头「答错了」交给真人语音（按风格），不重复写文字
          if (ok) { playCorrect(); startVoice(vfile('common/fb_right')); markExerciseDone(idx); }
          else { playWrong(); startVoice(vfile('common/fb_wrong')); }
        } else if (btn.dataset.act === 'check-fill') {
          const val = wrap.querySelector('.ex-input').value.trim();
          if (!val) { toast('请输入答案'); return; }
          const answers = String(ex.answer).split('|').map((s) => s.trim().toLowerCase());
          const ok = answers.includes(val.toLowerCase());
          recordFirstAttempt(idx, ok ? 'correct' : 'wrong');
          fb.className = 'ex-feedback ' + (ok ? 'correct' : 'wrong');
          fb.innerHTML = (ok ? '✅ ' + childName() + '，正确！' : '❌') + (ex.explain ? '<br>' + escapeHtml(ex.explain) : (ok ? '' : '<br>参考答案：' + escapeHtml(ex.answer)));
          if (ok) { playCorrect(); startVoice(vfile('common/fb_right')); markExerciseDone(idx); }
          else { playWrong(); startVoice(vfile('common/fb_wrong')); }
        } else if (btn.dataset.act === 'show-open') {
          recordFirstAttempt(idx, 'viewed');
          fb.className = 'ex-feedback info';
          fb.innerHTML = '💡 参考：' + escapeHtml(ex.answer || '（无）');
        } else if (btn.dataset.act === 'check-order') {
          const doneEl = wrap.querySelector('#order-done-' + idx);
          const items = Array.from(doneEl.querySelectorAll('.order-item')).map((b) => b.textContent);
          if (items.length < ex.steps.length) { toast('还没排完哦'); return; }
          const ok = items.length === ex.steps.length && items.every((s, i) => s === ex.steps[i]);
          recordFirstAttempt(idx, ok ? 'correct' : 'wrong');
          fb.className = 'ex-feedback ' + (ok ? 'correct' : 'wrong');
          fb.innerHTML = ok ? '✅ ' + childName() + '，顺序完全正确！' : '❌' + (ex.explain ? '<br>' + escapeHtml(ex.explain) : '');
          if (ok) { playCorrect(); startVoice(vfile('common/fb_right')); markExerciseDone(idx); }
          else { playWrong(); startVoice(vfile('common/fb_wrong')); }
        } else if (btn.dataset.act === 'reset-order') {
          const pool = wrap.querySelector('#order-pool-' + idx);
          const doneEl = wrap.querySelector('#order-done-' + idx);
          Array.from(doneEl.querySelectorAll('.order-item')).forEach((b) => pool.appendChild(b));
          const ph = doneEl.querySelector('.order-placeholder');
          if (ph) ph.style.display = '';
          fb.className = 'ex-feedback'; fb.innerHTML = '';
          if (typeof captureExDraft === 'function') captureExDraft();
        } else if (btn.dataset.act === 'reset-code-ex') {
          const ta = wrap.querySelector('#ex-code-' + idx);
          if (ta) ta.value = ex.starter || '';
          const out = wrap.querySelector('#ex-out-' + idx);
          if (out) { out.textContent = '点"运行代码"看结果～'; out.classList.remove('ok-out'); }
          fb.className = 'ex-feedback'; fb.innerHTML = '';
          if (typeof captureExDraft === 'function') captureExDraft();
        } else if (btn.dataset.act === 'reset-ex') {
          if (ex.type === 'choice') {
            wrap.querySelectorAll('input[name="ex' + idx + '"]').forEach((r) => { r.checked = false; });
          } else if (ex.type === 'fill') {
            const inp = wrap.querySelector('.ex-input'); if (inp) inp.value = '';
          } else if (ex.type === 'open') {
            const ta = wrap.querySelector('.ex-textarea'); if (ta) ta.value = '';
          } else if (ex.type === 'tap') {
            wrap.querySelectorAll('#tap-opts-' + idx + ' .tap-card.selected').forEach((c) => c.classList.remove('selected'));
          }
          fb.className = 'ex-feedback'; fb.innerHTML = '';
          if (typeof captureExDraft === 'function') captureExDraft();
        } else if (btn.dataset.act === 'skip-ex') {
          // 放弃本题：软标记（仍可补做/仍可提交）。再点一次 = 撤销
          ensureLessonRecord(currentLesson.id);
          const pr = progress[currentLesson.id];
          if (!pr.exSkipped) pr.exSkipped = {};
          const willSkip = !pr.exSkipped[idx];
          const box = wrap.querySelector('.ex[data-idx="' + idx + '"]');
          if (willSkip) {
            pr.exSkipped[idx] = true;
            if (fb) { fb.className = 'ex-feedback skipped'; fb.innerHTML = '⏭ 已标记跳过 · 仍可补做（做对或撤销即生效）'; }
            if (box) box.classList.add('ex-skipped');
          } else {
            delete pr.exSkipped[idx];
            if (fb) { fb.className = 'ex-feedback'; fb.innerHTML = ''; }
            if (box) box.classList.remove('ex-skipped');
          }
          setSkipBtnState(btn, willSkip);
          saveProgress();
          refreshSubmitBar();
        } else if (btn.dataset.act === 'run-code-ex') {
          const code = wrap.querySelector('#ex-code-' + idx).value;
          const out = wrap.querySelector('#ex-out-' + idx);
          const cv = wrap.querySelector('#ex-cv-' + idx);
          if (isTurtleCode(code) && cv) {
            cv.style.display = 'block';
            turtleDraw(code, cv, out);
            // 海龟题：画成功（无 ⚠️）即判完成；若有 expect 也做文本核对
            const hasErr = /Traceback|Error:|SyntaxError/.test(out.textContent);
            const drewOk = !/⚠️|Traceback|Error:|SyntaxError/.test(out.textContent);
            if (ex.expect) {
              const ok = !hasErr && out.textContent.indexOf(ex.expect) >= 0;
              recordFirstAttempt(idx, ok ? 'correct' : 'wrong');
              fb.className = 'ex-feedback ' + (ok ? 'correct' : 'wrong');
              fb.innerHTML = ok ? ('✅ ' + childName() + '，运行结果完全正确！') : ('❌ 输出里还没看到「' + escapeHtml(ex.expect) + '」，再调调代码～');
              if (ok) { playCorrect(); startVoice(vfile('common/fb_right')); markExerciseDone(idx); }
              else { playWrong(); startVoice(vfile('common/fb_wrong')); }
            } else {
              fb.className = 'ex-feedback ' + (drewOk ? 'correct' : 'wrong');
              fb.innerHTML = drewOk ? '✅ 小海龟画好啦，本题完成！' : '❌ 这题还没画出来，检查一下 forward / left 是不是写对了～';
              if (drewOk) markExerciseDone(idx);
            }
          } else {
            runUserCode(code, out);
            if (ex.expect) {
              const hasErr = /Traceback|Error:|SyntaxError/.test(out.textContent);
              const ok = !hasErr && out.textContent.indexOf(ex.expect) >= 0;
              recordFirstAttempt(idx, ok ? 'correct' : 'wrong');
              fb.className = 'ex-feedback ' + (ok ? 'correct' : 'wrong');
              fb.innerHTML = ok ? ('✅ ' + childName() + '，运行结果完全正确！') : ('❌ 输出里还没看到「' + escapeHtml(ex.expect) + '」，再调调代码～');
              if (ok) { playCorrect(); startVoice(vfile('common/fb_right')); markExerciseDone(idx); }
              else { playWrong(); startVoice(vfile('common/fb_wrong')); }
            } else {
              const hasErr = /Traceback|Error:|SyntaxError/.test(out.textContent);
              fb.className = 'ex-feedback ' + (hasErr ? 'wrong' : 'correct');
              fb.innerHTML = hasErr ? '❌ 代码报错了，看看上面的提示改一改～' : '✅ 运行成功！本题完成～';
              if (!hasErr) markExerciseDone(idx);
            }
          }
        } else if (btn.dataset.act === 'done-coding') {
          markExerciseDone(idx);
          fb.className = 'ex-feedback correct';
          fb.innerHTML = '✅ 已完成';
        } else if (btn.dataset.act === 'check-tap') {
          const opts = wrap.querySelector('#tap-opts-' + idx);
          const sel = Array.from(opts.querySelectorAll('.tap-card.selected')).map((b) => +b.dataset.val).sort((a, b) => a - b);
          if (!sel.length) { toast('请先点选答案'); return; }
          const ans = (ex.answer || []).slice().sort((a, b) => a - b);
          const ok = sel.length === ans.length && sel.every((v, i) => v === ans[i]);
          recordFirstAttempt(idx, ok ? 'correct' : 'wrong');
          fb.className = 'ex-feedback ' + (ok ? 'correct' : 'wrong');
          fb.innerHTML = (ok ? '✅ ' + childName() + '，选对啦！' : '❌') + (ex.explain ? '<br>' + escapeHtml(ex.explain) : '');
          if (ok) { playCorrect(); startVoice(vfile('common/fb_right')); markExerciseDone(idx); }
          else { playWrong(); startVoice(vfile('common/fb_wrong')); }
        } else if (btn.dataset.act === 'speak-q') {
          const map = window.AUDIO_MAP && window.AUDIO_MAP[currentLesson.id];
          const exAudio = map && map.exercises && map.exercises[idx];
          if (exAudio && exAudio.length) {
            voicePlaySeq('ex:' + currentLesson.id + ':' + idx, exAudio, btn);
            return;
          }
          let t = ex.question;
          if (ex.type === 'choice') t += '。选项：' + (ex.options || []).join('；') + '。';
          else if (ex.type === 'fill') t += '。请填空。';
          else if (ex.type === 'order') t += '。请给步骤排顺序。';
          else if (ex.type === 'typing') t += '。请照着用键盘敲出来。';
          else if (ex.type === 'coding') t += '。请在下面的框里写 Python 代码，点运行按钮看结果。';
          else if (ex.type === 'tap') t += '。请点选正确答案。';
          speak(t, btn);
        }
      };
    });

    // 排序题：点步骤入列 / 点已排项移除回池
    wrap.querySelectorAll('.order-pool .order-item').forEach((b) => {
      b.onclick = () => {
        const box = b.closest('.ex');
        const doneBox = box.querySelector('.order-done');
        const ph = doneBox.querySelector('.order-placeholder');
        if (ph) ph.style.display = 'none';
        doneBox.appendChild(b);
      };
    });
    wrap.querySelectorAll('.order-done .order-item').forEach((b) => {
      b.onclick = () => {
        const box = b.closest('.ex');
        box.querySelector('.order-pool').appendChild(b);
        const doneBox = box.querySelector('.order-done');
        if (!doneBox.querySelector('.order-item')) { const ph = doneBox.querySelector('.order-placeholder'); if (ph) ph.style.display = ''; }
      };
    });
    // 点选（tap）题：点卡片选中/取消
    wrap.querySelectorAll('.tap-card').forEach((b) => {
      b.onclick = () => {
        const opts = b.closest('.tap-opts');
        const multi = opts && opts.dataset.multi === '1';
        if (multi) { b.classList.toggle('selected'); }
        else {
          opts.querySelectorAll('.tap-card').forEach((x) => x.classList.remove('selected'));
          b.classList.add('selected');
        }
      };
    });

    // 打字挑战
    exs.forEach((ex, idx) => { if (ex.type === 'typing') bindTyping(ex, idx, wrap); });
    // 刷新不丢进度：练习区任何输入/选择/点击都实时存草稿
    wrap.addEventListener('input', captureExDraft);
    wrap.addEventListener('change', captureExDraft);
    wrap.addEventListener('click', captureExDraft);
  }

  // 打字挑战：逐字实时变色，记录用时与准确率
  function bindTyping(ex, idx, wrap) {
    const box = wrap.querySelector('.ex[data-idx="' + idx + '"]');
    const targetEl = box.querySelector('#typ-target-' + idx);
    const input = box.querySelector('#typ-input-' + idx);
    const progEl = box.querySelector('#typ-prog-' + idx);
    const fb = box.querySelector('#fb-' + idx);
    // 「聚焦即读」：输入光标定位（聚焦）后，读当前单词；勾选「自动读解释」则跟读中文意思
    const readExplChk = box.querySelector('#typ-readexpl-' + idx);
    let _explainTimer = null;
    try { if (readExplChk) readExplChk.checked = localStorage.getItem('course_typing_readexpl') === '1'; } catch (e) {}
    if (readExplChk) readExplChk.onchange = () => {
      try { localStorage.setItem('course_typing_readexpl', readExplChk.checked ? '1' : '0'); } catch (e) {}
      if (readExplChk.checked && words[wi]) playWordAudio(words[wi], 'zh', null);
    };
    function readCurrentWord() {
      const en = words[wi];
      if (!en) return;
      playWordAudio(en, 'en', null);
      if (readExplChk && readExplChk.checked) {
        clearTimeout(_explainTimer);
        _explainTimer = setTimeout(() => { if (words[wi] === en) playWordAudio(en, 'zh', null); }, 650 + Math.min(1800, en.length * 200));
      }
    }
    input.addEventListener('focus', readCurrentWord); // 手动点进输入框才读（不自动抢焦点，切换课程停在首页）
    // 敲打词：若本课有词库(words字段)，则动态取"本课新词 + Leitner到期复习词"；否则用题目自带 words
    let words = ex.words || [];
    let srsOn = false;
    if (window.VOCAB && currentLesson && currentLesson.words && currentLesson.words.length) {
      const nw = VOCAB.newWordsOf(currentLesson.id);
      VOCAB.register(nw);
      const exclude = new Set(nw);
      const reviews = VOCAB.dueReviews(exclude, 2);
      const dyn = nw.concat(reviews).map((x) => x.toUpperCase());
      if (dyn.length) { words = dyn; srsOn = true; }
    }
    // 全课程单词释义映射（en 大写 → {zh, pron}），用于打字时显示读音+解释
    // 必须扫全部课：SRS 可能注入其他课的复习词，只查本课会漏
    const wordInfo = {};
    if (data && data.chapters) {
      data.chapters.forEach((ch) => (ch.lessons || []).forEach((les) => {
        (les.words || []).forEach((w) => { if (w.en) wordInfo[String(w.en).toUpperCase()] = w; });
      }));
    }
    if (!words.length) {
      // 本课无敲打词（如概念入门课）：友好提示 + 隐藏输入框 + 自动算完成，不阻塞「提交本节」
      targetEl.innerHTML = '📝 这一节没有要敲打的单词，去前面的练习练一练吧～';
      progEl.textContent = '';
      input.style.display = 'none';
      markExerciseDone(idx);
      return;
    }
    let wi = 0, startTime = null, errChars = 0;
    function renderTarget() {
      if (wi >= words.length) { targetEl.innerHTML = '🎉 全部完成！'; renderWordCard(); return; }
      const w = words[wi], val = input.value;
      let html = '';
      for (let i = 0; i < w.length; i++) {
        let cls = 't-char';
        if (i < val.length) cls += (val[i].toUpperCase() === w[i].toUpperCase() ? ' ok' : ' bad');
        html += '<span class="' + cls + '">' + escapeHtml(w[i]) + '</span>';
      }
      targetEl.innerHTML = html;
      progEl.textContent = wi < words.length ? ('进度 ' + (wi + 1) + '/' + words.length + ' · 现在敲：' + words[wi]) : '进度 ' + words.length + '/' + words.length;
      renderWordCard();
    }
    function renderWordCard() {
      const card = box.querySelector('#word-card-' + idx);
      if (!card) return;
      if (wi >= words.length) { card.innerHTML = ''; return; }
      const en = words[wi];
      const info = wordInfo[String(en).toUpperCase()] || {};
      const zh = info.zh || '';
      const pron = info.pron || '';
      let html = '<div class="wc-row"><span class="wc-label">读音</span>' +
        '<button class="wc-speak" data-en="' + escapeHtml(en) + '" data-kind="en">🔊 听读音</button>' +
        (pron ? '<span class="wc-pron">/' + escapeHtml(pron) + '/</span>' : '') + '</div>';
      if (zh) {
        html += '<div class="wc-row"><span class="wc-label">解释</span><span class="wc-zh">' + escapeHtml(zh) + '</span>' +
          '<button class="wc-speak" data-en="' + escapeHtml(en) + '" data-kind="zh">🔊 听讲解</button></div>';
      }
      card.innerHTML = html;
      card.querySelectorAll('.wc-speak').forEach((b) => {
        b.onclick = () => playWordAudio(b.getAttribute('data-en'), b.getAttribute('data-kind'), b);
      });
    }
    input.addEventListener('input', () => {
      if (startTime === null && input.value.length > 0) startTime = Date.now();
      playClick();
      const w = words[wi], val = input.value;
      if (val.toUpperCase() === w.toUpperCase()) {
        if (srsOn) VOCAB.answer(w, true, 'course'); // 敲对：该词升一盒
        wi++; input.value = '';
        playCorrect();
        if (wi >= words.length) finishTyping();
        renderTarget();
        if (wi < words.length && document.activeElement === input) readCurrentWord();
        return;
      }
      // 实时检测：当前输入不再是目标词的前缀 → 敲错，立即提示并清空重敲
      if (val.length > 0 && !w.toUpperCase().startsWith(val.toUpperCase())) {
        if (srsOn) VOCAB.answer(w, false, 'course'); // 敲错：该词回盒1，加大复习频率
        playWrong();
        errChars += 1;
        input.value = '';
        startVoice(vfile('common/fb_wrong')); // 真人音「答错了」，不念整句啰嗦的话
        renderTarget();
        return;
      }
      let err = 0;
      for (let i = 0; i < val.length; i++) if (val[i].toUpperCase() !== w[i].toUpperCase()) err++;
      errChars = err;
      renderTarget();
    });
    function finishTyping() {
      const timeSec = startTime ? (Date.now() - startTime) / 1000 : 0;
      const totalChars = words.join('').length;
      const accuracy = totalChars ? Math.max(0, Math.round((1 - errChars / (totalChars + errChars)) * 100)) : 100;
      const lesId = currentLesson.id;
      if (!progress[lesId]) progress[lesId] = {};
      progress[lesId].typing = { timeSec: Math.round(timeSec), accuracy: accuracy, words: words.length };
      recordFirstAttempt(idx, 'typed');
      saveProgress();
      fb.className = 'ex-feedback correct';
      fb.innerHTML = '⌨️ 完成！用时 ' + timeSec.toFixed(1) + ' 秒，准确率 ' + accuracy + '%';
      input.style.display = 'none';
      input.blur();
      markExerciseDone(idx);
    }
    renderTarget();
  }

  function markExerciseDone(idx) {
    const lesId = currentLesson.id;
    if (!progress[lesId]) progress[lesId] = {};
    if (!progress[lesId].exDone) progress[lesId].exDone = {};
    progress[lesId].exDone[idx] = true;
    // 答对了，清除之前的 skipped 记录（补做成功），并把已撤销的"放弃"按钮切回"放弃"
    if (progress[lesId].exSkipped && progress[lesId].exSkipped[idx]) {
      delete progress[lesId].exSkipped[idx];
      const skipBtn = document.querySelector('button[data-act="skip-ex"][data-idx="' + idx + '"]');
      if (skipBtn) setSkipBtnState(skipBtn, false);
      const box = document.querySelector('.ex[data-idx="' + idx + '"]');
      if (box) box.classList.remove('ex-skipped');
    }
    const les = findLesson(lesId);
    const total = les.exercises ? les.exercises.length : 0;
    const doneCount = Object.keys(progress[lesId].exDone).length;
    saveProgress();
    updateProgress();
    refreshSubmitBar();
    // 本节已提交、且现在全部做对（含补做）→ 自动补发勋章 + 庆祝
    if (progress[lesId].done && les.award && evalStateOf(les) === 'allCorrect') {
      const had = loadBadges().some((x) => x.p === les.award.p);
      awardIfNeeded(les);
      if (!had) { launchConfetti(); toast(pickAwardMsg(les.award), 4800); }
    }
  }

  function updateProgress() {
    let total = 0, done = 0;
    data.chapters.forEach((ch) => ch.lessons.forEach((l) => {
      total++;
      if (progress[l.id] && progress[l.id].done) done++;
    }));
    const pct = total ? Math.round((done / total) * 100) : 0;
    $('#progress-text').textContent = '进度 ' + pct + '%';
  }

  let toastTimer;
  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 1900);
  }

  init();
})();
