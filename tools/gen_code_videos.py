# -*- coding: utf-8 -*-
"""代码执行可视化视频引擎：把每课真代码跑起来，逐行高亮 + 变量实时变化 + 输出逐条蹦出 + 萌系吉祥物 + 晓晓配音。
零积分 / 本地 ffmpeg / 离线。用法: python3 gen_code_videos.py [课号...]  (不传=全42课, 幂等)
"""
import sys, io, os, json, subprocess, math, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYS_FFMPEG = '/Users/xiaoguang/homebrew/Cellar/ffmpeg/8.1.2_1/bin/ffmpeg'
FPS = 25
STEP_FRAMES = 30          # 每步约1.2s
INTRO_FRAMES = 25
OUTRO_FRAMES = 38
MAX_STEPS = 48            # 防死循环/超长

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception as e:
    print('PIL 未安装:', e); sys.exit(1)

FONT_PATH = '/System/Library/Fonts/Hiragino Sans GB.ttc'
_FALLBACK = ['/System/Library/Fonts/STHeiti Light.ttc', '/System/Library/Fonts/PingFang.ttc']
_fcache = {}
def F(sz):
    if sz in _fcache: return _fcache[sz]
    try:
        f = ImageFont.truetype(FONT_PATH, sz)
    except Exception:
        for p in _FALLBACK:
            try: f = ImageFont.truetype(p, sz); break
            except Exception: continue
        else: f = ImageFont.load_default()
    _fcache[sz] = f
    return f

# 调色板 (萌系统一)
BG_TOP   = (225, 240, 255)
BG_BOT   = (245, 250, 255)
BAR      = (90, 130, 220)
BAR_DK   = (60, 95, 180)
CODE_BG  = (38, 42, 66)
CODE_FUT = (120, 126, 150)
CODE_DONE= (120, 210, 150)
CODE_NOW = (255, 214, 89)
CODE_NOW_TXT = (40, 40, 40)
PANEL    = (255, 255, 255)
PANEL_BD = (200, 214, 240)
VAR_TXT  = (50, 60, 90)
OUT_TXT  = (90, 200, 130)
MASCOT   = (255, 196, 120)
MASCOT_DK= (230, 160, 80)
BLUSH    = (255, 150, 170)
WHITE    = (255, 255, 255)
DARK     = (45, 50, 70)
GREY     = (110, 116, 140)

# 代码语法高亮 (深背景高对比)
TK_COMMENT = (132, 160, 142)
TK_STRING  = (120, 222, 162)
TK_NUMBER  = (255, 184, 112)
TK_KEYWORD = (120, 200, 255)
TK_FUNC    = (208, 172, 255)
TK_IDENT   = (222, 228, 246)
TK_OP      = (182, 192, 218)
TK_LINENO  = (150, 162, 192)
DONE_BG    = (46, 58, 55)       # 已执行行淡绿背景

W, H = 1280, 720

