# -*- coding: utf-8 -*-
"""统一重烤全部语音 + 视频，应用 pron.fix_pron 的多音字修正。

做法：给各合成脚本传 FORCE=1 环境变量，强制覆盖重合成（不删文件，避开安全删除拦截）。
  - gen_audio   : 讲义/练习/学习成果（575 段）+ 重写 data/audio.js（带 ?v 版本号）
  - gen_narrate : 每课「讲一讲」narrate.mp3
  - gen_voices  : 讲一讲三风格 + 通用短语音 + 学习报告点评
  - gen_matched : 全部 43 课视频旁白（每段语音强制重合成 + 重拼 mp4）
"""
import os, sys, time, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, 'tools')
PY = '/Users/xiaoguang/.workbuddy/binaries/python/envs/default/bin/python3'

# 强制覆盖重合成（应用最新 pron.py 多音字修正），不删除任何文件
ENV = dict(os.environ, FORCE='1')

t0 = time.time()
for script in ['gen_audio.py', 'gen_narrate.py', 'gen_voices.py', 'gen_matched.py']:
    s0 = time.time()
    print('=== 运行 %s ===' % script, flush=True)
    r = subprocess.run([PY, os.path.join(TOOLS, script)], capture_output=True, text=True,
                       timeout=9000, env=ENV)
    tail = '\n'.join(r.stdout.strip().split('\n')[-8:])
    print('  rc=%d  %.1fs' % (r.returncode, time.time() - s0), flush=True)
    if tail:
        print('  ' + tail.replace('\n', '\n  '), flush=True)
    if r.returncode != 0:
        print('  !! 非零退出，查看上方 stderr', flush=True)

print('DONE regen_pron 总耗时 %.1fs' % (time.time() - t0), flush=True)
