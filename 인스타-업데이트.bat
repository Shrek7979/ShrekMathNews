@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo 인스타그램 수학 계정의 최근 게시물을 가져와 사이트에 올립니다...
node scripts\collect-instagram.mjs
if errorlevel 1 goto end
git add data/instagram.json public/social/ig
git commit -m "chore: 인스타그램 게시물 갱신"
git pull --rebase
git push
:end
pause
