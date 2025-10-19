@echo off
echo ========================================
echo TBS Frontend Server
echo ========================================
echo.
echo Starting frontend server on http://localhost:3000
echo This will serve your website properly so the Team Login works
echo.
echo Press Ctrl+C to stop the server
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using custom Node.js server with proper MIME types...
    node server.js
    goto :end
)

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using Python to serve the frontend...
    echo Note: Python server may have MIME type issues with JavaScript files
    python -m http.server 3000
    goto :end
)

echo Neither Python nor Node.js found!
echo Please install one of them to serve the frontend.
echo.
echo For Python: https://www.python.org/downloads/
echo For Node.js: https://nodejs.org/
echo.
pause
exit /b 1

:end
echo.
echo Frontend server stopped.
pause
