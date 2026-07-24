// figures.js — 亲子向 SVG 概念图解库
// 每个生成器返回一段 <svg> 字符串；课程用 figures:[{key,caption}] 引用
// 颜色走柔和亲子色，文字由 css .fig-svg 统一控制字体
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var F = {};

  function svg(w, h, inner) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="fig-svg" preserveAspectRatio="xMidYMid meet" xmlns="' + NS + '">' + inner + '</svg>';
  }
  function rect(x, y, w, h, fill, stroke, r) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r == null ? 9 : r) + '" fill="' + (fill || '#eaf6ff') + '" stroke="' + (stroke || '#7fb2e0') + '" stroke-width="2"/>';
  }
  function circ(cx, cy, r, fill, stroke) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (fill || '#eaf6ff') + '" stroke="' + (stroke || '#7fb2e0') + '" stroke-width="2"/>';
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
  function step(x, y, emoji, label, color) {
    return rect(x, y, 92, 64, color || '#fff3cf', '#e6b84d') +
      '<text x="' + (x + 46) + '" y="' + (y + 26) + '" font-size="24" text-anchor="middle">' + emoji + '</text>' +
      txt(x + 46, y + 50, label, 12.5, '#6b5a2e');
  }

  // 1) 机器人做三明治：顺序步骤
  F.robot_steps = function () {
    var s = '';
    s += txt(260, 26, '🤖 机器人按步骤做三明治', 16, '#2f3e52', 'middle', '700');
    var data = [['🍞', '1.拿面包'], ['🍓', '2.涂果酱'], ['🥪', '3.合起来'], ['🎉', '4.完成']];
    for (var i = 0; i < 4; i++) s += step(20 + i * 122, 60, data[i][0], data[i][1], '#fff3cf');
    for (var j = 0; j < 3; j++) s += arrow(112 + j * 122, 92, 124 + j * 122, 92, '#e6b84d');
    s += txt(260, 168, '程序 = 一步一步的指令，按顺序来', 13.5, '#7a8aa0');
    return svg(520, 200, s);
  };

  // 2) 顺序错了：穿袜穿鞋反了
  F.sequence_wrong = function () {
    var s = '';
    s += txt(260, 26, '顺序不一样，结果就乱了', 16, '#2f3e52', 'middle', '700');
    s += step(30, 56, '🧦', '先穿袜子', '#e3f7e8');
    s += arrow(122, 88, 134, 88, '#8fd49a');
    s += step(152, 56, '👟', '再穿鞋', '#e3f7e8');
    s += txt(193, 150, '✅ 正确', 14, '#3a9d5d', 'middle', '700');
    s += step(300, 56, '👟', '先穿鞋', '#ffe5ec');
    s += arrow(392, 88, 404, 88, '#ff9eb5');
    s += step(422, 56, '🧦', '再穿袜', '#ffe5ec');
    s += txt(463, 150, '❌ 穿不进', 14, '#d9536b', 'middle', '700');
    return svg(520, 180, s);
  };

  // 3) 循环：每天刷牙
  F.loop_teeth = function () {
    var s = '';
    s += txt(260, 26, '🔁 循环：重复的事一句话搞定', 15.5, '#2f3e52', 'middle', '700');
    s += rect(150, 50, 220, 40, '#eaf6ff', '#7fb2e0');
    s += txt(260, 76, '每天 → 刷牙', 16, '#2f3e52', 'middle', '700');
    for (var i = 0; i < 5; i++) {
      var x = 60 + i * 80;
      s += circ(x + 30, 140, 24, '#fff3cf', '#e6b84d') + txt(x + 30, 148, '🦷', 22);
    }
    s += txt(260, 190, '不用写 5 遍，循环自动重复', 13, '#7a8aa0');
    return svg(520, 210, s);
  };

  // 4) print 说话
  F.print_hello = function () {
    var s = '';
    s += txt(260, 28, 'print() 让电脑开口说话', 16, '#2f3e52', 'middle', '700');
    s += rect(60, 58, 200, 42, '#1f2d3d', '#1f2d3d', 8);
    s += txt(160, 85, 'print("你好")', 16, '#8fd49a', 'middle', '700');
    s += arrow(260, 79, 300, 79, '#5b8fc4');
    s += rect(300, 58, 170, 42, '#e3f7e8', '#8fd49a', 8);
    s += txt(385, 85, '🗣 你好', 16, '#2f3e52', 'middle', '700');
    s += txt(260, 140, '引号里写什么，电脑就说什么', 13, '#7a8aa0');
    return svg(520, 165, s);
  };

  // 5) 计算器：算数
  F.calculator = function () {
    var s = '';
    s += txt(260, 26, '电脑会算数', 16, '#2f3e52', 'middle', '700');
    var oper = [['3+4', '7'], ['10-2', '8'], ['5×6', '30'], ['20÷4', '5']];
    for (var i = 0; i < 4; i++) {
      var x = 30 + i * 120;
      s += rect(x, 56, 100, 44, '#eaf6ff', '#7fb2e0');
      s += txt(x + 50, 83, oper[i][0] + ' =', 15, '#2f3e52', 'middle', '700');
      s += rect(x + 14, 112, 72, 34, '#fff3cf', '#e6b84d');
      s += txt(x + 50, 135, oper[i][1], 16, '#6b5a2e', 'middle', '700');
    }
    s += txt(260, 175, '加减乘除都能算，比手快多啦', 13, '#7a8aa0');
    return svg(520, 200, s);
  };

  // 6) 变量：盒子
  F.variable_box = function () {
    var s = '';
    s += txt(260, 26, '变量 = 给东西起名字的盒子', 15.5, '#2f3e52', 'middle', '700');
    s += rect(70, 56, 130, 80, '#fff3cf', '#e6b84d');
    s += txt(135, 92, '🍎', 34);
    s += txt(135, 128, 'name', 14, '#6b5a2e', 'middle', '700');
    s += txt(250, 100, '← 名字', 14, '#7a8aa0', 'middle');
    s += arrow(200, 96, 200, 96, 'transparent');
    s += rect(320, 56, 150, 80, '#eaf6ff', '#7fb2e0');
    s += txt(395, 92, 'age', 16, '#2f3e52', 'middle', '700');
    s += txt(395, 120, '= 7', 18, '#2f3e52', 'middle', '700');
    s += txt(260, 170, '盒子贴个名字，里面放东西', 13, '#7a8aa0');
    return svg(520, 195, s);
  };

  // 7) 三种数据类型
  F.data_types = function () {
    var s = '';
    s += txt(260, 24, '三种常见的数据类型', 16, '#2f3e52', 'middle', '700');
    s += rect(30, 50, 140, 70, '#eaf6ff', '#7fb2e0');
    s += txt(100, 80, '🔢 数字', 15, '#2f3e52', 'middle', '700');
    s += txt(100, 102, '7 / 3.14', 13, '#5b8fc4', 'middle');
    s += rect(190, 50, 140, 70, '#fff3cf', '#e6b84d');
    s += txt(260, 80, '🔤 文字', 15, '#2f3e52', 'middle', '700');
    s += txt(260, 102, '"你好"', 13, '#6b5a2e', 'middle');
    s += rect(350, 50, 140, 70, '#e3f7e8', '#8fd49a');
    s += txt(420, 80, '✅ 真假', 15, '#2f3e52', 'middle', '700');
    s += txt(420, 102, 'True/False', 13, '#3a9d5d', 'middle');
    s += txt(260, 155, '数字算数，文字说话，真假做判断', 13, '#7a8aa0');
    return svg(520, 180, s);
  };

  // 8) input 提问
  F.input_ask = function () {
    var s = '';
    s += txt(260, 26, 'input() 让电脑提问', 16, '#2f3e52', 'middle', '700');
    s += rect(60, 56, 200, 42, '#1f2d3d', '#1f2d3d', 8);
    s += txt(160, 83, 'input("你几岁")', 14, '#8fd49a', 'middle', '700');
    s += arrow(260, 77, 300, 77, '#5b8fc4');
    s += rect(300, 56, 170, 42, '#fff3cf', '#e6b84d', 8);
    s += txt(385, 83, '💬 7', 15, '#6b5a2e', 'middle', '700');
    s += txt(260, 135, '电脑问，你答，它就记住', 13, '#7a8aa0');
    return svg(520, 160, s);
  };

  // 9) 海龟移动
  F.turtle_move = function () {
    var s = '';
    s += txt(260, 24, '🐢 海龟听指令走路', 16, '#2f3e52', 'middle', '700');
    s += rect(40, 50, 220, 130, '#f4fbf4', '#bfe3bf');
    s += txt(150, 70, 'forward(100)', 13, '#3a9d5d', 'middle');
    s += circ(70, 150, 14, '#8fd49a', '#3a9d5d');
    s += txt(70, 156, '🐢', 16);
    s += arrow(84, 150, 230, 150, '#3a9d5d');
    s += txt(285, 90, 'left(90)', 13, '#5b8fc4', 'middle');
    s += txt(285, 120, 'right(90)', 13, '#5b8fc4', 'middle');
    s += txt(285, 150, '← 转向指令', 12.5, '#7a8aa0', 'middle');
    s += txt(260, 200, '前/后走 + 左/右转，就能画图案', 13, '#7a8aa0');
    return svg(520, 220, s);
  };

  // 10) 画正方形
  F.turtle_square = function () {
    var s = '';
    s += txt(260, 24, '画一个正方形', 16, '#2f3e52', 'middle', '700');
    s += rect(150, 55, 130, 130, '#ffffff', '#7fb2e0');
    s += txt(150, 135, '', 0);
    s += '<polyline points="150,60 280,60 280,185 150,185 150,60" fill="none" stroke="#5b8fc4" stroke-width="3"/>';
    s += txt(215, 215, 'forward → left → 重复 4 次', 13, '#7a8aa0', 'middle');
    s += rect(350, 60, 150, 120, '#1f2d3d', '#1f2d3d', 8);
    s += txt(425, 92, 'for i in range(4):', 12.5, '#8fd49a', 'middle');
    s += txt(425, 116, '  forward(100)', 12.5, '#8fd49a', 'middle');
    s += txt(425, 140, '  left(90)', 12.5, '#8fd49a', 'middle');
    return svg(520, 240, s);
  };

  // 11) 循环画花
  F.loop_pattern = function () {
    var s = '';
    s += txt(260, 24, '🔁 用循环画重复的漂亮图案', 15.5, '#2f3e52', 'middle', '700');
    var cx = 170, cy = 130, n = 8;
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n;
      var px = cx + Math.cos(a) * 70, py = cy + Math.sin(a) * 70;
      s += circ(px, py, 16, '#ffd6e6', '#ff9eb5');
    }
    s += circ(cx, cy, 18, '#fff3cf', '#e6b84d') + txt(cx, cy + 6, '🌸', 18);
    s += rect(330, 70, 160, 90, '#1f2d3d', '#1f2d3d', 8);
    s += txt(410, 100, 'for i in range(8):', 12.5, '#8fd49a', 'middle');
    s += txt(410, 124, '  forward(70)', 12.5, '#8fd49a', 'middle');
    s += txt(410, 148, '  left(45)', 12.5, '#8fd49a', 'middle');
    return svg(520, 220, s);
  };

  // 12) if 分支
  F.if_branch = function () {
    var s = '';
    s += txt(260, 24, 'if：满足条件才做', 16, '#2f3e52', 'middle', '700');
    s += rect(40, 60, 120, 44, '#eaf6ff', '#7fb2e0');
    s += txt(100, 88, 'if 下雨:', 15, '#2f3e52', 'middle', '700');
    s += arrow(160, 82, 200, 82, '#5b8fc4');
    s += rect(200, 60, 130, 44, '#e3f7e8', '#8fd49a');
    s += txt(265, 88, '☔ 带伞', 15, '#2f3e52', 'middle', '700');
    s += rect(200, 120, 130, 44, '#fff0e0', '#ffb877');
    s += txt(265, 148, '🌞 玩去', 15, '#2f3e52', 'middle', '700');
    s += txt(265, 192, 'else：否则做另一件', 13, '#7a8aa0', 'middle');
    return svg(520, 215, s);
  };

  // 13) for 数数
  F.for_count = function () {
    var s = '';
    s += txt(260, 24, 'for：按顺序数数', 16, '#2f3e52', 'middle', '700');
    s += rect(40, 56, 180, 40, '#1f2d3d', '#1f2d3d', 8);
    s += txt(130, 82, 'for i in range(5):', 14, '#8fd49a', 'middle', '700');
    for (var i = 0; i < 5; i++) {
      var x = 60 + i * 90;
      s += circ(x + 30, 140, 26, '#eaf6ff', '#7fb2e0') + txt(x + 30, 148, String(i), 20, '#2f3e52', 'middle', '700');
    }
    s += txt(260, 195, '从 0 数到 4，自动重复 5 次', 13, '#7a8aa0');
    return svg(520, 215, s);
  };

  // 14) while 一直做
  F.while_repeat = function () {
    var s = '';
    s += txt(260, 24, 'while：满足条件就一直做', 15.5, '#2f3e52', 'middle', '700');
    s += rect(40, 56, 200, 42, '#1f2d3d', '#1f2d3d', 8);
    s += txt(140, 83, 'while 没吃饱:', 14, '#8fd49a', 'middle', '700');
    s += arrow(240, 77, 280, 77, '#5b8fc4');
    s += rect(280, 56, 150, 42, '#fff0e0', '#ffb877');
    s += txt(355, 83, '🍚 吃一口', 14, '#2f3e52', 'middle', '700');
    s += txt(355, 130, '↺ 吃饱才停', 14, '#c87f3a', 'middle', '700');
    s += txt(260, 175, '条件不成立，循环才结束', 13, '#7a8aa0');
    return svg(520, 195, s);
  };

  // 15) break / continue
  F.break_continue = function () {
    var s = '';
    s += txt(260, 22, 'break 跳出 · continue 跳过一个', 14.5, '#2f3e52', 'middle', '700');
    s += rect(30, 50, 200, 110, '#f4fbf4', '#bfe3bf');
    s += txt(130, 72, 'for 数 1..5:', 13, '#3a9d5d', 'middle');
    s += txt(130, 96, '1 2 3', 15, '#2f3e52', 'middle', '700');
    s += txt(130, 120, '⛔ break', 13, '#d9536b', 'middle', '700');
    s += txt(130, 144, '(4 5 不数了)', 12, '#7a8aa0', 'middle');
    s += rect(290, 50, 200, 110, '#eaf6ff', '#7fb2e0');
    s += txt(390, 72, 'for 数 1..5:', 13, '#5b8fc4', 'middle');
    s += txt(390, 96, '1 2 4 5', 15, '#2f3e52', 'middle', '700');
    s += txt(390, 120, '↪ skip 3', 13, '#c87f3a', 'middle', '700');
    s += txt(390, 144, '(3 跳过不数)', 12, '#7a8aa0', 'middle');
    return svg(520, 180, s);
  };

  // 16) 列表：一排格子
  F.list_grid = function () {
    var s = '';
    s += txt(260, 24, '列表 = 一排编了号的格子', 15.5, '#2f3e52', 'middle', '700');
    var items = ['🍎', '🍌', '🍇', '🍊'];
    for (var i = 0; i < 4; i++) {
      var x = 40 + i * 115;
      s += rect(x, 60, 100, 70, '#fff3cf', '#e6b84d');
      s += txt(x + 50, 100, items[i], 30, '#2f3e52', 'middle');
      s += txt(x + 50, 122, '[' + i + ']', 13, '#6b5a2e', 'middle', '700');
    }
    s += txt(260, 165, '用编号就能找到第几个', 13, '#7a8aa0');
    return svg(520, 190, s);
  };

  // 17) 字典：名字对应值
  F.dict_map = function () {
    var s = '';
    s += txt(260, 24, '字典 = 名字 对应 一个值', 15.5, '#2f3e52', 'middle', '700');
    var rows = [['"苹果"', '🍎'], ['"香蕉"', '🍌'], ['"葡萄"', '🍇']];
    for (var i = 0; i < 3; i++) {
      var y = 56 + i * 46;
      s += rect(70, y, 150, 38, '#eaf6ff', '#7fb2e0');
      s += txt(145, y + 25, rows[i][0], 14, '#2f3e52', 'middle', '700');
      s += txt(232, y + 25, '→', 18, '#7fb2e0', 'middle');
      s += rect(250, y, 90, 38, '#fff3cf', '#e6b84d');
      s += txt(295, y + 25, rows[i][1], 22, '#2f3e52', 'middle');
    }
    s += txt(260, 215, '凭名字查，不用记编号', 13, '#7a8aa0');
    return svg(520, 235, s);
  };

  // 18) 元组 / 集合
  F.tuple_set = function () {
    var s = '';
    s += txt(260, 22, '元组(不动) 与 集合(不重复)', 14.5, '#2f3e52', 'middle', '700');
    s += rect(30, 50, 210, 60, '#f1e9ff', '#c3a6f0');
    s += txt(135, 76, '元组 (1,2,3)', 15, '#2f3e52', 'middle', '700');
    s += txt(135, 98, '内容固定改不了', 12.5, '#7a5fb0', 'middle');
    s += rect(280, 50, 210, 60, '#e3f7e8', '#8fd49a');
    s += txt(385, 76, '集合 {🍎,🍌}', 15, '#2f3e52', 'middle', '700');
    s += txt(385, 98, '自动去重不排队', 12.5, '#3a9d5d', 'middle');
    s += txt(260, 150, '都是装东西的容器，脾气不同', 13, '#7a8aa0');
    return svg(520, 175, s);
  };

  // 19) 函数：机器
  F.function_machine = function () {
    var s = '';
    s += txt(260, 24, '函数 = 一台加工机器', 16, '#2f3e52', 'middle', '700');
    s += rect(40, 70, 80, 60, '#fff3cf', '#e6b84d');
    s += txt(80, 108, '🍎', 24, '#2f3e52', 'middle');
    s += arrow(120, 100, 175, 100, '#5b8fc4');
    s += rect(175, 60, 170, 80, '#eaf6ff', '#7fb2e0');
    s += txt(260, 92, '🔧 函数', 15, '#2f3e52', 'middle', '700');
    s += txt(260, 116, 'def 榨汁()', 13, '#5b8fc4', 'middle');
    s += arrow(345, 100, 400, 100, '#5b8fc4');
    s += rect(400, 70, 80, 60, '#e3f7e8', '#8fd49a');
    s += txt(440, 108, '🥤', 24, '#2f3e52', 'middle');
    s += txt(260, 175, '丢进去原料，吐出来成品', 13, '#7a8aa0');
    return svg(520, 200, s);
  };

  // 20) 文件读写
  F.file_book = function () {
    var s = '';
    s += txt(260, 24, '文件 = 电脑里的小本本', 16, '#2f3e52', 'middle', '700');
    s += rect(60, 56, 120, 110, '#fff3cf', '#e6b84d');
    s += txt(120, 86, '📖 读', 18, '#6b5a2e', 'middle', '700');
    s += txt(120, 116, 'read()', 13, '#6b5a2e', 'middle');
    s += txt(120, 142, '看本里写的', 11.5, '#7a8aa0', 'middle');
    s += txt(195, 112, '↔', 22, '#7fb2e0', 'middle');
    s += rect(240, 56, 120, 110, '#e3f7e8', '#8fd49a');
    s += txt(300, 86, '✏️ 写', 18, '#3a9d5d', 'middle', '700');
    s += txt(300, 116, 'write()', 13, '#3a9d5d', 'middle');
    s += txt(300, 142, '记到本里', 11.5, '#7a8aa0', 'middle');
    s += txt(420, 100, '📒', 40, '#2f3e52', 'middle');
    s += txt(260, 188, '关掉程序，本里内容还在', 13, '#7a8aa0');
    return svg(520, 208, s);
  };

  // 21) 异常 try-except
  F.try_except = function () {
    var s = '';
    s += txt(260, 24, 'try 试一试，except 接住摔跤', 14.5, '#2f3e52', 'middle', '700');
    s += rect(40, 56, 160, 110, '#eaf6ff', '#7fb2e0');
    s += txt(120, 86, 'try:', 15, '#2f3e52', 'middle', '700');
    s += txt(120, 112, '做可能', 13, '#5b8fc4', 'middle');
    s += txt(120, 132, '出错的事', 13, '#5b8fc4', 'middle');
    s += arrow(200, 100, 235, 100, '#5b8fc4');
    s += rect(235, 56, 175, 110, '#ffe5ec', '#ff9eb5');
    s += txt(322, 86, 'except:', 15, '#d9536b', 'middle', '700');
    s += txt(322, 112, '摔跤了', 13, '#d9536b', 'middle');
    s += txt(322, 132, '温柔接住', 13, '#d9536b', 'middle');
    s += txt(260, 188, '程序不崩，接着跑', 13, '#7a8aa0');
    return svg(520, 208, s);
  };

  // 22) 递归
  F.recursion = function () {
    var s = '';
    s += txt(260, 24, '递归：自己调用自己', 16, '#2f3e52', 'middle', '700');
    s += rect(60, 60, 140, 50, '#f1e9ff', '#c3a6f0');
    s += txt(130, 90, '🪞 大镜子', 14, '#2f3e52', 'middle', '700');
    s += rect(150, 120, 110, 42, '#eaf6ff', '#7fb2e0');
    s += txt(205, 147, '中镜子', 13, '#2f3e52', 'middle');
    s += rect(215, 168, 80, 36, '#fff3cf', '#e6b84d');
    s += txt(255, 192, '小镜子', 12, '#6b5a2e', 'middle');
    s += arrow(200, 110, 205, 120, '#7a5fb0');
    s += arrow(260, 162, 255, 168, '#7a5fb0');
    s += txt(400, 120, '层层缩小', 14, '#7a5fb0', 'middle', '700');
    s += txt(400, 146, '到最小就停', 13, '#7a8aa0', 'middle');
    return svg(520, 215, s);
  };

  // 23) 二分查找
  F.binary_search = function () {
    var s = '';
    s += txt(260, 22, '二分查找：每次砍掉一半', 14.5, '#2f3e52', 'middle', '700');
    var nums = [1, 3, 5, 7, 9, 11, 13, 15];
    for (var i = 0; i < 8; i++) {
      s += rect(40 + i * 58, 56, 50, 40, '#eaf6ff', '#7fb2e0');
      s += txt(65 + i * 58, 82, String(nums[i]), 14, '#2f3e52', 'middle', '700');
    }
    // 高亮中间找 11
    s += rect(40 + 5 * 58, 56, 50, 40, '#fff3cf', '#e6b84d');
    s += txt(65 + 5 * 58, 82, '11', 14, '#6b5a2e', 'middle', '700');
    s += txt(260, 130, '要找 11：先看中间 → 太大砍右半 → …', 13, '#7a8aa0');
    s += txt(260, 156, '几次就找到，比一个个翻快', 13, '#7a8aa0');
    return svg(520, 180, s);
  };

  // 24) 冒泡排序
  F.bubble_sort = function () {
    var s = '';
    s += txt(260, 22, '冒泡排序：相邻比一比，大的往上浮', 13.5, '#2f3e52', 'middle', '700');
    var before = [5, 2, 8, 1, 9], after = [1, 2, 5, 8, 9];
    var baseY = 60;
    for (var i = 0; i < 5; i++) {
      var h1 = 20 + before[i] * 12;
      s += rect(40 + i * 60, baseY + (120 - h1), 44, h1, '#eaf6ff', '#7fb2e0');
      s += txt(62 + i * 60, baseY + 138, String(before[i]), 13, '#5b8fc4', 'middle');
    }
    s += txt(170, baseY + 168, '→', 20, '#7a8aa0', 'middle');
    for (var j = 0; j < 5; j++) {
      var h2 = 20 + after[j] * 12;
      s += rect(290 + j * 48, baseY + (120 - h2), 36, h2, '#e3f7e8', '#8fd49a');
      s += txt(308 + j * 48, baseY + 138, String(after[j]), 13, '#3a9d5d', 'middle');
    }
    return svg(520, 210, s);
  };

  // 25) 柱状图
  F.bar_chart = function () {
    var s = '';
    s += txt(260, 22, '用图表把数字画出来', 15.5, '#2f3e52', 'middle', '700');
    var data = [['周一', 4, '#7fb2e0'], ['周二', 7, '#8fd49a'], ['周三', 5, '#ffd86b'], ['周四', 9, '#ff9eb5']];
    for (var i = 0; i < 4; i++) {
      var h = data[i][1] * 13;
      s += rect(60 + i * 110, 170 - h, 70, h, data[i][2], '#ffffff', 6);
      s += txt(95 + i * 110, 188, data[i][0], 12.5, '#2f3e52', 'middle');
      s += txt(95 + i * 110, 170 - h - 8, String(data[i][1]), 13, '#2f3e52', 'middle', '700');
    }
    s += line(40, 170, 480, 170, '#c5d6e6', 2);
    return svg(520, 210, s);
  };

  // 26) 类与对象：蓝图
  F.class_blueprint = function () {
    var s = '';
    s += txt(260, 22, '类 = 蓝图，对象 = 照蓝图造的实物', 13.5, '#2f3e52', 'middle', '700');
    s += rect(40, 50, 150, 80, '#f1e9ff', '#c3a6f0');
    s += txt(115, 80, '📐 类 Cat', 14, '#2f3e52', 'middle', '700');
    s += txt(115, 104, '会喵/有名字', 12, '#7a5fb0', 'middle');
    s += arrow(190, 90, 235, 90, '#7a5fb0');
    s += rect(235, 50, 110, 70, '#fff3cf', '#e6b84d');
    s += txt(290, 78, '🐱 咪咪', 14, '#2f3e52', 'middle', '700');
    s += txt(290, 100, '对象①', 12, '#6b5a2e', 'middle');
    s += rect(235, 130, 110, 70, '#e3f7e8', '#8fd49a');
    s += txt(290, 158, '🐱 花花', 14, '#2f3e52', 'middle', '700');
    s += txt(290, 180, '对象②', 12, '#3a9d5d', 'middle');
    s += txt(420, 110, '一张蓝图', 13, '#7a5fb0', 'middle', '700');
    s += txt(420, 134, '造很多只', 13, '#7a8aa0', 'middle');
    return svg(520, 215, s);
  };

  // 27) Python 起源：Guido + Monty Python 喜剧团
  F.python_origin = function () {
    var s = '';
    s += txt(260, 26, '🐍 Python 是怎么来的？', 16, '#2f3e52', 'middle', '700');
    // 左：Guido 写代码
    s += rect(28, 52, 150, 96, '#eaf6ff', '#7fb2e0');
    s += txt(103, 78, '👨‍💻 Guido', 14, '#2f3e52', 'middle', '700');
    s += txt(103, 100, '荷兰程序员', 12.5, '#5b8fc4', 'middle');
    s += txt(103, 126, '1989 圣诞假期', 12, '#7a8aa0', 'middle');
    s += txt(103, 144, '开始写 Python', 12, '#7a8aa0', 'middle');
    // 中：箭头
    s += arrow(178, 100, 232, 100, '#5b8fc4');
    // 中：Monty Python 喜剧团
    s += rect(232, 52, 150, 96, '#fff3cf', '#e6b84d');
    s += txt(307, 80, '🎬 Monty Python', 13.5, '#2f3e52', 'middle', '700');
    s += txt(307, 102, 'Guido 爱看的', 12.5, '#6b5a2e', 'middle');
    s += txt(307, 122, '搞笑喜剧团', 12.5, '#6b5a2e', 'middle');
    s += txt(307, 142, '名字就这么来', 12, '#6b5a2e', 'middle');
    // 右：箭头 + 1991 发布
    s += arrow(382, 100, 420, 100, '#5b8fc4');
    s += rect(420, 52, 92, 96, '#e3f7e8', '#8fd49a');
    s += txt(466, 82, '🚀 1991', 15, '#2f3e52', 'middle', '700');
    s += txt(466, 106, '第一版', 12.5, '#3a9d5d', 'middle');
    s += txt(466, 128, '发布啦', 12.5, '#3a9d5d', 'middle');
    // 底部：现在的地位
    s += rect(60, 168, 400, 30, '#f3edff', '#c3a6f0', 8);
    s += txt(260, 188, '现在：全球几千万人在用，AI 时代最火的编程语言之一', 12.5, '#7a5fb0', 'middle', '700');
    return svg(520, 212, s);
  };

  // 28) 字符串魔法
  F.string_magic = function () {
    var s = '';
    s += txt(260, 24, '🪄 字符串的四种魔法', 15.5, '#2f3e52', 'middle', '700');
    var data = [
      ['📏', 'len() 量长度', '"猫咪"→2'],
      ['✂️', '切片段', '"hello"[1:3]→el'],
      ['🔠', '变大小写', '"hi".upper()→HI'],
      ['🔗', '塞进句子', 'f"你好{name}"']
    ];
    for (var i = 0; i < 4; i++) {
      var x = 18 + i * 126;
      s += rect(x, 50, 110, 110, i % 2 ? '#fff3cf' : '#eaf6ff', i % 2 ? '#e6b84d' : '#7fb2e0');
      s += txt(x + 55, 82, data[i][0], 26, '#2f3e52', 'middle');
      s += txt(x + 55, 112, data[i][1], 11.5, '#2f3e52', 'middle', '700');
      s += txt(x + 55, 138, data[i][2], 10.5, '#7a8aa0', 'middle');
    }
    s += txt(260, 188, '引号里那串字，不只是被打印，还会变魔术', 12.5, '#7a8aa0', 'middle');
    return svg(520, 210, s);
  };

  // 29) 逻辑门 and / or / not
  F.logic_gate = function () {
    var s = '';
    s += txt(260, 24, '🔗 把条件连起来的三个词', 15.5, '#2f3e52', 'middle', '700');
    s += rect(20, 48, 150, 78, '#eaf6ff', '#7fb2e0');
    s += txt(95, 76, 'and', 17, '#2f3e52', 'middle', '700');
    s += txt(95, 100, '两边都行才过', 12, '#5b8fc4', 'middle');
    s += txt(95, 122, '✅真 and 真=真', 11, '#3a9d5d', 'middle');
    s += rect(185, 48, 150, 78, '#fff3cf', '#e6b84d');
    s += txt(260, 76, 'or', 17, '#2f3e52', 'middle', '700');
    s += txt(260, 100, '有一边就行', 12, '#6b5a2e', 'middle');
    s += txt(260, 122, '❌假 or 真=真', 11, '#3a9d5d', 'middle');
    s += rect(350, 48, 150, 78, '#e3f7e8', '#8fd49a');
    s += txt(425, 76, 'not', 17, '#2f3e52', 'middle', '700');
    s += txt(425, 100, '把对错反过来', 12, '#3a9d5d', 'middle');
    s += txt(425, 122, 'not 真=假', 11, '#3a9d5d', 'middle');
    s += txt(260, 158, '用它们拼出复杂的判断', 12.5, '#7a8aa0', 'middle');
    return svg(520, 185, s);
  };

  // 30) 列表推导式
  F.list_comp = function () {
    var s = '';
    s += txt(260, 24, '⚡️ 一行造出一排格子', 15.5, '#2f3e52', 'middle', '700');
    s += txt(110, 70, '[i for i in range(5)]', 14, '#2f3e52', 'middle', '700');
    s += arrow(190, 70, 240, 70, '#5b8fc4');
    var labels = ['0', '1', '2', '3', '4'];
    for (var i = 0; i < 5; i++) s += rect(250 + i * 44, 48, 36, 44, '#eaf6ff', '#7fb2e0', 6) + txt(268 + i * 44, 75, labels[i], 14, '#2f3e52', 'middle', '700');
    s += txt(110, 122, '加 if 还能筛选：', 13, '#2f3e52', 'middle', '700');
    s += txt(300, 122, '[x for x in nums if x>0]', 13, '#2f3e52', 'middle', '700');
    s += txt(260, 168, '普通要写好几行的循环，这里一行搞定', 12.5, '#7a8aa0', 'middle');
    return svg(520, 190, s);
  };

  // 31) lambda 匿名函数
  F.lambda_fun = function () {
    var s = '';
    s += txt(260, 24, '🕶 一行写的小函数', 15.5, '#2f3e52', 'middle', '700');
    s += rect(20, 52, 220, 70, '#eaf6ff', '#7fb2e0');
    s += txt(130, 80, 'square = lambda x: x * x', 13.5, '#2f3e52', 'middle', '700');
    s += txt(130, 104, '不用 def 起名字也能用', 11.5, '#5b8fc4', 'middle');
    s += arrow(240, 87, 288, 87, '#5b8fc4');
    s += rect(288, 52, 212, 70, '#fff3cf', '#e6b84d');
    s += txt(394, 80, 'square(5) → 25', 14, '#2f3e52', 'middle', '700');
    s += txt(394, 104, '临时小计算最方便', 11.5, '#6b5a2e', 'middle');
    s += txt(260, 158, '适合只用到一次的小本领', 12.5, '#7a8aa0', 'middle');
    return svg(520, 185, s);
  };

  // 32) JSON 便签
  F.json_note = function () {
    var s = '';
    s += txt(260, 24, '🗒 JSON：电脑间的便签条', 15.5, '#2f3e52', 'middle', '700');
    s += rect(30, 50, 220, 96, '#fff3cf', '#e6b84d', 8);
    s += txt(140, 78, '{ "name": "小光",', 12.5, '#2f3e52', 'middle', '700');
    s += txt(140, 100, '  "age": 8 }', 12.5, '#2f3e52', 'middle', '700');
    s += txt(140, 124, '名字 : 值 成对写', 11.5, '#6b5a2e', 'middle');
    s += arrow(250, 98, 296, 98, '#5b8fc4');
    s += rect(296, 50, 200, 96, '#eaf6ff', '#7fb2e0', 8);
    s += txt(396, 78, '🐍  ↔  🌐', 18, '#2f3e52', 'middle', '700');
    s += txt(396, 104, 'Python 和网页', 12, '#5b8fc4', 'middle');
    s += txt(396, 124, '都看得懂', 12, '#5b8fc4', 'middle');
    s += txt(260, 172, 'json.dumps 存、json.loads 读', 12.5, '#7a8aa0', 'middle');
    return svg(520, 195, s);
  };

  // 33) 继承树
  F.inherit_tree = function () {
    var s = '';
    s += txt(260, 22, '🧬 子类继承父类的本领', 15.5, '#2f3e52', 'middle', '700');
    s += rect(175, 44, 170, 50, '#f1e9ff', '#c3a6f0');
    s += txt(260, 74, '🐾 父类 Animal', 14, '#2f3e52', 'middle', '700');
    s += txt(260, 96, '会吃 / 会睡', 12, '#7a5fb0', 'middle');
    s += arrow(210, 94, 175, 130, '#7a5fb0');
    s += arrow(310, 94, 345, 130, '#7a5fb0');
    s += rect(110, 132, 130, 54, '#eaf6ff', '#7fb2e0');
    s += txt(175, 158, '🐱 子类 Cat', 13.5, '#2f3e52', 'middle', '700');
    s += txt(175, 180, '+ 会喵喵', 11.5, '#5b8fc4', 'middle');
    s += rect(280, 132, 130, 54, '#e3f7e8', '#8fd49a');
    s += txt(345, 158, '🐶 子类 Dog', 13.5, '#2f3e52', 'middle', '700');
    s += txt(345, 180, '+ 会汪汪', 11.5, '#3a9d5d', 'middle');
    s += txt(260, 210, '不用重写，直接继承再扩展', 12.5, '#7a8aa0', 'middle');
    return svg(520, 230, s);
  };

  window.FIGURES = F;
})();
