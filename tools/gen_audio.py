#!/usr/bin/env python3
# 用 edge-tts 晓晓真人声合成全部课程语音，并生成 data/audio.js 映射
import json, os, asyncio, edge_tts, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pron

ROOT = "/Users/xiaoguang/WorkBuddy/电脑使用技巧/网课工具"
AUDIO_DIR = os.path.join(ROOT, "audio")
VOICE = "zh-CN-XiaoxiaoNeural"
# 资源版本号：每次重烤语音都改它，给每个 mp3 URL 加 ?v=，浏览器自动拉最新，免硬刷新
BUILD = "20260720d"

with open("/tmp/tts_tasks.json", "r", encoding="utf-8") as f:
    tasks = json.load(f)

# 确保目录
dirs = set(os.path.dirname(t["out"]) for t in tasks)
for d in dirs:
    os.makedirs(d, exist_ok=True)

sem = asyncio.Semaphore(6)
fail = 0

FORCE = True

async def synth(t):
    global fail
    out = t["out"]
    if not FORCE and os.path.exists(out) and os.path.getsize(out) > 0:
        return
    async with sem:
        try:
            comm = edge_tts.Communicate(pron.fix_pron(t["text"]), VOICE)
            await comm.save(out)
        except Exception as e:
            print(f"FAIL {out}: {e}")
            global fail
            fail += 1

async def main():
    await asyncio.gather(*[synth(t) for t in tasks])

asyncio.run(main())
print(f"合成结束：任务 {len(tasks)}，失败 {fail}")

# ===== 生成 audio.js 映射 =====
def rel(p):
    return "audio/" + os.path.relpath(p, AUDIO_DIR).replace("\\", "/") + "?v=" + BUILD

def seg(p):
    return {"src": rel(p), "pause": "short"}

# 按 lid 分组
lessons = {}
for t in tasks:
    if t["lid"] == "LEARN":
        continue
    lessons.setdefault(t["lid"], {"lecture": [], "exercises": {}, "takeaway": None})
    if t["kind"] == "lecture":
        lessons[t["lid"]]["lecture"].append(seg(t["out"]))
    elif t["kind"] == "exercise":
        lessons[t["lid"]]["exercises"].setdefault(t["idx"], []).append(seg(t["out"]))
    elif t["kind"] == "takeaway":
        # 只把 base(takeaway.mp3) 写进映射；_humor/_strict 也照常合成，由前端按风格拼后缀
        if t["out"].endswith("takeaway.mp3"):
            lessons[t["lid"]]["takeaway"] = seg(t["out"])

# 按 idx 排序 exercise 数组
for lid, info in lessons.items():
    exs = info["exercises"]
    keys = sorted(exs.keys())
    info["exercises"] = [exs[k] for k in keys]

learn = {}
for t in tasks:
    if t["lid"] == "LEARN":
        out = t["out"]
        # 数组只收「亲切(基础)版」变体；_humor/_strict 文件已存在，由前端按风格拼后缀
        if "_humor" in out or "_strict" in out:
            continue
        learn.setdefault(t["key"], []).append(seg(t["out"]))

# 评价模块：notDone/allCorrect/wrongMid 为「同情况多版本」数组，前端随机抽一条消人机感
wrong = []
for n in range(1, 7):
    k = f"wrong{n}"
    if k in learn:
        wrong.append(learn[k][0])

lines = []
lines.append("// 真人语音映射（edge-tts 晓晓 XiaoxiaoNeural 合成，全 40 课 + 学习成果）")
lines.append("// 更新后请硬刷新页面（Ctrl/Cmd+Shift+R）加载最新 audio.js")
lines.append("window.AUDIO_MAP = window.AUDIO_MAP || {};")
for lid, info in lessons.items():
    lines.append(f"window.AUDIO_MAP['{lid}'] = {{")
    lines.append("  lecture: " + json.dumps(info["lecture"], ensure_ascii=False) + ",")
    lines.append("  exercises: " + json.dumps(info["exercises"], ensure_ascii=False) + ",")
    lines.append("  takeaway: " + (json.dumps(info["takeaway"], ensure_ascii=False) if info["takeaway"] else "null") + "")
    lines.append("};")

lines.append("window.AUDIO_LEARN = {")
lines.append("  notDone: " + json.dumps(learn.get("notDone", []), ensure_ascii=False) + ",")
lines.append("  allCorrect: " + json.dumps(learn.get("allCorrect", []), ensure_ascii=False) + ",")
lines.append("  wrongMid: " + json.dumps(learn.get("wrongMid", []), ensure_ascii=False) + ",")
lines.append("  wrong: " + json.dumps(wrong, ensure_ascii=False))
lines.append("};")

with open(os.path.join(ROOT, "data/audio.js"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
print("已写入 data/audio.js，课程数：", len(lessons))
