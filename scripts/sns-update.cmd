@echo off
rem Windows 작업 스케줄러가 2시간마다 실행: 인스타그램·페이스북 게시물을 가져와 GitHub 에 올립니다.
rem (창을 띄우지 않고 조용히 실행, 기록은 .cache\sns-update.log)
chcp 65001 > nul
cd /d "%~dp0.."
if not exist .cache mkdir .cache
(
  echo ==== %date% %time% ====
  call node scripts\collect-instagram.mjs
  call node scripts\collect-facebook.mjs
  git add data/instagram.json data/facebook.json public/social/ig public/social/fb
  git commit -m "chore: 인스타그램·페이스북 게시물 갱신"
  git pull --rebase --autostash
  git push
) >> .cache\sns-update.log 2>&1
