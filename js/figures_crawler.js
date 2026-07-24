// figures_crawler.js — 爬虫实战课 SVG 图解库（14+ 幽默梗王风）
// 复用 figures.js 的画法约定：浅底深字，文字由 .fig-svg 统一控制字体
// 课程用 figures:[{key,caption}] 引用；本文件向 window.FIGURES 追加 17 个 key。
(function () {
  'use strict';
  var F = window.FIGURES || (window.FIGURES = {});

  function svg(w, h, inner) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="fig-svg" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }
  function rect(x, y, w, h, fill, stroke, r) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r == null ? 9 : r) + '" fill="' + (fill || '#eaf6ff') + '" stroke="' + (stroke || '#7fb2e0') + '" stroke-width="2"/>';
  }
  function txt(x, y, s, size, color, anchor, weight) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 15) + '" fill="' + (color || '#2f3e52') + '" text-anchor="' + (anchor || 'middle') + '" font-weight="' + (weight || '400') + '">' + s + '</text>';
  }
  function line(x1, y1, x2, y2, color, w) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (color || '#90a4b8') + '" stroke-width="' + (w || 2) + '"/>';
  }
  function arrow(x1, y1, x2, y2, color) {
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len, hx = x2 - ux * 10, hy = y2 - uy * 10;
    var a1x = hx - uy * 6, a1y = hy + ux * 6, a2x = hx + uy * 6, a2y = hy - ux * 6;
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + hx + '" y2="' + hy + '" stroke="' + (color || '#5b8fc4') + '" stroke-width="2.5"/>' +
      '<polygon points="' + x2 + ',' + y2 + ' ' + a1x + ',' + a1y + ' ' + a2x + ',' + a2y + '" fill="' + (color || '#5b8fc4') + '"/>';
  }
  function chip(x, y, w, h, emoji, label, fill, stroke) {
    return rect(x, y, w, h, fill, stroke) +
      '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 - 2) + '" font-size="20" text-anchor="middle">' + emoji + '</text>' +
      txt(x + w / 2, y + h - 9, label, 11.5, '#3f5066');
  }
  function box(x, y, w, h, title, sub, fill, stroke) {
    return rect(x, y, w, h, fill, stroke) +
      txt(x + w / 2, y + 22, title, 14, '#2f3e52', 'middle', '700') +
      txt(x + w / 2, y + 42, sub, 11, '#5f728a');
  }

  // 1) 爬虫全流程
  F.crawler_data_flow = function () {
    var s = '';
    s += txt(310, 26, '🕸️ 爬虫全流程：循环不息', 16, '#2f3e52', 'middle', '700');
    var data = [['📡', '发出请求'], ['📄', '拿到网页/接口'], ['🔍', '解析提取'], ['💾', '存文件/库']];
    for (var i = 0; i < 4; i++) s += chip(20 + i * 150, 60, 120, 78, data[i][0], data[i][1], '#eaf6ff', '#5b8fc4');
    for (var j = 0; j < 3; j++) s += arrow(140 + j * 150, 99, 150 + j * 150, 99, '#5b8fc4');
    s += arrow(440, 99, 470, 99, '#5b8fc4');
    s += txt(310, 175, '↩ 拿到数据后，往往还要翻下一页 → 整个流程循环', 12.5, '#7a8aa0');
    return svg(620, 200, s);
  };

  // 2) 浏览器 vs 爬虫
  F.browser_server = function () {
    var s = '';
    s += txt(310, 24, '🌐 你点网址 vs 爬虫：干的是同一件事', 15.5, '#2f3e52', 'middle', '700');
    s += box(20, 50, 280, 110, '🧑 真人 + 浏览器', '点网址 → 浏览器发请求 → 收 HTML → 人眼看', '#e3f7e8', '#3a9d5d');
    s += box(320, 50, 280, 110, '🤖 爬虫(代码)', '代码发请求 → 收 HTML → 跳过人眼直接抠', '#fff3cf', '#e6b84d');
    s += box(170, 185, 280, 70, '🖥️ 服务器', '收到请求 → 回 HTML', '#eaf6ff', '#5b8fc4');
    s += arrow(160, 110, 250, 185, '#3a9d5d');
    s += arrow(460, 110, 370, 185, '#e6b84d');
    s += txt(310, 285, '爬虫 = 自动化的你，只是省掉了"人眼看"这一步', 12.5, '#7a8aa0');
    return svg(620, 310, s);
  };

  // 3) HTML 标签树
  F.html_tree = function () {
    var s = '';
    s += txt(310, 24, '🌲 HTML 是一棵标签树', 15.5, '#2f3e52', 'middle', '700');
    s += box(250, 44, 120, 40, '<html>', '', '#eaf6ff', '#5b8fc4');
    s += arrow(310, 84, 310, 100, '#5b8fc4');
    s += box(250, 100, 120, 40, '<body>', '', '#eaf6ff', '#5b8fc4');
    var kids = [['<h1>', '#fff3cf', '#e6b84d'], ['<p>', '#e3f7e8', '#3a9d5d'], ['<a>', '#ffe5ec', '#d9536b'], ['<ul>', '#ede7ff', '#7a5fb0']];
    for (var i = 0; i < 4; i++) {
      var x = 30 + i * 145;
      s += arrow(310, 140, x + 55, 170, '#90a4b8');
      s += box(x, 170, 110, 38, kids[i][0], '', kids[i][1], kids[i][2]);
    }
    s += arrow(345 - 55 + 290, 208, 30 + 3 * 145 + 55, 240, '#7a5fb0');
    s += box(30 + 3 * 145, 240, 110, 38, '<li> ×N', '子项挂在 ul 下', '#ede7ff', '#7a5fb0');
    s += txt(310, 300, '解析库就是按这棵树"按图索骥"地抠数据', 12.5, '#7a8aa0');
    return svg(620, 320, s);
  };

  // 4) 请求 / 响应
  F.request_response = function () {
    var s = '';
    s += txt(310, 24, '📨 一次 HTTP：请求 → 响应', 15.5, '#2f3e52', 'middle', '700');
    s += box(20, 50, 280, 110, '➡️ 请求 Request', '方法 GET/POST + URL + 头(Headers) + 参数', '#eaf6ff', '#5b8fc4');
    s += box(320, 50, 280, 110, '⬅️ 响应 Response', '状态码 + 头 + 正文(HTML/JSON)', '#fff3cf', '#e6b84d');
    s += arrow(300, 105, 320, 105, '#5b8fc4');
    s += txt(310, 195, '爬虫 = 用代码构造"请求"，再读取"响应正文"', 12.5, '#7a8aa0');
    return svg(620, 220, s);
  };

  // 5) robots.txt
  F.robots_txt = function () {
    var s = '';
    s += txt(310, 24, '📄 robots.txt：网站根的"门牌告示"', 15.5, '#2f3e52', 'middle', '700');
    s += box(20, 50, 280, 110, '🚫 Disallow', '站长说"别爬这里" → 真别碰', '#ffe5ec', '#d9536b');
    s += box(320, 50, 280, 110, '✅ Allow', '在大前提禁止里放开某些路径 → 可爬', '#e3f7e8', '#3a9d5d');
    s += txt(310, 195, '爬前先读 /robots.txt：Disallow 的路径绕开，Allow 的才动手（君子协定）', 12, '#7a8aa0');
    return svg(620, 220, s);
  };

  // 6) 法律红线
  F.legal_redline = function () {
    var s = '';
    s += txt(310, 24, '🚫 红线：这些绝对别碰', 15.5, '#2f3e52', 'middle', '700');
    var red = [['👤', '个人信息'], ['💰', '付费专有内容'], ['⚠️', '违法内容'], ['🔓', '破解技术防爬']];
    for (var i = 0; i < 4; i++) s += chip(20 + i * 150, 50, 130, 76, red[i][0], red[i][1], '#ffe5ec', '#d9536b');
    s += txt(310, 165, '版权 / 不正当竞争也要小心：抓来的内容别擅自商用、别整碗端走对手数据', 12.5, '#7a8aa0');
    s += txt(310, 192, '动手前三问：公开无敏感？允许？用途正当？过不了就收手', 12.5, '#d9536b', 'middle', '700');
    return svg(620, 215, s);
  };

  // 7) 正则滤网
  F.regex_match = function () {
    var s = '';
    s += txt(310, 24, '🔍 正则 = 模式滤网', 15.5, '#2f3e52', 'middle', '700');
    s += box(20, 55, 250, 70, '乱文本', '订单号A12 价格39 编号B7', '#eaf6ff', '#5b8fc4');
    s += box(355, 55, 250, 70, '捞出数字串', '12 / 39 / 7', '#e3f7e8', '#3a9d5d');
    s += arrow(270, 90, 355, 90, '#3a9d5d');
    s += txt(310, 165, '\\d+ 像筛子：只放连续数字过去；邮箱/日期/URL 这类固定模式都好使', 12, '#7a8aa0');
    return svg(620, 190, s);
  };

  // 8) 榜单 → 表
  F.data_store = function () {
    var s = '';
    s += txt(310, 24, '📊 榜单 → 一张表', 15.5, '#2f3e52', 'middle', '700');
    var st = [['📡', 'requests 拿 HTML'], ['🔍', 'bs4 抠 title/score'], ['📋', 'DictWriter 写 csv']];
    for (var i = 0; i < 3; i++) s += chip(20 + i * 200, 55, 170, 78, st[i][0], st[i][1], '#eaf6ff', '#5b8fc4');
    for (var j = 0; j < 2; j++) s += arrow(190 + j * 200, 94, 200 + j * 200, 94, '#5b8fc4');
    s += txt(310, 175, 'utf-8-sig + newline="" → Excel 打开中文不乱码、不空行', 12, '#7a8aa0');
    return svg(620, 200, s);
  };

  // 9) 天气看板链路
  F.api_json = function () {
    var s = '';
    s += txt(310, 24, '🌤️ 天气看板链路', 15.5, '#2f3e52', 'middle', '700');
    var st = [['🔗', '构造带参 URL'], ['📡', 'requests 拿 JSON'], ['🌡️', '取 temp_C/天气'], ['🗂️', '攒字典'], ['💾', 'dump weather.json']];
    for (var i = 0; i < 5; i++) s += chip(8 + i * 122, 55, 110, 78, st[i][0], st[i][1], '#eaf6ff', '#5b8fc4');
    for (var j = 0; j < 4; j++) s += arrow(118 + j * 122, 94, 128 + j * 122, 94, '#5b8fc4');
    s += txt(310, 175, 'wttr.in 的 ?format=j1 免 key 直接给 JSON，练接口爬取的神仙站点', 12, '#7a8aa0');
    return svg(620, 200, s);
  };

  // 10) 批量下载图片
  F.download_flow = function () {
    var s = '';
    s += txt(310, 24, '🖼️ 批量下载图片', 15.5, '#2f3e52', 'middle', '700');
    var st = [['🔍', 'bs4 抠 img src'], ['🔁', '循环 requests.get'], ['📦', 'r.content 字节'], ['💾', 'open(wb) 写盘']];
    for (var i = 0; i < 4; i++) s += chip(20 + i * 150, 55, 130, 78, st[i][0], st[i][1], '#eaf6ff', '#5b8fc4');
    for (var j = 0; j < 3; j++) s += arrow(150 + j * 150, 94, 160 + j * 150, 94, '#5b8fc4');
    s += txt(310, 175, '文字用 r.text、图片用 r.content，搞反图片就废了', 12, '#7a8aa0');
    return svg(620, 200, s);
  };

  // 11) 毕业项目全链路
  F.project_map = function () {
    var s = '';
    s += txt(310, 22, '🚀 毕业项目八步走完即毕业', 15.5, '#2f3e52', 'middle', '700');
    var st = [['🎯', '定目标'], ['🔎', '看数据源'], ['📡', '抓'], ['🔍', '解析'], ['💾', '存'], ['🤝', '加礼貌'], ['🛡️', '做兜底'], ['📝', '写说明']];
    for (var i = 0; i < 8; i++) {
      var x = 12 + (i % 4) * 150, y = 50 + Math.floor(i / 4) * 80;
      s += chip(x, y, 132, 66, st[i][0], st[i][1], '#eaf6ff', '#5b8fc4');
      if (i % 4 < 3) s += arrow(x + 132, y + 33, x + 150, y + 33, '#5b8fc4');
    }
    s += arrow(300, 130, 12 + 150, 130, '#5b8fc4');
    s += txt(310, 220, '选一个你真感兴趣的公开站，从头爬到尾就是毕业', 12.5, '#7a8aa0');
    return svg(620, 245, s);
  };

  // 12) 排错套路 + 五大坑
  F.debug_wheel = function () {
    var s = '';
    s += txt(310, 22, '🐞 排错套路：逐层打印缩小范围', 15.5, '#2f3e52', 'middle', '700');
    var st = [['1️⃣', '打印原始响应'], ['2️⃣', '打印解析中间结果'], ['3️⃣', '定位变空的那步'], ['4️⃣', '针对性修复']];
    for (var i = 0; i < 4; i++) s += chip(20 + i * 150, 45, 130, 70, st[i][0], st[i][1], '#fff3cf', '#e6b84d');
    for (var j = 0; j < 3; j++) s += arrow(150 + j * 150, 80, 160 + j * 150, 80, '#e6b84d');
    var pit = [['空列表', '#ffe5ec', '#d9536b'], ['403', '#ffe5ec', '#d9536b'], ['乱码', '#ffe5ec', '#d9536b'], ['缺字段', '#ffe5ec', '#d9536b'], ['被封', '#ffe5ec', '#d9536b']];
    s += txt(310, 150, '五大坑：', 13, '#d9536b', 'middle', '700');
    for (var k = 0; k < 5; k++) s += chip(12 + k * 122, 165, 112, 56, '⚠️', pit[k][0], pit[k][1], pit[k][2]);
    s += txt(310, 250, '别一上来就怀疑人生，哪步变空坑就在哪步', 12, '#7a8aa0');
    return svg(620, 272, s);
  };

  // 13) 毕业地图 + 下一步
  F.roadmap = function () {
    var s = '';
    s += txt(310, 22, '🗺️ 已通链路 → 下一步方向', 15.5, '#2f3e52', 'middle', '700');
    s += box(20, 45, 285, 90, '✅ 已掌握', '请求→解析→存储→工程化→合规', '#e3f7e8', '#3a9d5d');
    s += box(320, 45, 285, 90, '🚀 下一步', 'Scrapy / 异步 aiohttp / Selenium / 可视化 / 定时', '#eaf6ff', '#5b8fc4');
    s += arrow(305, 90, 320, 90, '#5b8fc4');
    s += txt(310, 165, '爬虫是"把网上信息变成你能用的数据"的第一把钥匙', 12.5, '#7a8aa0');
    return svg(620, 190, s);
  };

  // 14) 代理轮换
  F.proxy_rotate = function () {
    var s = '';
    s += txt(310, 24, '🛡️ 代理轮换：别让一个 IP 露馅', 15.5, '#2f3e52', 'middle', '700');
    s += box(20, 55, 140, 70, '🤖 爬虫', '每次换 IP', '#eaf6ff', '#5b8fc4');
    s += box(240, 55, 140, 70, '🔄 代理池', 'IP1/IP2/IP3…', '#fff3cf', '#e6b84d');
    var tg = [['🌐', '目标A'], ['🌐', '目标B'], ['🌐', '目标C']];
    for (var i = 0; i < 3; i++) s += chip(420, 30 + i * 60, 150, 50, tg[i][0], tg[i][1], '#e3f7e8', '#3a9d5d');
    s += arrow(160, 90, 240, 90, '#5b8fc4');
    s += arrow(380, 78, 420, 55, '#3a9d5d');
    s += arrow(380, 90, 420, 115, '#3a9d5d');
    s += arrow(380, 102, 420, 175, '#3a9d5d');
    s += txt(310, 235, '高并发/被限流时的保命手段：IP 轮流上，降低被封概率', 12, '#7a8aa0');
    return svg(620, 258, s);
  };

  // 15) Selenium 动态页
  F.selenium_dynamic = function () {
    var s = '';
    s += txt(310, 24, '⚡ 动态页：HTML 里没数据，得等 JS', 15.5, '#2f3e52', 'middle', '700');
    s += box(20, 55, 180, 70, '🌐 初始 HTML', '空壳/占位', '#ffe5ec', '#d9536b');
    s += box(230, 55, 180, 70, '⚙️ JS 现拉数据', '渲染后才填充', '#fff3cf', '#e6b84d');
    s += box(440, 55, 160, 70, '🚗 Selenium', '驱动真浏览器等 JS', '#eaf6ff', '#5b8fc4');
    s += arrow(200, 90, 230, 90, '#d9536b');
    s += arrow(410, 90, 440, 90, '#5b8fc4');
    s += txt(310, 175, 'bs4 解析静态 HTML 救不了动态加载；要等 JS 执行拿渲染后页面', 12, '#7a8aa0');
    return svg(620, 200, s);
  };

  // 16) Session / Cookie
  F.session_cookie = function () {
    var s = '';
    s += txt(310, 24, '🍪 Session/Cookie：保持登录态', 15.5, '#2f3e52', 'middle', '700');
    s += box(20, 55, 180, 80, '🔐 登录一次', '服务器发 Cookie', '#eaf6ff', '#5b8fc4');
    s += box(230, 55, 180, 80, '🤖 后续请求', '带上同一个 Cookie', '#fff3cf', '#e6b84d');
    s += box(440, 55, 160, 80, '✅ 保持登录', 'Session 串起多次', '#e3f7e8', '#3a9d5d');
    s += arrow(200, 95, 230, 95, '#5b8fc4');
    s += arrow(410, 95, 440, 95, '#3a9d5d');
    s += txt(310, 185, '用 requests.Session() 自动管理 Cookie，爬登录后才能看的页必备', 12, '#7a8aa0');
    return svg(620, 210, s);
  };

  // 17) 状态码转盘
  F.status_wheel = function () {
    var s = '';
    s += txt(310, 24, '🔢 状态码：服务器用三位数回话', 15.5, '#2f3e52', 'middle', '700');
    var st = [['200', '✅ 成功', '#e3f7e8', '#3a9d5d'], ['301/2', '↪️ 跳转', '#fff3cf', '#e6b84d'], ['403', '🚫 被拦', '#ffe5ec', '#d9536b'], ['404', '❓ 丢失', '#ffe5ec', '#d9536b'], ['5xx', '💥 服务器错', '#ede7ff', '#7a5fb0']];
    for (var i = 0; i < 5; i++) s += chip(12 + i * 122, 55, 112, 78, st[i][0], st[i][1], st[i][2], st[i][3]);
    s += txt(310, 175, '看到 200 再处理；4xx 查客户端、5xx 查服务端/稍后重试', 12, '#7a8aa0');
    return svg(620, 200, s);
  };

  window.FIGURES = F;
})();
