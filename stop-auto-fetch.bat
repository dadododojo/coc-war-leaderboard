@echo off
echo ⚠️  Stopping Auto-Fetch Scripts
echo ====================================
echo.
echo This will stop ALL Node.js processes related to:
echo   - auto-fetch-wars.js
echo.
echo ⚠️  WARNING: This will also stop watch-and-push.js
echo    You'll need to restart it manually after.
echo.
pause

echo.
echo 🔍 Finding Node.js processes...
tasklist | findstr "node.exe"

echo.
echo 🛑 Stopping all Node.js processes...
taskkill /F /IM node.exe

echo.
echo ✅ All Node.js scripts stopped!
echo.
echo 💡 To restart the watcher (recommended):
echo    node watch-and-push.js
echo.
pause