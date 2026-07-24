#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""萌系 ffmpeg 视频生成（零积分 / 本地 / 离线）。
给每节课生成一个真正 mp4：圆润大眼腮红的小电脑精灵 IP + 弹性动效 + 柔彩背景。
课主题通过 LESSON 参数切换。先做 c1l1（第一个程序 / print Hello）。
"""
import os, math, subprocess, shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG = "/Users/xiaoguang/homebrew/Cellar/ffmpeg/8.1.2_1/bin/ffmpeg"
W, H = 320, 180
FPS = 25
FRAMES = 200  # 8s

# ---------- 颜色 ----------
SKY_TOP = (205, 235, 255)
SKY_BOT = (255, 240, 245)
GRASS = (150, 215, 140)
GRASS_DK = (120, 190, 112)
SUN = (255, 214, 120)
SUN_CORE = (255, 240, 190)
CLOUD = (255, 255, 255)
BODY = (120, 200, 255)
BODY_DK = (90, 170, 235)
FACE = (255, 250, 238)
CHEEK = (255, 170, 190)
SCREEN = (40, 50, 70)
EYE = (50, 50, 60)
TEXT_GREEN = (120, 230, 160)
WHITE = (255, 255, 255)
SHADOW = (0, 0, 0, 40)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def ease_out(t):
    return 1 - (1 - t) ** 3


def ease_back(t):
    # 弹性回弹
    c1 = 1.70158
    c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2


def round_rect(d, box, r, fill):
    d.rounded_rectangle(box, radius=r, fill=fill)


def make_bg():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=lerp(SKY_TOP, SKY_BOT, t))
    # 草地
    gy = int(H * 0.74)
    d.rectangle([0, gy, W, H], fill=GRASS)
    d.rectangle([0, gy, W, H], outline=None)
    # 草地波浪高光
    for x in range(0, W, 8):
        h = 4 + 3 * math.sin(x / 18.0)
        d.line([(x, gy), (x, gy + h)], fill=GRASS_DK)
    return img, gy


def draw_sun(d, t):
    cx, cy = W - 42, 40
    # 光芒旋转
    for i in range(8):
        ang = t * 1.2 + i * (math.pi / 4)
        x2 = cx + math.cos(ang) * 22
        y2 = cy + math.sin(ang) * 22
        d.line([(cx + math.cos(ang) * 12, cy + math.sin(ang) * 12), (x2, y2)], fill=SUN, width=3)
    d.ellipse([cx - 13, cy - 13, cx + 13, cy + 13], fill=SUN, outline=SUN_CORE, width=2)
    # 笑脸
    d.ellipse([cx - 6, cy - 3, cx - 3, cy], fill=EYE)
    d.ellipse([cx + 3, cy - 3, cx + 6, cy], fill=EYE)
    d.arc([cx - 6, cy + 1, cx + 6, cy + 7], 20, 160, fill=EYE, width=2)


def draw_cloud(d, x, y, s=1.0):
    for dx, dy, r in [(0, 0, 10), (12, 2, 8), (-12, 2, 8), (6, -4, 7), (-6, -4, 7)]:
        d.ellipse([x + dx * s - r, y + dy * s - r, x + dx * s + r, y + dy * s + r], fill=CLOUD)


def draw_computer(d, cx, cy, t, talk):
    """圆润大眼腮红小电脑精灵。talk: 0~1 说话程度。"""
    bw, bh = 96, 78
    bx, by = cx - bw // 2, cy - bh // 2
    # 阴影
    d.ellipse([bx + 6, by + bh - 2, bx + bw - 6, by + bh + 8], fill=SHADOW)
    # 天线
    d.line([(cx, by), (cx, by - 12)], fill=BODY_DK, width=3)
    d.ellipse([cx - 4, by - 16, cx + 4, by - 8], fill=CHEEK)
    # 机身
    round_rect(d, [bx, by, bx + bw, by + bh], 16, BODY)
    round_rect(d, [bx, by, bx + bw, by + bh], 16, None)
    d.line([bx + 2, by + 2, bx + bw - 2, by + 2], fill=BODY_DK, width=2)
    # 屏幕
    sx, sy, sw, sh = bx + 12, by + 10, bw - 24, bh - 30
    round_rect(d, [sx, sy, sx + sw, sy + sh], 7, SCREEN)
    # 屏幕文字 print("Hello!")
    try:
        f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New.ttf", 11)
    except Exception:
        f = ImageFont.load_default()
    d.text((sx + 7, sy + 7), 'print("Hello!")', fill=TEXT_GREEN, font=f)
    # 光标闪烁
    if int(t * 2) % 2 == 0:
        d.rectangle([sx + 7 + 78, sy + 7, sx + 7 + 80, sy + 17], fill=TEXT_GREEN)
    # 脸（屏幕下方机身区域）
    fy = by + bh - 18
    # 眼（大圆+高光）
    ex = cx - 16
    for side in (-1, 1):
        exx = cx + side * 16
        d.ellipse([exx - 7, fy - 7, exx + 7, fy + 7], fill=WHITE)
        d.ellipse([exx - 4, fy - 4, exx + 4, fy + 4], fill=EYE)
        d.ellipse([exx - 1, fy - 6, exx + 1, fy - 4], fill=WHITE)  # 高光
        # 眨眼
        blink = (math.sin(t * 0.9) > 0.96)
        if blink:
            d.line([exx - 6, fy, exx + 6, fy], fill=EYE, width=2)
    # 腮红
    for side in (-1, 1):
        d.ellipse([cx + side * 26 - 5, fy + 4, cx + side * 26 + 5, fy + 10], fill=CHEEK)
    # 嘴（说话时变 O）
    if talk > 0.3:
        d.ellipse([cx - 5, fy + 8, cx + 5, fy + 14], fill=EYE)
    else:
        d.arc([cx - 6, fy + 7, cx + 6, fy + 13], 20, 160, fill=EYE, width=2)
    # 小手挥动
    sway = math.sin(t * 3) * 5
    for side in (-1, 1):
        hx = bx + (0 if side < 0 else bw) + side * 6
        hy = cy + 6 + sway * side
        d.ellipse([hx - 6, hy - 6, hx + 6, hy + 6], fill=BODY_DK)


def main():
    out = os.path.join(ROOT, "video", "c1l1.mp4")
    os.makedirs(os.path.join(ROOT, "video"), exist_ok=True)
    tmp = os.path.join(ROOT, "tools", "_frames")
    if os.path.exists(tmp):
        shutil.rmtree(tmp)
    os.makedirs(tmp)

    base_bg, gy = make_bg()
    for i in range(FRAMES):
        t = i / FRAMES * 2 * math.pi  # 周期
        tt = i / FRAMES
        img = base_bg.copy()
        d = ImageDraw.Draw(img)
        draw_sun(d, t)
        # 云飘
        draw_cloud(d, (30 + i * 0.4) % (W + 40) - 20, 36, 0.9)
        draw_cloud(d, (W - 60 + i * 0.25) % (W + 60) - 30, 60, 0.7)
        # 电脑呼吸 + 说话节奏（每 1.6s 冒一次 Hello）
        breath = math.sin(t * 1.3) * 2
        cx, cy = W // 2, gy - 44 + breath
        talk_phase = (i % 40) / 40.0
        talk = ease_out(min(talk_phase * 3, 1)) if talk_phase < 0.4 else 0
        draw_computer(d, cx, cy, t, talk)
        # Hello 气泡弹跳
        if talk_phase < 0.5:
            bt = ease_back(talk_phase / 0.5)
            bxp = cx + 40
            byp = cy - 50 - bt * 30
            bw2, bh2 = 46, 22
            round_rect(d, [bxp, byp, bxp + bw2, byp + bh2], 9, WHITE)
            d.polygon([(bxp + 8, byp + bh2), (bxp + 16, byp + bh2), (bxp + 8, byp + bh2 + 8)], fill=WHITE)
            try:
                fb = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 13)
            except Exception:
                fb = ImageFont.load_default()
            d.text((bxp + 7, byp + 4), "Hello!", fill=(90, 170, 235), font=fb)
        img.save(os.path.join(tmp, f"f{i:04d}.png"))

    cmd = [
        FFMPEG, "-y", "-framerate", str(FPS), "-i", os.path.join(tmp, "f%04d.png"),
        "-vf", "scale=640:360", "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-preset", "veryfast", "-crf", "28", out,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    shutil.rmtree(tmp)
    print("OK", out, os.path.getsize(out), "bytes")


if __name__ == "__main__":
    main()
