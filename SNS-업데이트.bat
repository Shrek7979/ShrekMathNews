@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo 인스타그램·페이스북 수학 계정의 최근 게시물을 가져와 사이트에 올립니다...
call node scripts\collect-instagram.mjs
call node scripts\collect-facebook.mjs
git add data/instagram.json data/facebook.json public/social/ig public/social/fb
git commit -m "chore: 인스타그램·페이스북 게시물 갱신"
git pull --rebase --autostash
git push
pause
