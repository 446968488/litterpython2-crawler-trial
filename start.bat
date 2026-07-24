@echo off
cd /d "%~dp0"
echo 爬虫版本地服务器启动中...
start "" http://localhost:8000
python -m http.server 8000
pause