def rrect(d, box, r, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

def safe_repr(v):
    try:
        s = repr(v)
    except Exception:
        try: s = str(v)
        except Exception: s = '?'
    return s if len(s) <= 40 else s[:37] + '...'

# ---------------- 萌系吉祥物 (小电脑精灵) ----------------
def draw_mascot(d, cx, cy, s=1.0, expr='happy'):
    # s: 缩放; 本体约 120*s 宽
    bw, bh = 120*s, 96*s
    x0, y0 = cx - bw/2, cy - bh/2
    # 天线
    d.line([(cx, y0), (cx, y0-22*s)], fill=MASCOT_DK, width=int(4*s))
    d.ellipse([cx-7*s, y0-30*s, cx+7*s, y0-16*s], fill=(255,120,150))
    # 屏幕身体
    rrect(d, [x0, y0, x0+bw, y0+bh], int(18*s), fill=MASCOT, outline=MASCOT_DK, width=int(3*s))
    # 内屏
    ix0, iy0, ix1, iy1 = x0+12*s, y0+14*s, x0+bw-12*s, y0+bh-16*s
    rrect(d, [ix0, iy0, ix1, iy1], int(10*s), fill=WHITE)
    # 眼睛
    ey = (iy0+iy1)/2 - 4*s
    er = 11*s
    for ex in (cx-22*s, cx+22*s):
        d.ellipse([ex-er, ey-er, ex+er, ey+er], fill=DARK)
        d.ellipse([ex-er+3*s, ey-er+2*s, ex-er+9*s, ey-er+8*s], fill=WHITE)
    # 腮红
    d.ellipse([cx-40*s, ey+10*s, cx-22*s, ey+22*s], fill=BLUSH)
    d.ellipse([cx+22*s, ey+10*s, cx+40*s, ey+22*s], fill=BLUSH)
    # 嘴
    if expr == 'wow':
        d.ellipse([cx-7*s, ey+12*s, cx+7*s, ey+24*s], fill=MASCOT_DK)
    else:
        d.arc([cx-12*s, ey+10*s, cx+12*s, ey+26*s], 10, 170, fill=MASCOT_DK, width=int(3*s))
    # 小手
    d.ellipse([x0-14*s, cy-6*s, x0+2*s, cy+12*s], fill=MASCOT, outline=MASCOT_DK, width=int(2*s))
    d.ellipse([x0+bw-2*s, cy-6*s, x0+bw+14*s, cy+12*s], fill=MASCOT, outline=MASCOT_DK, width=int(2*s))

# ---------------- 代码执行追踪 ----------------
# 海龟桩：让视频追踪器能"执行" forward/left/right 等海龟指令而不报错，
# 同时把海龟的动作打印到输出面板，让画面更生动（海龟课不能真渲染图形，用文字动作代替）。
def _turtle_forward(n): print("🐢 向前走 %d 步" % int(n))
def _turtle_back(n): print("🐢 向后走 %d 步" % int(n))
def _turtle_backward(n): print("🐢 向后走 %d 步" % int(n))
def _turtle_left(n): print("🐢 向左转 %d 度" % int(n))
def _turtle_right(n): print("🐢 向右转 %d 度" % int(n))
TURTLE_STUBS = {
    'forward': _turtle_forward, 'back': _turtle_back, 'backward': _turtle_backward,
    'left': _turtle_left, 'right': _turtle_right,
}
TURTLE_IDS = {'c3l1', 'c3l2', 'c3l3'}

def trace_code(source, stubs=None):
    lines = source.split('\n')
    glob, loc = {}, {}
    if stubs:
        glob.update(stubs)
    out_buf = io.StringIO()
    class Cap:
        def write(self, s): out_buf.write(s)
        def flush(self): pass
    class FakeIn:
        def readline(self, *a): return '\n'
        def read(self, *a): return ''
    old_out, old_in = sys.stdout, sys.stdin
    sys.stdout, sys.stdin = Cap(), FakeIn()
    steps = []
    pending = [None]
    last_vars = [{}]
    def snap(frame):
        return {k: safe_repr(v) for k, v in frame.f_locals.items()
                if k != '__builtins__' and not k.startswith('__')}
    def tracer(frame, event, arg):
        # 只追踪用户代码自身行, 排除 print/io 等内部实现帧
        if event == 'line' and frame.f_code.co_filename == '<code>':
            ln = frame.f_lineno
            if ln < 1 or ln > len(lines):
                return tracer
            cur = snap(frame)
            if pending[0] is not None:
                steps.append({'line': pending[0], 'vars': dict(last_vars[0]), 'output': out_buf.getvalue()})
            pending[0] = ln
            last_vars[0] = cur
        return tracer
    err = None
    sys.settrace(tracer)
    try:
        exec(compile(source, '<code>', 'exec'), glob, loc)
    except Exception as e:
        err = str(e)
    finally:
        sys.settrace(None)
        sys.stdout, sys.stdin = old_out, old_in
    final = {**glob, **loc}; final.pop('__builtins__', None)
    if pending[0] is not None:
        steps.append({'line': pending[0], 'vars': {k: safe_repr(v) for k,v in final.items()}, 'output': out_buf.getvalue()})
    if err:
        steps.append({'line': None, 'vars': {}, 'output': out_buf.getvalue(), 'error': err})
    if len(steps) > MAX_STEPS:
        steps = steps[:MAX_STEPS]
    return steps, lines

# ---------------- 帧渲染 ----------------
def bg(d):
    for y in range(H):
        t = y / H
        r = int(BG_TOP[0]*(1-t)+BG_BOT[0]*t)
        g = int(BG_TOP[1]*(1-t)+BG_BOT[1]*t)
        b = int(BG_TOP[2]*(1-t)+BG_BOT[2]*t)
        d.line([(0,y),(W,y)], fill=(r,g,b))

def topbar(d, title):
    rrect(d, [0,0,W,84], 0, fill=BAR)
    d.text((32, 26), title, font=F(34), fill=WHITE)
    draw_mascot(d, W-70, 42, 0.42, 'happy')

# 代码语法着色（逐 token 上色，深背景上高对比）
TOKEN_RE = re.compile(r'''
      (?P<comment>\#.*)
    | (?P<string>"[^"]*"|'[^']*')
    | (?P<number>\b\d+(?:\.\d+)?\b)
    | (?P<keyword>\b(?:def|for|if|elif|else|while|in|return|import|from|as|with|yield|try|except|finally|break|continue|pass|lambda|class|global|nonlocal|and|or|not|is|None|True|False|async|await)\b)
    | (?P<func>\b[a-zA-Z_]\w*(?=\s*\())
    | (?P<ident>\b[a-zA-Z_]\w*\b)
    | (?P<op>[+\-*/%=<>!&|^~:.,()\[\]{}]+)
    | (?P<ws>\s+)
    | (?P<misc>[^\s])
''', re.VERBOSE)

def _tok_color(kind):
    return {'comment':TK_COMMENT,'string':TK_STRING,'number':TK_NUMBER,
            'keyword':TK_KEYWORD,'func':TK_FUNC,'ident':TK_IDENT,
            'op':TK_OP,'ws':None,'misc':TK_IDENT}.get(kind)

def draw_code_line(d, cx, yy, text, font, kind):
    """kind: 'cur' 当前行(黄底, 整行深字单色) / 'done' 已执行(淡绿底, 高亮) / 'fut' 未到(透明, 高亮)。"""
    if kind == 'cur':
        d.text((cx, yy), text, font=font, fill=CODE_NOW_TXT)
        return font.getlength(text)
    x = cx
    for m in TOKEN_RE.finditer(text):
        t = m.group(); k = m.lastgroup
        col = _tok_color(k)
        if col is None:
            x += font.getlength(t); continue
        d.text((x, yy), t, font=font, fill=col)
        x += font.getlength(t)
    return x - cx

def code_panel(d, lines, cur_line, y=120, h=560):
    x, w = 40, 720
    rrect(d, [x,y,x+w,y+h], 18, fill=CODE_BG)
    d.text((x+24, y+16), '代码', font=F(22), fill=(180,190,220))
    ty = y+58
    lh = 38
    cx0 = x + 72          # 代码文本起始 x（行号占 x+26 ~ x+70）
    right_limit = x + w - 20
    avail = right_limit - cx0
    base_fsz = 24
    for i, ln in enumerate(lines, 1):
        yy = ty + (i-1)*lh
        if yy > y+h-30: break
        fsz = base_fsz
        if F(fsz).getlength(ln) > avail:
            fsz = base_fsz - 5
        d.text((x+26, yy), f'{i:>2}', font=F(20), fill=TK_LINENO)
        if i == cur_line:
            rrect(d, [x+14, yy-4, x+w-14, yy+lh-2], 8, fill=CODE_NOW)
            d.polygon([(x+2, yy+2),(x+14, yy+10),(x+2, yy+18)], fill=CODE_NOW)
            draw_code_line(d, cx0, yy, ln, F(fsz), 'cur')
        elif cur_line is None or i > cur_line:
            draw_code_line(d, cx0, yy, ln, F(fsz), 'fut')
        else:
            rrect(d, [x+14, yy-4, x+w-14, yy+lh-2], 8, fill=DONE_BG)
            draw_code_line(d, cx0, yy, ln, F(fsz), 'done')

def vars_panel(d, vars_dict, y=120, h=270):
    x, w = 790, 450
    rrect(d, [x,y,x+w,y+h], 18, fill=PANEL, outline=PANEL_BD, width=2)
    d.text((x+22, y+16), '变量', font=F(22), fill=BAR_DK)
    if not vars_dict:
        d.text((x+22, y+60), '（运行后会出现）', font=F(22), fill=GREY)
        return
    ty = y+58; lh=44
    for i,(k,v) in enumerate(vars_dict.items()):
        yy = ty + i*lh
        if yy > y+h-30: break
        rrect(d, [x+18, yy-4, x+w-18, yy+lh-8], 10, fill=(236,242,255))
        d.text((x+30, yy+6), f'{k}', font=F(22), fill=BAR_DK)
        d.text((x+30+F(22).getlength(k)+10, yy+6), '=', font=F(22), fill=GREY)
        d.text((x+30+F(22).getlength(k)+40, yy+6), v, font=F(22), fill=VAR_TXT)

def out_panel(d, output, y=410, h=270):
    x, w = 790, 450
    rrect(d, [x,y,x+w,y+h], 18, fill=(28,32,52))
    d.text((x+22, y+16), '输出', font=F(22), fill=(150,200,170))
    ty = y+56; lh=34
    for j, ln in enumerate(output.split('\n')):
        yy = ty + j*lh
        if yy > y+h-24: break
        d.text((x+24, yy), ln if ln else ' ', font=F(22), fill=OUT_TXT)

def mascot_say(d, text):
    # 左下角吉祥物 + 气泡
    draw_mascot(d, 120, 640, 0.8, 'happy')
    bx, by, bw, bh = 200, 560, 360, 90
    rrect(d, [bx,by,bx+bw,by+bh], 18, fill=WHITE, outline=PANEL_BD, width=2)
    d.polygon([(bx+10,by+bh-6),(bx-18,by+bh+26),(bx+40,by+bh-2)], fill=WHITE)
    # 自动换行
    words = text
    lines = []
    cur=''
    for ch in words:
        if F(22).getlength(cur+ch) > bw-40:
            lines.append(cur); cur=ch
        else: cur+=ch
    if cur: lines.append(cur)
    for i,ln in enumerate(lines[:2]):
        d.text((bx+22, by+24+i*30), ln, font=F(22), fill=DARK)

def frame_code(title, lines, cur_line, vars_dict, output, say, reserve_sub=False):
    img = Image.new('RGB',(W,H)); d = ImageDraw.Draw(img)
    bg(d); topbar(d, title)
    if reserve_sub:
        # 底部 552-720 留给字幕条：代码/变量/输出面板上移，不画说话气泡
        code_panel(d, lines, cur_line, y=104, h=420)
        vars_panel(d, vars_dict, y=104, h=200)
        out_panel(d, output, y=320, h=200)
    else:
        code_panel(d, lines, cur_line)
        vars_panel(d, vars_dict)
        out_panel(d, output)
        mascot_say(d, say)
    return img

def frame_concept(title, points, idx, sub=''):
    img = Image.new('RGB',(W,H)); d = ImageDraw.Draw(img)
    bg(d); topbar(d, title)
    # 大吉祥物居中偏左
    draw_mascot(d, 250, 400, 1.6, 'wow')
    # 右侧逐条要点
    x = 520
    d.text((x, 130), '这一节你会懂：', font=F(28), fill=BAR_DK)
    for i,p in enumerate(points):
        yy = 200 + i*90
        col = (90,200,130) if i <= idx else GREY
        rrect(d, [x, yy, x+44, yy+44], 22, fill=col)
        d.text((x+14, yy+6), str(i+1), font=F(26), fill=WHITE)
        d.text((x+64, yy+6), p, font=F(26), fill=DARK if i<=idx else GREY)
    if sub:
        d.text((x, 200+len(points)*90+10), sub, font=F(22), fill=GREY)
    return img

# ---------------- 海龟真画图 ----------------
# 海龟课不能只打印文字，要真把线画出来。下面这套把海龟代码"执行"一遍，
# 算出每一行的画笔轨迹与海龟位置，供视频帧渲染出真正的海龟画布。
def trace_turtle(source):
    """执行海龟代码，返回 (steps, lines)。
    每个 step: line=当前行号, path=到该行结束已画出的全部线段[(x1,y1,x2,y2)...],
               state=海龟当前状态{x,y,heading,pen}, new_segs=本行新增线段。
    坐标系: 数学坐标 y 向上, 朝向0=向东(+x), left=逆时针(角度增)。"""
    lines = source.split('\n')
    state = {'x': 0.0, 'y': 0.0, 'heading': 0.0, 'pen': True}
    path = []      # 线段列表
    tags = []      # 每条线段所属行号(用于 new_segs 归类)
    cur_line = [0]
    steps = []
    pending = [None]

    def add_seg(x1, y1, x2, y2):
        path.append((x1, y1, x2, y2)); tags.append(cur_line[0])

    def forward(n):
        n = float(n); h = math.radians(state['heading'])
        nx = state['x'] + n * math.cos(h); ny = state['y'] + n * math.sin(h)
        if state['pen']: add_seg(state['x'], state['y'], nx, ny)
        state['x'], state['y'] = nx, ny
    def back(n): forward(-float(n))
    def left(a): state['heading'] += float(a)
    def right(a): state['heading'] -= float(a)
    def penup(): state['pen'] = False
    def pendown(): state['pen'] = True
    def goto(x, y):
        if state['pen']: add_seg(state['x'], state['y'], float(x), float(y))
        state['x'], state['y'] = float(x), float(y)
    def setheading(a): state['heading'] = float(a)

    funcs = {'forward': forward, 'back': back, 'left': left, 'right': right,
             'penup': penup, 'pendown': pendown, 'pu': penup, 'pd': pendown,
             'goto': goto, 'setheading': setheading}
    builtins = {'range': range, 'int': int, 'float': float, 'abs': abs,
                'len': len, 'print': print, 'round': round}
    glob = {'__builtins__': builtins}; glob.update(funcs)

    def tracer(frame, event, arg):
        # 在"下一行开始"时定格上一行：此刻 path/state 已是上一行执行完的状态
        if event == 'line' and frame.f_code.co_filename == '<code>':
            ln = frame.f_lineno
            if ln < 1 or ln > len(lines): return tracer
            if pending[0] is not None:
                new = [path[i] for i in range(len(path)) if tags[i] == pending[0]]
                steps.append({'line': pending[0], 'path': list(path),
                              'state': dict(state), 'new_segs': new})
            pending[0] = ln
            cur_line[0] = ln
        return tracer
    err = None
    sys.settrace(tracer)
    try:
        exec(compile(source, '<code>', 'exec'), glob, {})
    except Exception as e:
        err = str(e)
    sys.settrace(None)
    if pending[0] is not None:
        new = [path[i] for i in range(len(path)) if tags[i] == pending[0]]
        steps.append({'line': pending[0], 'path': list(path),
                      'state': dict(state), 'new_segs': new})
    if err:
        steps.append({'line': None, 'path': list(path),
                      'state': dict(state), 'new_segs': [], 'error': err})
    if len(steps) > MAX_STEPS:
        steps = steps[:MAX_STEPS]
    return steps, lines


def turtle_canvas(d, box, path, state):
    x, y, w, h = box
    rrect(d, [x, y, x+w, y+h], 18, fill=PANEL, outline=PANEL_BD, width=2)
    d.text((x+22, y+16), '海龟画布', font=F(22), fill=BAR_DK)
    segs = path or []
    pts = []
    for (x1, y1, x2, y2) in segs:
        pts.append((x1, y1)); pts.append((x2, y2))
    if state: pts.append((state['x'], state['y']))
    if pts:
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    else:
        minx, maxx, miny, maxy = -10, 130, -10, 130
    inner_x = x + 20; inner_y = y + 54
    inner_w = w - 40; inner_h = h - 74
    ww = (maxx - minx) or 1; wh = (maxy - miny) or 1
    scale = min(inner_w / ww, inner_h / wh)
    scale = min(scale, 3.0)
    uw = ww * scale; uh = wh * scale
    ox = inner_x + (inner_w - uw) / 2 - minx * scale
    base_y = inner_y + (inner_h - uh) / 2 + maxy * scale

    def w2c(wx, wy):
        return (ox + wx * scale, base_y - wy * scale)

    for (x1, y1, x2, y2) in segs:
        a = w2c(x1, y1); b = w2c(x2, y2)
        d.line([a, b], fill=(90, 130, 220), width=4)

    if state:
        tx, ty = w2c(state['x'], state['y'])
        h = math.radians(state['heading'])
        dx, dy = math.cos(h), -math.sin(h)
        px, py = -dy, dx
    else:
        tx, ty = w2c(0, 0)
        dx, dy, px, py = 1.0, 0.0, 0.0, 1.0
    tip = (tx + 13 * dx, ty + 13 * dy)
    b1 = (tx - 9 * dx + 8 * px, ty - 9 * dy + 8 * py)
    b2 = (tx - 9 * dx - 8 * px, ty - 9 * dy - 8 * py)
    d.polygon([tip, b1, b2], fill=MASCOT, outline=MASCOT_DK, width=2)
    d.ellipse([tip[0]-3, tip[1]-3, tip[0]+3, tip[1]+3], fill=DARK)


def frame_turtle(title, lines, cur_line, path, state, say, reserve_sub=False):
    img = Image.new('RGB', (W, H)); d = ImageDraw.Draw(img)
    bg(d); topbar(d, title)
    if reserve_sub:
        # 底部 552-720 留给字幕条：代码/海龟画布上移，不画说话气泡
        code_panel(d, lines, cur_line, y=104, h=420)
        turtle_canvas(d, (790, 104, 450, 420), path, state)
    else:
        code_panel(d, lines, cur_line)
        turtle_canvas(d, (790, 120, 450, 560), path, state)
        mascot_say(d, say)
    return img

# ---------------- 视频合成 ----------------
def render_frames(idv, title, kind, payload):
    fd = os.path.join(ROOT, 'tools', '_frames', idv)
    os.makedirs(fd, exist_ok=True)
    frames = []
    if kind == 'code':
        steps, lines = payload
        # intro
        for _ in range(INTRO_FRAMES):
            frames.append(frame_code(title, lines, None, {}, '', '看电脑怎么一步步跑~'))
        # steps
        for st in steps:
            ln = st.get('line'); v = st.get('vars', {}); o = st.get('output','')
            if ln is None:
                say = '咦，这里出错了：' + st.get('error','?')[:18]
            elif st.get('error'):
                say = '运行完啦！'
            else:
                say = f'运行第 {ln} 行'
            for _ in range(STEP_FRAMES):
                frames.append(frame_code(title, lines, ln, v, o, say))
        # outro
        for _ in range(OUTRO_FRAMES):
            frames.append(frame_code(title, lines, None, v, o, '你学会啦！'))
    else:
        points, subs = payload
        total = INTRO_FRAMES + len(points)*STEP_FRAMES + OUTRO_FRAMES
        # intro
        for _ in range(INTRO_FRAMES):
            frames.append(frame_concept(title, points, -1))
        for i,p in enumerate(points):
            for _ in range(STEP_FRAMES):
                frames.append(frame_concept(title, points, i, subs[i] if i<len(subs) else ''))
        for _ in range(OUTRO_FRAMES):
            frames.append(frame_concept(title, points, len(points)-1))
    # 存盘
    paths=[]
    for i,fr in enumerate(frames,1):
        p = os.path.join(fd, f'{i:04d}.png')
        fr.save(p); paths.append(p)
    return fd, len(frames)

def to_mp4(fd, n, narrate, out):
    pat = os.path.join(fd, '%04d.png')
    cmd = [SYS_FFMPEG,'-y','-framerate',str(FPS),'-i',pat]
    if narrate and os.path.exists(narrate):
        cmd += ['-i', narrate, '-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-shortest', out]
    else:
        cmd += ['-c:v','libx264','-pix_fmt','yuv420p','-r',str(FPS), out]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0

# ---------------- 概念课要点 ----------------
CONCEPTS = {
 'py1': (['Python 是 1991 年诞生的','发明人叫吉多，来自荷兰','名字来自一个马戏团','语法简单，像写英语','今天最流行的语言之一'],
         ['比很多语言都年长，却越活越年轻','他被称为“仁慈的独裁者”','不是蛇，是《蒙提·派森》飞行马戏团','少写符号，小朋友也能懂','网站、游戏、人工智能都在用它']),
 'c0l1': (['程序 = 一步一步的指令','电脑严格按顺序照做','你写，电脑执行'],
          ['就像给机器人看的菜谱','先写先执行，顺序不能乱','学会写，电脑就听你的']),
 'c0l2': (['事情要按 1→2→3 做','顺序错了结果就错','电脑最讲秩序'],
          ['先穿袜子再穿鞋','一步步来才不会乱','顺序思维是编程地基']),
 'c0l3': (['重复的事交给「循环」','一次写好，反复执行','省时又不容易错'],
          ['刷牙每天做，循环搞定','for/while 是循环命令','循环让电脑不知疲倦']),
 'py2': (['路线图：思维热身→做小游戏','每节：视频→讲义→练习→讲一讲','闯关收集勋章，家长陪你解锁'],
         ['一段段小关卡像闯关','看清楚再动手不慌','看得见自己的成长']),
}

def main():
    lessons = json.load(open(os.path.join(ROOT,'tools','lessons_code.json'), encoding='utf-8'))
    by_id = {l['id']: l for l in lessons}
    ids = sys.argv[1:]
    if ids:
        targets = [by_id[i] for i in ids if i in by_id]
    else:
        targets = lessons
    done=0
    for les in targets:
        lid = les['id']; title = f"{lid}  {les['title']}"
        narrate = os.path.join(ROOT,'audio',lid,'narrate.mp3')
        out = os.path.join(ROOT,'video',f'{lid}.mp4')
        if lid in CONCEPTS:
            payload = CONCEPTS[lid]
            kind='concept'
        else:
            if not les['code'].strip():
                print('跳过(无代码):', lid); continue
            steps, lines = trace_code(les['code'])
            if not steps:
                print('跳过(无执行步):', lid); continue
            payload = (steps, lines); kind='code'
        fd, n = render_frames(lid, title, kind, payload)
        ok = to_mp4(fd, n, narrate, out)
        # 清理帧
        for f in os.listdir(fd):
            try: os.remove(os.path.join(fd,f))
            except: pass
        try: os.rmdir(fd)
        except: pass
        print(('OK ' if ok else 'FAIL ')+lid+f' ({kind}, {n}帧)')

if __name__ == '__main__':
    main()
