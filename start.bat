@echo off
echo 🎮 CoC War Tracker Starting...
echo.
echo Step 1: Fetching war data...
node fetch-war-data.js
echo.
echo Step 2: Starting auto-watcher...
echo.
echo ✅ Now open data-entry.html and upload war-data.json
echo 💡 The watcher will automatically push to GitHub when you generate the leaderboard
echo.
echo Press Ctrl+C when done to stop the watcher
echo.
node watch-and-push.js