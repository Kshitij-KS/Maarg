@echo off
REM Double-click or run from repo root: starts Next on http://localhost:3000
cd /d "%~dp0frontend"
if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)
call npm run dev
pause
