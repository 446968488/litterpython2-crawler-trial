#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""萌系 ffmpeg 视频批量生成（零积分/本地/离线）。
小电脑精灵 IP + 每课主题道具/关键词气泡。自动补齐「有 video 字段但缺 mp4」的课。
"""
import os, math, subprocess, shutil, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG = "/Users/xiaoguang/homebrew/Cellar/ffmpeg/8.1.2_1/bin/ffmpeg"
W, H = 320, 180
FPS = 25
FRAMES = 200

SKY_TOP = (205, 235, 255); SKY_BOT = (255, 240, 245)
GRASS = (150, 215, 140); GRASS_DK = (120, 190, 112)
SUN = (255, 214, 120); SUN_CORE = (255, 240, 190); CLOUD = (255, 255, 255)
BODY = (120, 200, 255); BODY_DK = (90, 170, 235); FACE = (255, 250, 238)
CHEEK = (255, 170, 190); SCREEN = (40, 50, 70); EYE = (50, 50, 60)
TEXT_GREEN = (120, 230, 160); WHITE = (255, 255, 255); SHADOW = (0, 0, 0, 40)
PINK = (255, 150, 180); PURPLE = (180, 150, 255); ORANGE = (255, 190, 120)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))

def ease_out(t):
    return 1 - (1 - t) ** 3

def ease_back(t):
    c1 = 1.70158; c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2

def rr(d, box, r, fill, outline=None, ow=0):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=ow)

def font(sz, mono=False):
    try:
        if mono:
            return ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New.ttf", sz)
        return ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", sz)
    except Exception:
        return ImageFont.load_default()

def make_bg():
    img = Image.new("RGB", (W, H)); d = ImageDraw.Draw(img)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=lerp(SKY_TOP, SKY_BOT, y / H))
    gy = int(H * 0.74)
    d.rectangle([0, gy, W, H], fill=GRASS)
    for x in range(0, W, 8):
        h = 4 + 3 * math.sin(x / 18.0)
        d.line([(x, gy), (x, gy + h)], fill=GRASS_DK)
    return img, gy

def draw_sun(d, t):
    cx, cy = W - 40, 38
    for i in range(8):
        ang = t * 1.2 + i * (math.pi / 4)
        d.line([(cx + math.cos(ang) * 12, cy + math.sin(ang) * 12),
                (cx + math.cos(ang) * 22, cy + math.sin(ang) * 22)], fill=SUN, width=3)
    d.ellipse([cx - 13, cy - 13, cx + 13, cy + 13], fill=SUN, outline=SUN_CORE, width=2)
    d.ellipse([cx - 6, cy - 3, cx - 3, cy], fill=EYE)
    d.ellipse([cx + 3, cy - 3, cx + 6, cy], fill=EYE)
    d.arc([cx - 6, cy + 1, cx + 6, cy + 7], 20, 160, fill=EYE, width=2)

def draw_cloud(d, x, y, s=1.0):
    for dx, dy, r in [(0, 0, 10), (12, 2, 8), (-12, 2, 8), (6, -4, 7), (-6, -4, 7)]:
        d.ellipse([x + dx * s - r, y + dy * s - r, x + dx * s + r, y + dy * s + r], fill=CLOUD)

def draw_computer(d, cx, cy, t, talk, bubble=None):
    bw, bh = 96, 78
    bx, by = cx - bw // 2, cy - bh // 2
    d.ellipse([bx + 6, by + bh - 2, bx + bw - 6, by + bh + 8], fill=SHADOW)
    d.line([(cx, by), (cx, by - 12)], fill=BODY_DK, width=3)
    d.ellipse([cx - 4, by - 16, cx + 4, by - 8], fill=CHEEK)
    rr(d, [bx, by, bx + bw, by + bh], 16, BODY)
    rr(d, [bx, by, bx + bw, by + bh], 16, None, outline=BODY_DK, ow=2)
    d.line([bx + 2, by + 2, bx + bw - 2, by + 2], fill=BODY_DK, width=2)
    sx, sy, sw, sh = bx + 12, by + 10, bw - 24, bh - 30
    rr(d, [sx, sy, sx + sw, sy + sh], 7, SCREEN)
    f = font(11, mono=True)
    d.text((sx + 7, sy + 7), 'print("Hi")', fill=TEXT_GREEN, font=f)
    if int(t * 2) % 2 == 0:
        d.rectangle([sx + 7 + 66, sy + 7, sx + 7 + 68, sy + 17], fill=TEXT_GREEN)
    fy = by + bh - 18
    for side in (-1, 1):
        exx = cx + side * 16
        d.ellipse([exx - 7, fy - 7, exx + 7, fy + 7], fill=WHITE)
        d.ellipse([exx - 4, fy - 4, exx + 4, fy + 4], fill=EYE)
        d.ellipse([exx - 1, fy - 6, exx + 1, fy - 4], fill=WHITE)
        if math.sin(t * 0.9) > 0.96:
            d.line([exx - 6, fy, exx + 6, fy], fill=EYE, width=2)
    for side in (-1, 1):
        d.ellipse([cx + side * 26 - 5, fy + 4, cx + side * 26 + 5, fy + 10], fill=CHEEK)
    if talk > 0.3:
        d.ellipse([cx - 5, fy + 8, cx + 5, fy + 14], fill=EYE)
    else:
        d.arc([cx - 6, fy + 7, cx + 6, fy + 13], 20, 160, fill=EYE, width=2)
    sway = math.sin(t * 3) * 5
    for side in (-1, 1):
        hx = bx + (0 if side < 0 else bw) + side * 6
        hy = cy + 6 + sway * side
        d.ellipse([hx - 6, hy - 6, hx + 6, hy + 6], fill=BODY_DK)
    # 关键词气泡
    if bubble:
        bt = ease_back(0.5)
        bxp = cx + 42; byp = cy - 52
        bw2, bh2 = max(40, len(bubble) * 9 + 14), 22
        rr(d, [bxp, byp, bxp + bw2, byp + bh2], 9, WHITE, outline=BODY_DK, ow=2)
        d.polygon([(bxp + 8, byp + bh2), (bxp + 16, byp + bh2), (bxp + 8, byp + bh2 + 8)], fill=WHITE)
        d.text((bxp + 7, byp + 4), bubble, fill=BODY_DK, font=font(13))

# ---------- 道具 ----------
def prop_loop(d, t):
    cx, cy = W // 2, 30
    for i in range(12):
        a = t * 2 + i * (math.pi / 6)
        d.ellipse([cx + math.cos(a) * 16 - 2, cy + math.sin(a) * 16 - 2,
                   cx + math.cos(a) * 16 + 2, cy + math.sin(a) * 16 + 2], fill=PURPLE)
    ax = cx + math.cos(t * 2) * 16; ay = cy + math.sin(t * 2) * 16
    d.ellipse([ax - 4, ay - 4, ax + 4, ay + 4], fill=PINK)

def prop_light(d, t):
    x, y = W - 30, 110
    rr(d, [x - 10, y - 26, x + 10, y + 26], 5, (60, 60, 70))
    cols = [(220, 60, 60), (230, 200, 60), (90, 210, 110)]
    idx = int((t / (2 * math.pi)) * 3) % 3
    for i, c in enumerate(cols):
        on = (i == idx)
        rr(d, [x - 7, y - 22 + i * 16, x + 7, y - 10 + i * 16], 7,
            c if on else (90, 90, 100))

def prop_for(d, t):
    y = H - 14
    for i in range(5):
        x = 70 + i * 36
        on = (int(t / (2 * math.pi) * 5) % 5) == i
        c = ORANGE if on else (200, 210, 230)
        rr(d, [x - 12, y - 14, x + 12, y + 14], 4, c)
        d.text((x - 3, y - 9), str(i), fill=EYE, font=font(11))

def prop_list(d, t):
    y = H - 16
    for i in range(4):
        x = 80 + i * 44
        pop = ease_out((math.sin(t * 2 - i * 0.5) + 1) / 2)
        rr(d, [x - 16, y - 18 - pop * 6, x + 16, y + 18], 5, (255, 235, 200), outline=BODY_DK, ow=2)
        d.text((x - 8, y - 6), "a" + str(i), fill=EYE, font=font(12))

def prop_turtle(d, t):
    x = 60 + (t / (2 * math.pi)) * 60 % 160
    y = H - 30
    d.line([(20, y + 6), (x, y + 6)], fill=(120, 90, 60), width=2)
    d.ellipse([x - 16, y - 6, x + 16, y + 14], fill=(120, 200, 120))   # 壳
    d.ellipse([x - 26, y - 2, x - 12, y + 10], fill=(150, 220, 150))   # 头
    for dx, dy in [(-12, 14), (12, 14), (-8, -2), (8, -2)]:
        d.ellipse([x + dx - 3, y + dy - 3, x + dx + 3, y + dy + 3], fill=(120, 200, 120))

def prop_func(d, t):
    x, y = 60, H - 36
    glow = (math.sin(t * 2) + 1) / 2
    rr(d, [x - 22, y - 18, x + 22, y + 18], 8, lerp((230, 220, 255), (255, 240, 180), glow))
    d.text((x - 16, y - 10), "in", fill=EYE, font=font(11))
    d.text((x - 14, y + 2), "out", fill=EYE, font=font(11))
    d.ellipse([x + 30, y - 2, x + 38, y + 6], fill=PINK)

def prop_class(d, t):
    x, y = 58, H - 34
    for i in range(4):
        for j in range(3):
            d.rectangle([x + i * 14, y + j * 12, x + i * 14 + 12, y + j * 12 + 10],
                        outline=(180, 200, 230), width=1)
    d.ellipse([x + 50, y - 4, x + 64, y + 10], fill=BODY)

def prop_chart(d, t):
    y = H - 12
    for i in range(4):
        h = 12 + (i + 1) * 8 * ((math.sin(t * 2 - i) + 1) / 2 + 0.4)
        x = 70 + i * 34
        d.rectangle([x - 12, y - h, x + 12, y], fill=[PINK, PURPLE, ORANGE, BODY][i])

def prop_calc(d, t):
    y = H - 30
    for i, s in enumerate(["+", "-", "x"]):
        x = 80 + i * 40
        pop = ease_out((math.sin(t * 3 - i) + 1) / 2)
        d.text((x - 6, y - 10 - pop * 6), s, fill=[ORANGE, PINK, PURPLE][i], font=font(18))

PROPS = {
    'loop': prop_loop, 'light': prop_light, 'for': prop_for, 'list': prop_list,
    'turtle': prop_turtle, 'func': prop_func, 'class': prop_class,
    'chart': prop_chart, 'calc': prop_calc,
}

# lesson_id -> (prop名或None, 气泡关键词)
SCENES = {
    # 旧 AI 视频统一替换成萌版 ffmpeg（与后32节同画风）
    'c0l1': (None, 'code'), 'c0l2': (None, 'step'), 'c0l3': ('loop', 'loop'),
    'c1l2': ('calc', '+-'), 'c1l3': (None, '#'), 'c2l1': (None, 'var'),
    'c2l2': (None, 'type'), 'c2l4': (None, 'text'),
    'c3l1': ('turtle', 'turtle'), 'c3l2': ('turtle', 'draw'),
    'c2l3': ('list', 'input'), 'c3l3': ('turtle', 'flower'),
    'c4l1': ('light', 'if'), 'c4l2': ('for', 'else'),
    'c4l3': ('for', 'for'), 'c4l4': ('loop', 'while'),
    'c4l5': ('func', 'AND'), 'c5l1': ('list', 'list'),
    'c5l2': ('list', 'sort'), 'c5l3': ('func', 'dict'),
    'c5l4': ('list', 'grid'), 'c5l5': ('list', '推导'),
    'c6l1': ('func', 'def'), 'c6l2': ('func', 'import'),
    'c6l3': ('func', 'param'), 'c6l4': ('func', 'lambda'),
    'c7l1': (None, 'open'), 'c7l2': (None, 'try'), 'c7l3': (None, 'json'),
    'c8l1': (None, 'find'), 'c8l2': (None, 'sort'),
    'c9l1': (None, 'guess'), 'c9l2': (None, 'recur'),
    'c10l1': ('class', 'class'), 'c10l2': ('class', 'game'), 'c10l3': ('class', 'sub'),
    'c11l1': ('chart', 'AI'), 'c12l2': ('loop', 'for2'),
    'c13l2': ('chart', '9x9'), 'c13l3': ('calc', '+-'), 'c13l4': (None, 'word'),
}

def render(lesson_id):
    prop, bubble = SCENES.get(lesson_id, (None, lesson_id))
    out = os.path.join(ROOT, "video", lesson_id + ".mp4")
    tmp = os.path.join(ROOT, "tools", "_f_" + lesson_id)
    os.makedirs(tmp, exist_ok=True)
    base_bg, gy = make_bg()
    cx, cy = W // 2, gy - 44
    for i in range(FRAMES):
        t = i / FRAMES * 2 * math.pi
        tt = i / FRAMES
        img = base_bg.copy(); d = ImageDraw.Draw(img)
        draw_sun(d, t)
        draw_cloud(d, (30 + i * 0.4) % (W + 40) - 20, 36, 0.9)
        draw_cloud(d, (W - 60 + i * 0.25) % (W + 60) - 30, 60, 0.7)
        breath = math.sin(t * 1.3) * 2
        talk_phase = (i % 40) / 40.0
        talk = ease_out(min(talk_phase * 3, 1)) if talk_phase < 0.4 else 0
        draw_computer(d, cx, cy + breath, t, talk, bubble)
        if prop:
            PROPS[prop](d, t)
        img.save(os.path.join(tmp, f"f{i:04d}.png"))
    subprocess.run([FFMPEG, "-y", "-framerate", str(FPS), "-i", os.path.join(tmp, "f%04d.png"),
                    "-vf", "scale=640:360", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-preset", "veryfast", "-crf", "28", out],
                   check=True, capture_output=True)
    shutil.rmtree(tmp)
    return os.path.getsize(out)

def main():
    only = sys.argv[1:]
    done, fail = [], []
    for lid in SCENES:
        if only and lid not in only:
            continue
        mp4 = os.path.join(ROOT, "video", lid + ".mp4")
        if os.path.exists(mp4):
            continue
        try:
            sz = render(lid)
            done.append((lid, sz))
            print("OK", lid, sz)
        except Exception as e:
            fail.append((lid, str(e)))
            print("FAIL", lid, e)
    print(f"\n完成 {len(done)} 个, 失败 {len(fail)} 个")
    if fail:
        print("失败:", ", ".join(f[0] for f in fail))

if __name__ == "__main__":
    main()
