@echo off
chcp 65001 >nul
title 모벨 퍼포먼스 트레이닝 - 개발 서버

cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
    echo.
    echo [오류] npm을 찾을 수 없습니다.
    echo Node.js LTS를 설치한 뒤 터미널을 다시 열어주세요.
    echo https://nodejs.org
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo.
    echo 패키지가 없습니다. install.bat 을 먼저 실행하거나 자동 설치합니다...
    goto do_install
)

if not exist "node_modules\react-router-dom\" (
    echo.
    echo 새 패키지가 추가되었습니다. 다시 설치합니다...
    goto do_install
)

goto start_server

:do_install
call npm install
if errorlevel 1 (
    echo.
    echo [오류] npm install 실패 — install.bat 을 실행해 주세요.
    pause
    exit /b 1
)
echo.

:start_server

echo.
echo 개발 서버를 시작합니다...
echo 관리자: http://localhost:5173/admin
echo 회원:   http://localhost:5173/member
echo 종료하려면 이 창에서 Ctrl+C 를 누르세요.
echo.

call npm run dev

echo.
pause
