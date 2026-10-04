@echo off
rem Windows 작업 스케줄러가 1시간마다 실행: 자동 업데이트의 "집 PC 쪽" 담당.
rem   1) 인스타그램 게시물 수집 (GitHub 서버에서는 막혀 있어 PC 에서만 가능)
rem   2) 마지막 뉴스 수집이 50분 넘게 지났으면 뉴스도 수집
rem      → GitHub 의 예약 실행이 자주 빠지기 때문에, PC 가 켜져 있는 동안은 PC 가 1시간 간격을 보장
rem   3) 바뀐 내용을 GitHub 에 올림 → 올라가면 GitHub 가 사이트를 다시 배포
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
node -e "const f=require('./data/feed.json');process.exit((Date.now()-new Date(f.updatedAt))/60000>=50?0:1)"
if errorlevel 1 (
  echo 뉴스: 최근 50분 안에 수집됨 - 건너뜀 >> "%LOG%"
) else (
  call node scripts\collect.mjs >> "%LOG%" 2>&1
)
git add data/feed.json data/instagram.json public/social/ig >> "%LOG%" 2>&1
git diff --cached --quiet || git commit -q -m "chore: 자동 업데이트 (PC)" >> "%LOG%" 2>&1
git push -q >> "%LOG%" 2>&1 || (git pull -q --rebase -X theirs >> "%LOG%" 2>&1 && git push -q >> "%LOG%" 2>&1)
echo 끝 >> "%LOG%"
