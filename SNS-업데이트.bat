@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo 인스타그램 게시물을 가져와 사이트에 올립니다... (1분쯤 걸립니다)
call scripts\sns-update.cmd
echo.
echo ---- 결과 ----
powershell -NoProfile -Command "Get-Content .cache\sns-update.log -Tail 12 -Encoding UTF8"
pause
