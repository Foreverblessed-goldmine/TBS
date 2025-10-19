@echo off
echo ========================================
echo TBS Complete System Startup
echo ========================================
echo.
echo This will start both the backend and frontend servers
echo.
echo Backend will be available at: http://localhost:8080
echo Frontend will be available at: http://localhost:3000
echo.
echo Press any key to start both servers...
pause >nul

echo.
echo Starting backend server...
start "TBS Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo Starting frontend server...
start "TBS Frontend" cmd /k "cd /d "%~dp0" && serve-frontend.bat"

echo.
echo ========================================
echo Both servers are starting!
echo ========================================
echo.
echo Backend: http://localhost:8080
echo Frontend: http://localhost:3000
echo.
echo The frontend server will automatically open your website
echo with the Team Login working properly.
echo.
echo Press any key to open the website...
pause >nul

start http://localhost:3000

echo.
echo Website opened! You can now use the Team Login button.
echo.
echo To stop the servers, close the command windows that opened.
echo.
pause
