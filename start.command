#!/bin/bash
# 和小光一起学Python · 爬虫版 · Mac 启动器
# 双击本文件即可：启动本地服务器 + 自动打开浏览器

cd "$(dirname "$0")" || exit 1

echo "🚀 正在启动本地课程服务器…"

# 自动找一个可用端口（从 8000 开始）
PORT=8000
while true; do
    if python3 -c "import socket; s=socket.socket(); s.bind(('127.0.0.1',$PORT)); s.close()" 2>/dev/null; then
        break
    fi
    echo "⚠️ 端口 $PORT 被占用，尝试下一个…"
    PORT=$((PORT + 1))
done

echo "✅ 将使用端口：$PORT"
echo "   浏览器会自动打开：http://127.0.0.1:$PORT"
echo "   如需关闭，请按 Ctrl+C 或关闭本终端窗口"
echo ""

# 1.5 秒后自动打开浏览器（后台子进程）
(sleep 1.5 && open "http://127.0.0.1:$PORT") &

# 前台启动服务器，错误会直接显示在本终端
python3 -m http.server "$PORT" --bind 127.0.0.1

echo "服务器已停止。"
