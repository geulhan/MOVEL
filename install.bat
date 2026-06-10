@echo off
chcp 65001 >nul
title 모벨 퍼포먼스 트레이닝 - 패키지 설치

cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
    echo.
    echo [오류] npm을 찾을 수 없습니다.
    echo.
    echo 1. https://nodejs.org 에서 LTS 버전 설치
    echo 2. 설치 후 PC를 재시작하거나 새 터미널을 열기
    echo 3. install.bat 을 다시 실행
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   모벨 퍼포먼스 트레이닝 - 패키지 설치
echo ========================================
echo.
echo Node.js: 
node -v
echo npm:
npm -v
echo.
echo npm install 실행 중... (1~3분 걸릴 수 있습니다)
echo package.json 에 적힌 패키지를 모두 설치합니다.
echo.

call npm install
if exist "node_modules\react-router-dom\" (
    echo [OK] react-router-dom 설치됨
) else (
    echo [경고] react-router-dom 이 없습니다. 인터넷 연결 후 다시 실행하세요.
)

if errorlevel 1 (
    echo.
    echo [오류] 설치에 실패했습니다.
    echo 인터넷 연결을 확인한 뒤 다시 시도해 주세요.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   설치 완료!
echo ========================================
echo.
echo 다음 단계:
echo   1. Supabase에서 fix_all.sql 실행 (최초 1회)
echo   2. .env 파일에 Supabase URL/키 설정
echo   3. run.bat 더블클릭으로 앱 실행
echo.
echo   관리자: http://localhost:5173/admin
echo   회원:   http://localhost:5173/member
echo.
pause
