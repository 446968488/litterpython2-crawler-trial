#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""样片：每课演它自己概念的差异化动画（替代通用模板）。
仅生成 _sample_ 文件，不破坏现有视频，供用户看差异。零积分/本地 ffmpeg。
"""
import os, math, subprocess, shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG = "/Users/xiaoguang/homebrew/Cellar/ffmpeg/8.1.2_1/bin/ffmpeg"
W, H = 320, 180
FPS = 25
FRAMES = 200

SKY_TOP = (205, 235, 255); SKY_BOT = (255, 240, 245)
GRASS = (150, 215, 140); GRASS_DK = (120, 190, 112)
SUN = (255, 214, 120); SUN_CORE = (255, 240, 190); CLOUD = (255, 255, 255)
CHEEK = (255, 170, 190); EYE = (50, 50, 60); WHITE = (255, 255, 255)
PINK = (255, 150, 180); GREEN = (120, 230, 160); RED = (240, 110, 110)
PURPLE = (180, 150, 255)
SKIN = (255, 224, 196); SHIRT = (255, 180, 120)

def font(sz, cjk=False):
    if cjk:
        for p in ["/System/Library/Fonts/PingFang.ttc",
                  "/System/Library/Fonts/STHeiti Light.ttc",
                  "/System/Library/Fonts/Hiragino Sans GB.ttc"]:
            try:
                return ImageFont.truetype(p, sz)
            except Exception:
                pass
    try:
        return ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", sz)
    except Exception:
        return ImageFont.load_default()

def rr(d, box, r, fill, outline=None, ow=0):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=ow)

def make_bg():
    img = Image.new("RGB", (W, H)); d = ImageDraw.Draw(img)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=tuple(int(SKY_TOP[i] + (SKY_BOT[i]-SKY_TOP[i])*y/H) for i in range(3)))
    gy = int(H * 0.78)
    d.rectangle([0, gy, W, H], fill=GRASS)
    for x in range(0, W, 8):
        h = 4 + 3 * math.sin(x/18.0)
        d.line([(x, gy), (x, gy+h)], fill=GRASS_DK)
    return img, gy

def draw_sun(d, t):
    cx, cy = W-38, 34
    for i in range(8):
        a = t*1.2 + i*(math.pi/4)
        d.line([(cx+math.cos(a)*12, cy+math.sin(a)*12),(cx+math.cos(a)*22, cy+math.sin(a)*22)], fill=SUN, width=3)
    d.ellipse([cx-13,cy-13,cx+13,cy+13], fill=SUN, outline=SUN_CORE, width=2)
    d.ellipse([cx-5,cy-2,cx-2,cy+1], fill=EYE); d.ellipse([cx+2,cy-2,cx+5,cy+1], fill=EYE)

def draw_cloud(d, x, y, s=1.0):
    for dx,dy,r in [(0,0,10),(12,2,8),(-12,2,8),(6,-4,7),(-6,-4,7)]:
        d.ellipse([x+dx*s-r,y+dy*s-r,x+dx*s+r,y+dy*s+r], fill=CLOUD)

def draw_kid(d, cx, cy, t, arm=0.0, mouth=0.0, walk=0.0):
    # 身体
    rr(d, [cx-16, cy, cx+16, cy+34], 12, SHIRT)
    # 头
    d.ellipse([cx-15, cy-30, cx+15, cy+2], fill=SKIN, outline=(235,200,170), width=2)
    # 头发
    d.ellipse([cx-15, cy-32, cx+15, cy-18], fill=(120,90,70))
    d.rectangle([cx-15, cy-24, cx+15, cy-20], fill=SKIN)
    # 眼
    for sx in (-7, 7):
        d.ellipse([cx+sx-3, cy-16, cx+sx+3, cy-10], fill=WHITE)
        d.ellipse([cx+sx-2, cy-15, cx+sx+2, cy-11], fill=EYE)
    # 腮红
    for sx in (-11, 11):
        d.ellipse([cx+sx-3, cy-7, cx+sx+3, cy-3], fill=CHEEK)
    # 嘴
    if mouth > 0.5:
        d.ellipse([cx-4, cy-6, cx+4, cy-1], fill=(200,90,90))
    else:
        d.arc([cx-4, cy-7, cx+4, cy-3], 20, 160, fill=EYE, width=2)
    # 手臂(刷牙/摆)
    hx = cx + 18 + arm*8; hy = cy + 8 - abs(arm)*4
    d.line([(cx+14, cy+8),(hx, hy)], fill=SKIN, width=6)
    d.ellipse([hx-4, hy-4, hx+4, hy+4], fill=SKIN)

# ---------- 场景1：循环（c0l3）一遍又一遍 ----------
def scene_loop(d, t, tt):
    # 大循环箭头
    cx, cy = W//2, 34
    for i in range(14):
        a = t*1.6 + i*(math.pi/7)
        d.ellipse([cx+math.cos(a)*20-2, cy+math.sin(a)*20-2, cx+math.cos(a)*20+2, cy+math.sin(a)*20+2], fill=PURPLE if i%2 else (200,180,255))
    ax = cx+math.cos(t*1.6)*20; ay = cy+math.sin(t*1.6)*20
    d.polygon([(ax-5,ay-5),(ax+5,ay-5),(ax,ay+6)], fill=PINK)
    # 小人刷牙，手臂来回
    arm = math.sin(t*4)
    draw_kid(d, W//2, H-58, t, arm=arm, mouth=(math.sin(t*4)>0))
    # 天数递增
    day = int(tt*8)+1
    f = font(15, cjk=True)
    d.text((W//2-34, H-22), f"第 {day} 天 一遍又一遍", fill=(90,120,90), font=f)

# ---------- 场景2：if 判断（c4l1）红绿灯走/停 ----------
def scene_if(d, t, tt):
    # 红绿灯
    lx, ly = 70, H-92
    rr(d, [lx-12, ly, lx+12, ly+54], 6, (60,60,72))
    cols = [(220,70,70),(230,200,70),(110,210,120)]
    # 周期：绿(走)->黄->红(停)
    phase = (t/(2*math.pi)) % 1
    if phase < 0.45: idx, walking, label, lc = 2, True, "绿灯 → 走", GREEN
    elif phase < 0.6: idx, walking, label, lc = 1, False, "黄灯 → 等", (230,200,70)
    else: idx, walking, label, lc = 0, False, "红灯 → 停", RED
    for i,c in enumerate(cols):
        on = (i==idx)
        rr(d, [lx-9, ly+6+i*16, lx+9, ly+18+i*16], 8, c if on else (95,95,105))
    # 小人
    wx = W//2 + (math.sin(t*1.5)*6 if walking else 0)
    draw_kid(d, wx, H-58, t, mouth=(0.6 if walking else 0.2))
    # 文字
    f = font(16, cjk=True)
    d.text((W//2-30, H-20), label, fill=lc, font=f)

SCENES = {
    'c0l3': ('_sample_c0l3', scene_loop),
    'c4l1': ('_sample_c4l1', scene_if),
}

def render(out_name, scene_fn):
    out = os.path.join(ROOT, "video", out_name + ".mp4")
    tmp = os.path.join(ROOT, "tools", "_s_" + out_name)
    os.makedirs(tmp, exist_ok=True)
    base_bg, gy = make_bg()
    for i in range(FRAMES):
        t = i/FRAMES*2*math.pi
        tt = i/FRAMES
        img = base_bg.copy(); d = ImageDraw.Draw(img)
        draw_sun(d, t)
        draw_cloud(d, (30+i*0.4)%(W+40)-20, 36, 0.9)
        scene_fn(d, t, tt)
        img.save(os.path.join(tmp, f"f{i:04d}.png"))
    subprocess.run([FFMPEG, "-y", "-framerate", str(FPS), "-i", os.path.join(tmp,"f%04d.png"),
                    "-vf", "scale=640:360", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-preset", "veryfast", "-crf", "28", out], check=True, capture_output=True)
    shutil.rmtree(tmp)
    return os.path.getsize(out)

if __name__ == "__main__":
    for lid,(name,fn) in SCENES.items():
        try:
            sz = render(name, fn)
            print("OK", name, sz)
        except Exception as e:
            print("FAIL", name, e)
