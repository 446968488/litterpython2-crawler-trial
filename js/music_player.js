// 迷你悬浮音乐播放器：Web Audio 合成「电子榨菜」循环乐，纯离线、无音频文件。
// 功能：右下角悬浮按钮 → 展开播放/暂停、音量调节、关闭（关闭后留小药丸可重开）。
// 联动：播放真人语音时自动把背景乐压低（闪避），语音结束后恢复；面板 10s 无操作自动收回迷你态。
(function () {
  'use strict';
  if (window.__musicPlayerInited) return;
  window.__musicPlayerInited = true;

  var TEMPO = 138;                 // 稍快，兴奋感
  var BEAT = 60 / TEMPO;           // 四分音符秒数
  var EIGHTH = BEAT / 2;           // 八分音符
  var STEP = EIGHTH;               // 调度步长 = 八分音符

  // C 大调 I–vi–IV–V 进行，4 小节循环
  var chords = [
    [261.63, 329.63, 392.00], // C  (C E G)
    [220.00, 261.63, 329.63], // Am (A C E)
    [174.61, 220.00, 261.63], // F  (F A C)
    [196.00, 246.94, 293.66]  // G  (G B D)
  ];
  var LOOKUP = { C: 261.63, E: 329.63, G: 392.00, A: 220.00, F: 174.61 };

  var ctx = null, master = null, comp = null;
  var playing = false, closed = false;
  var stepIndex = 0, nextNoteTime = 0, timer = null;
  var volume = 0.5;
  var ducked = false;            // 是否处于闪避（被语音压低）
  var manualDuringDuck = false;  // 闪避期间用户是否手动调过音量（覆盖自动压低）
  var LOOKAHEAD = 0.12;   // 提前调度秒数
  var TICK = 25;          // 调度器轮询 ms

  function ensureCtx() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    // 轻微压缩，避免叠音爆音
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
    applyGain();   // 应用当前闪避状态（若语音正在播放时用户才开音乐）
  }

  // 实际写入增益：闪避时压到 ~18%，否则用用户音量
  function applyGain() {
    if (master) master.gain.value = ducked ? volume * 0.18 : volume;
  }

  // 背景乐闪避：语音开始 on=true 压低，结束 on=false 恢复
  window.__musicDuck = function (on) {
    if (on) {
      if (manualDuringDuck) return;            // 用户已手动调过，本次不再压
      if (!ducked) { ducked = true; applyGain(); }
    } else {
      if (ducked) { ducked = false; applyGain(); }
      manualDuringDuck = false;                // 语音结束，重置覆盖标记，下次重新评估
    }
  };

  function noiseBuffer(dur) {
    var n = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // 主音色：明快方波带快速衰减
  function blip(freq, t, dur, type, gain, dest) {
    if (!freq) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // 底鼓：低频正弦下滑
  function kick(t, gain) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.18);
  }

  // 踩镲：高通噪声短促
  function hat(t, gain) {
    var src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.05);
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(hp); hp.connect(g); g.connect(master);
    src.start(t); src.stop(t + 0.06);
  }

  function scheduleStep(i, t) {
    var bar = Math.floor(i / 8) % 4;
    var s = i % 8;
    var ch = chords[bar];

    // 底鼓：每拍（步 0,2,4,6）
    if (s % 2 === 0) kick(t, 0.9);
    // 踩镲：每个八分都来一下，兴奋感
    hat(t, s % 2 === 0 ? 0.18 : 0.10);

    // 贝斯：根音低八度，步 0 和 4
    if (s === 0 || s === 4) blip(ch[0] / 2, t, 0.42, 'triangle', 0.5);

    // 琶音：八分音符跑动
    blip(ch[s % 3], t, 0.16, 'square', 0.16);

    // 主旋律（明亮）：步 0,2,4,6 跳音 + 偶尔上行
    var lead;
    if (s === 0) lead = ch[2] * 2;
    else if (s === 2) lead = ch[1] * 2;
    else if (s === 4) lead = ch[2] * 2;
    else if (s === 6) lead = ch[0] * 2 * (bar === 3 ? 1.5 : 1); // 末尾小推进
    if (lead) blip(lead, t, 0.22, 'sawtooth', 0.22);
  }

  function scheduler() {
    while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
      scheduleStep(stepIndex, nextNoteTime);
      nextNoteTime += STEP;
      stepIndex = (stepIndex + 1) % 32;
    }
  }

  function start() {
    ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    playing = true;
    stepIndex = 0;
    nextNoteTime = ctx.currentTime + 0.06;
    timer = setInterval(scheduler, TICK);
    reflect();
  }
  function stop() {
    playing = false;
    if (timer) { clearInterval(timer); timer = null; }
    reflect();
  }
  function toggle() { playing ? stop() : start(); }

  // ---------- UI ----------
  var fab, panel, volSlider, playBtn, restorePill, idleTimer;

  function reflect() {
    if (playBtn) playBtn.textContent = playing ? '⏸ 暂停' : '▶ 播放';
    if (fab) fab.classList.toggle('on', playing);
  }

  // 面板打开后 10s 无操作 → 自动收回迷你态（只留悬浮按钮）
  function resetIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (panel && panel.style.display !== 'none') panel.style.display = 'none';
    }, 10000);
  }
  function openPanel() {
    panel.style.display = '';
    resetIdle();
  }

  function build() {
    var css = '' +
      '.music-fab{position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:10px;font-family:inherit}' +
      '.music-fab .fab-btn{width:54px;height:54px;border-radius:50%;border:none;cursor:pointer;font-size:24px;color:#fff;background:linear-gradient(135deg,#ff7a59,#ff3d77);box-shadow:0 6px 18px rgba(255,61,119,.45);transition:transform .15s, box-shadow .15s;animation:bob 1.6s ease-in-out infinite}' +
      '.music-fab .fab-btn.on{animation:spin 2.4s linear infinite}' +
      '@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
      '@keyframes spin{to{transform:rotate(360deg)}}' +
      '.music-panel{width:230px;background:rgba(28,32,48,.96);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:14px 16px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.4);backdrop-filter:blur(6px)}' +
      '.music-panel h4{margin:0 0 4px;font-size:15px;display:flex;align-items:center;gap:6px}' +
      '.music-panel .sub{font-size:11px;opacity:.6;margin-bottom:10px}' +
      '.music-panel .row{display:flex;align-items:center;gap:10px;margin-top:10px}' +
      '.music-panel .play{border:none;border-radius:10px;padding:8px 14px;font-size:14px;font-weight:700;cursor:pointer;color:#fff;background:linear-gradient(135deg,#ffb347,#ff7a59)}' +
      '.music-panel .close{border:none;border-radius:10px;padding:8px 12px;font-size:13px;cursor:pointer;color:#fff;background:rgba(255,255,255,.14)}' +
      '.music-panel input[type=range]{flex:1;accent-color:#ff3d77;cursor:pointer}' +
      '.music-pill{position:fixed;right:18px;bottom:18px;z-index:9999;border:none;border-radius:20px;padding:8px 14px;font-size:13px;cursor:pointer;color:#fff;background:rgba(28,32,48,.9);box-shadow:0 4px 14px rgba(0,0,0,.3)}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    fab = document.createElement('div'); fab.className = 'music-fab';
    var btn = document.createElement('button'); btn.className = 'fab-btn'; btn.textContent = '🎵';
    btn.title = '背景音乐';
    panel = document.createElement('div'); panel.className = 'music-panel';
    panel.innerHTML =
      '<h4>🎶 学习 BGM</h4>' +
      '<div class="sub">🎵 脑暴BGM · 纯代码手搓</div>' +
      '<div class="row"><button class="play" id="mp-play">▶ 播放</button>' +
      '<button class="close" id="mp-close">关闭</button></div>' +
      '<div class="row"><span>🔈</span><input type="range" id="mp-vol" min="0" max="100" value="50"><span>🔊</span></div>';
    fab.appendChild(panel);
    fab.appendChild(btn);
    document.body.appendChild(fab);

    playBtn = panel.querySelector('#mp-play');
    volSlider = panel.querySelector('#mp-vol');
    playBtn.onclick = function () { toggle(); resetIdle(); };
    volSlider.oninput = function () {
      volume = (+volSlider.value) / 100;
      if (master) master.gain.value = volume;   // 用户意愿优先，立即生效
      if (ducked) manualDuringDuck = true;      // 闪避期间手动调 = 覆盖自动压低
      resetIdle();
    };
    panel.querySelector('#mp-close').onclick = function () {
      stop();
      fab.style.display = 'none';
      closed = true;
      showRestorePill();
    };
    btn.onclick = function () {
      if (panel.style.display === 'none') openPanel();
      else panel.style.display = 'none';
    };
    // 面板内任意操作都重置空闲计时
    panel.addEventListener('pointerdown', resetIdle);
    panel.addEventListener('input', resetIdle);
    panel.addEventListener('change', resetIdle);
    // 默认收起面板，只露按钮
    panel.style.display = 'none';
  }

  function showRestorePill() {
    if (restorePill) return;
    restorePill = document.createElement('button');
    restorePill.className = 'music-pill';
    restorePill.textContent = '🎵 打开音乐';
    restorePill.onclick = function () {
      closed = false;
      fab.style.display = '';
      restorePill.remove(); restorePill = null;
    };
    document.body.appendChild(restorePill);
  }

  function init() {
    build();
    // 首次任意点击尝试解锁音频（满足浏览器自动播放策略）
    var unlock = function () {
      ensureCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
