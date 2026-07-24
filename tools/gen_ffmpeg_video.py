#!/usr/bin/env python3
# 用 PIL 画卡通帧 + ffmpeg 压成 mp4（零积分 / 本地 / 离线）
import os, subprocess
from PIL import Image, ImageDraw, ImageFont

W, H = 640, 360
FPS = 25
DUR = 8
N = FPS * DUR
LESSON = "c1l1"
OUT_FRAMES = f"/tmp/anim_{LESSON}"
OUT_MP4 = f"/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具/video/{LESSON}.mp4"
FFMPEG = "/Users/xiaoguang/homebrew/Cellar/ffmpeg/8.1.2_1/bin/ffmpeg"

os.makedirs(OUT_FRAMES, exist_ok=True)

def font(sz):
    for p in ["/System/Library/Fonts/PingFang.ttc", "/System/Library/Fonts/STHeiti Light.ttc"]:
        try:
            return ImageFont.truetype(p, sz)
        except Exception:
            continue
    return ImageFont.load_default()

FBIG = font(26); FMID = font(20); FSMALL = font(15)

def textc(d, s, cx, cy, fnt, fill, sz):
    w = len(s) * sz * 0.95; h = sz
    d.text((cx - w / 2, cy - h / 2), s, font=fnt, fill=fill)

def rr(d, x, y, w, h, r, fill=None, outline=None, width=1):
    d.rounded_rectangle([x, y, x + w, y + h], radius=r, fill=fill, outline=outline, width=width)

def draw_frame(t):
    img = Image.new("RGB", (W, H), (191, 227, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([0, int(H * 0.72), W, H], fill=(155, 227, 155))      # 草地
    d.ellipse([W - 78, 26, W - 46, 58], fill=(255, 215, 102))        # 太阳
    textc(d, "第1课小样 · 第一个程序（ffmpeg 本地视频）", W / 2, 26, FSMALL, (51, 51, 85), 15)

    cx, cy = W / 2, H * 0.55
    rr(d, cx - 90, cy - 70, 180, 120, 14, fill=(230, 235, 245), outline=(120, 140, 170), width=3)
    rr(d, cx - 72, cy - 54, 144, 92, 8, fill=(30, 40, 70))           # 屏幕
    d.text((cx - 60, cy - 42), 'print(', font=FMID, fill=(120, 200, 255))
    d.text((cx - 8, cy - 42), '"Hello!"', font=FMID, fill=(255, 210, 120))
    d.text((cx + 60, cy - 42), ')', font=FMID, fill=(120, 200, 255))
    d.rectangle([cx - 14, cy + 50, cx + 14, cy + 64], fill=(150, 160, 180))
    d.rectangle([cx - 40, cy + 62, cx + 40, cy + 72], fill=(150, 160, 180))

    # 说话气泡（每 2.6s 循环一次）
    phase = (t % 2.6) / 2.6
    if phase < 0.15:   a = int(phase / 0.15 * 255)
    elif phase < 0.8:  a = 255
    else:              a = int((1 - (phase - 0.8) / 0.2) * 255)
    if a > 0:
        bx, by = cx + 70, cy - 132
        c = (255, 255, 255)
        rr(d, bx, by, 100, 48, 12, fill=c)
        d.polygon([(bx + 16, by + 46), (bx + 34, by + 46), (bx + 20, by + 64)], fill=c)
        textc(d, "Hello!", bx + 50, by + 24, FBIG, (255, 140, 60), 26)

    cursor = "█" if (t * 2) % 1 < 0.5 else " "
    textc(d, "让电脑说第一句话 " + cursor, W / 2, H * 0.9, FMID, (85, 85, 120), 20)
    return img

for i in range(N):
    draw_frame(i / FPS).save(f"{OUT_FRAMES}/frame_{i:03d}.png")
print("frames done:", N)

cmd = [FFMPEG, "-y", "-framerate", str(FPS), "-i", f"{OUT_FRAMES}/frame_%03d.png",
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-movflags", "+faststart", OUT_MP4]
r = subprocess.run(cmd, capture_output=True, text=True)
print("ffmpeg rc:", r.returncode)
print("mp4:", OUT_MP4 if r.returncode == 0 else r.stderr[-600:])
