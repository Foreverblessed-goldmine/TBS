@echo off
echo Starting TBS Backend Server...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file from template...
    copy env.example .env
    echo.
)

REM Start the development server
echo Starting development server on http://localhost:8080
echo Press Ctrl+C to stop the server
echo.
npm run dev

pause



