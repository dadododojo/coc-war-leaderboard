@echo off
REM Quick Push Script for CoC War Tracker (Windows)
REM Usage: push.bat "your commit message"

echo 🚀 Pushing to GitHub...

git add .

REM Use provided message or default with timestamp
if "%~1"=="" (
    git commit -m "Update leaderboard %date% %time%"
) else (
    git commit -m "%~1"
)

git push

echo ✅ Successfully pushed to GitHub!
echo 🌐 Your site will update in 1-2 minutes
pause