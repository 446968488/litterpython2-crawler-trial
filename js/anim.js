(function () {
  // ===== 网页动画引擎（零积分 / 离线 / 纯 Canvas 绘制）=====
  // 每节课注册一个剧本：draw(ctx, t, w, h)，t 为循环周期内秒数。
  const ANIMS = {};
  window.registerAnim = function (id, fn) { ANIMS[id] = fn; };
  window.playAnim = function (canvas, id) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height, dur = 8;
    if (canvas._raf) cancelAnimationFrame(canvas._raf);
    let start = null;
    function frame(ts) {
      if (start === null) start = ts;
      const t = ((ts - start) / 1000) % dur;
      ctx.clearRect(0, 0, w, h);
      const fn = ANIMS[id];
      if (fn) fn(ctx, t, w, h);
      canvas._raf = requestAnimationFrame(frame);
    }
    canvas._raf = requestAnimationFrame(frame);
  };
  window.stopAnim = function (canvas) { if (canvas._raf) cancelAnimationFrame(canvas._raf); };

  // roundRect polyfill（老浏览器兜底）
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath(); return this;
    };
  }

  // ===== 通用绘制助手 =====
  function bg(ctx, w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#bfe3ff'); sky.addColorStop(1, '#eaf7ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9be39b'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.fillStyle = '#ffd766'; ctx.beginPath(); ctx.arc(w - 56, 56, 26, 0, 7); ctx.fill();
  }
  function text(ctx, s, x, y, size, color, align) {
    ctx.fillStyle = color || '#333';
    ctx.font = 'bold ' + size + 'px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }
  function loopArrow(ctx, cx, cy, r, ang) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.strokeStyle = '#ff8c42'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r, -1.2, 4.0); ctx.stroke();
    const a = 4.0, hx = r * Math.cos(a), hy = r * Math.sin(a);
    ctx.beginPath(); ctx.moveTo(hx, hy);
    ctx.lineTo(hx - 16, hy - 4); ctx.lineTo(hx - 1, hy + 14); ctx.closePath();
    ctx.fillStyle = '#ff8c42'; ctx.fill();
    ctx.restore();
  }
  function kid(ctx, x, y, s, arm) {
    ctx.fillStyle = '#ff9aa2'; ctx.beginPath(); ctx.roundRect(x - s * 0.18, y - s * 0.5, s * 0.36, s * 0.7, 8); ctx.fill();
    ctx.fillStyle = '#ffe0bd'; ctx.beginPath(); ctx.arc(x, y - s * 0.7, s * 0.28, 0, 7); ctx.fill();
    ctx.fillStyle = '#333'; ctx.beginPath();
    ctx.arc(x - s * 0.1, y - s * 0.75, s * 0.04, 0, 7);
    ctx.arc(x + s * 0.1, y - s * 0.75, s * 0.04, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffe0bd'; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + s * 0.18, y - s * 0.35);
    const ex = x + s * 0.46, ey = y - s * 0.35 + arm * s * 0.32;
    ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#4aa3ff'; ctx.lineWidth = s * 0.06;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + s * 0.26, ey - arm * s * 0.22); ctx.stroke();
  }

  // ===== 剧本：c0l3 循环 =====
  registerAnim('c0l3', function (ctx, t, w, h) {
    bg(ctx, w, h);
    loopArrow(ctx, w / 2, h * 0.32, 46, t * 1.2);
    text(ctx, '循环 loop', w / 2, h * 0.32 + 80, 22, '#ff8c42');
    const arm = Math.sin(t * 4);
    kid(ctx, w * 0.5, h * 0.74, 120, arm);
    const day = (Math.floor(t / (8 / 5)) % 5) + 1;
    text(ctx, '第 ' + day + ' 天：一遍又一遍～', w / 2, h * 0.93, 20, '#556');
    text(ctx, '第1节小样 · 循环（网页动画 · 零积分）', w / 2, 30, 17, '#335');
  });
})();
