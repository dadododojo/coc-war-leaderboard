const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Configuration
const CONFIG = {
    WATCH_FILE: 'leaderboard.json',
    GITHUB_REPO_PATH: '.',
    CHECK_INTERVAL: 2000, // Check every 2 seconds
};

let lastModifiedTime = null;
let isFirstRun = true;

// Get file modification time
function getFileModifiedTime(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.mtime.getTime();
    } catch (error) {
        return null;
    }
}

// Update cumulative stats
async function updateCumulativeStats() {
    try {
        console.log('📊 Updating cumulative statistics...');
        
        execSync('node cumulative-tracker.js', {
            cwd: CONFIG.GITHUB_REPO_PATH,
            stdio: 'inherit'
        });
        
        console.log('✅ Cumulative stats updated!\n');
    } catch (error) {
        console.error('❌ Error updating cumulative stats:', error.message);
    }
}

// Push to GitHub
function pushToGitHub() {
    try {
        console.log('🚀 Pushing to GitHub...');
        
        // Add all leaderboard files
        execSync('git add leaderboard.json leaderboard-cumulative.json cumulative-stats.json', { 
            cwd: CONFIG.GITHUB_REPO_PATH,
            stdio: 'inherit'
        });

        // Commit with timestamp
        const timestamp = new Date().toLocaleString();
        execSync(`git commit -m "Update leaderboards: ${timestamp}"`, { 
            cwd: CONFIG.GITHUB_REPO_PATH,
            stdio: 'inherit'
        });

        // Push to GitHub
        execSync('git push', { 
            cwd: CONFIG.GITHUB_REPO_PATH,
            stdio: 'inherit'
        });

        console.log('✅ Successfully pushed to GitHub!');
        console.log('🌐 Your leaderboard page will update in 1-2 minutes\n');
    } catch (error) {
        // Check if error is "nothing to commit"
        if (error.message.includes('nothing to commit')) {
            console.log('ℹ️  No changes to push (file unchanged)\n');
        } else {
            console.error('❌ Error pushing to GitHub:', error.message);
            console.log('Make sure you have git configured and authenticated\n');
        }
    }
}

// Watch for file changes
async function watchFile() {
    const currentModifiedTime = getFileModifiedTime(CONFIG.WATCH_FILE);

    // If file exists
    if (currentModifiedTime !== null) {
        // If this is first run, just store the time
        if (isFirstRun) {
            lastModifiedTime = currentModifiedTime;
            isFirstRun = false;
            console.log(`👀 Watching ${CONFIG.WATCH_FILE} for changes...`);
            console.log('💡 Generate a new leaderboard and I\'ll automatically:\n   1. Update cumulative stats\n   2. Push everything to GitHub\n');
        }
        // If file was modified since last check
        else if (lastModifiedTime !== null && currentModifiedTime > lastModifiedTime) {
            console.log(`\n📄 ${CONFIG.WATCH_FILE} was updated!`);
            lastModifiedTime = currentModifiedTime;
            
            // Wait a moment to ensure file is fully written
            setTimeout(async () => {
                await updateCumulativeStats();
                pushToGitHub();
            }, 1000);
        }
    } else {
        // File doesn't exist yet
        if (lastModifiedTime !== null) {
            console.log(`⚠️  ${CONFIG.WATCH_FILE} was deleted`);
            lastModifiedTime = null;
        }
    }
}

// Start watching
console.log('🎯 Leaderboard Auto-Updater Started!');
console.log('====================================');
console.log(`📁 Watching for: ${CONFIG.WATCH_FILE}`);
console.log(`📂 In directory: ${path.resolve(CONFIG.GITHUB_REPO_PATH)}`);
console.log(`⏱️  Checking every ${CONFIG.CHECK_INTERVAL / 1000} seconds`);
console.log('====================================\n');

// Check immediately
watchFile();

// Then check on interval
const intervalId = setInterval(watchFile, CONFIG.CHECK_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping auto-updater...');
    clearInterval(intervalId);
    console.log('✅ Auto-updater stopped. Goodbye!');
    process.exit(0);
});

// Keep the script running
process.stdin.resume();