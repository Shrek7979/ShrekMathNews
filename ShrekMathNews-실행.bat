@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo Shrek Math News 를 시작합니다. 이 창을 닫으면 사이트와 자동 수집(07:00, 14:00)이 멈춥니다.
start "" http://localhost:3000
npm run local
pause
