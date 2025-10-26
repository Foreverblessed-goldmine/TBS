@echo off
echo ========================================
echo TBS Backend Setup and Start
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo 1. Go to https://nodejs.org/
    echo 2. Download the LTS version for Windows
    echo 3. Run the installer and follow the setup wizard
    echo 4. Restart your computer after installation
    echo 5. Then run this batch file again
    echo.
    echo Opening Node.js download page...
    start https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js is installed: 
node --version
echo.

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo npm is not available!
    echo Please reinstall Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo npm version:
npm --version
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file from template...
    copy env.example .env
    echo.
)

echo ========================================
echo Starting TBS Backend Server...
echo ========================================
echo Server will be available at: http://localhost:8080
echo Press Ctrl+C to stop the server
echo.

npm run dev

echo.
echo Server stopped.
pause




