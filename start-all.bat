@echo off
title CoC War Tracker - Full Auto Mode

echo ========================================
echo   CoC War Tracker - Full Auto Mode
echo ========================================
echo.
echo This will start BOTH automation scripts:
echo   1. Auto-fetch wars (checks every 30 min)
echo   2. Auto-push to GitHub (watches for leaderboard)
echo.
echo Press Ctrl+C in each window to stop
echo.
pause

echo.
echo Starting auto-fetch-wars.js in new window...
start "Auto Fetch Wars" cmd /k "node auto-fetch-wars.js"

timeout /t 2 /nobreak >nul

echo Starting watch-and-push.js in new window...
start "Auto Push to GitHub" cmd /k "node watch-and-push.js"

echo.
echo ✅ Both scripts are now running in separate windows!
echo.
echo What happens automatically:
echo   - Every 30 min: Checks for completed wars
echo   - When war ends: Downloads war data
echo   - When you generate leaderboard: Auto-pushes to GitHub
echo.
echo You just need to:
echo   1. Open data-entry.html
echo   2. Upload war-data.json when war completes
echo   3. Generate leaderboard
echo   4. Everything else is automatic!
echo.
pause