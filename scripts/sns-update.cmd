@echo off
rem Windows 작업 스케줄러가 1시간마다 실행: 인스타그램 게시물을 가져와 GitHub 에 올립니다.
rem (GitHub 서버에서는 인스타그램이 막혀 있어 집 PC 에서만 가능. 페이스북·뉴스는 서버가 직접 수집)
rem
rem 작업 중인 폴더를 건드리지 않도록, 전용 복사본(.cache\bot-repo)에서만 git 을 다룹니다.
rem 매번 서버의 최신 상태로 맞춘 뒤 시작하므로 다른 커밋과 충돌해 멈추는 일이 없습니다.
rem 기록: .cache\sns-update.log
chcp 65001 > nul
cd /d "%~dp0.."
if not exist .cache mkdir .cache
set "LOG=%cd%\.cache\sns-update.log"
set "BOT=%cd%\.cache\bot-repo"
set "MODULES=%cd%\node_modules"
echo ==== %date% %time% ==== >> "%LOG%"
if not exist "%BOT%\.git" git clone -q https://github.com/Shrek7979/ShrekMathNews.git "%BOT%" >> "%LOG%" 2>&1
if not exist "%BOT%\node_modules" mklink /J "%BOT%\node_modules" "%MODULES%" >> "%LOG%" 2>&1
cd /d "%BOT%"
git fetch -q origin >> "%LOG%" 2>&1
git checkout -q main >> "%LOG%" 2>&1
git reset -q --hard origin/main >> "%LOG%" 2>&1
call node scripts\collect-instagram.mjs >> "%LOG%" 2>&1
git add data/instagram.json public/social/ig >> "%LOG%" 2>&1
git diff --cached --quiet || git commit -q -m "chore: 인스타그램 게시물 갱신" >> "%LOG%" 2>&1
git push -q >> "%LOG%" 2>&1 || (git pull -q --rebase -X theirs >> "%LOG%" 2>&1 && git push -q >> "%LOG%" 2>&1)
echo 끝 >> "%LOG%"
