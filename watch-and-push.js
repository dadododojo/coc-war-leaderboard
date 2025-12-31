const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Configuration
const CONFIG = {
    WATCH_FILE: 'leaderboard.json',
    GITHUB_REPO_PATH: '.',
    CHECK_INTERVAL: 2000, // Check every 2 seconds
};

// Get Downloads folder path
function getDownloadsPath() {
    return path.join(os.homedir(), 'Downloads');
}

let lastModifiedTime = null;
let lastDownloadsModifiedTime = null;
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

// Move file from Downloads to project folder
function moveFromDownloads() {
    const downloadsPath = path.join(getDownloadsPath(), CONFIG.WATCH_FILE);
    const projectPath = path.join(CONFIG.GITHUB_REPO_PATH, CONFIG.WATCH_FILE);
    
    try {
        if (fs.existsSync(downloadsPath)) {
            console.log('📥 Found leaderboard.json in Downloads!');
            console.log('📦 Moving to project folder...');
            
            // Copy file to project folder
            fs.copyFileSync(downloadsPath, projectPath);
            
            // Delete from Downloads
            fs.unlinkSync(downloadsPath);
            
            console.log('✅ File moved successfully!\n');
            return true;
        }
    } catch (error) {
        console.error('❌ Error moving file:', error.message);
    }
    return false;
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
    const projectPath = path.join(CONFIG.GITHUB_REPO_PATH, CONFIG.WATCH_FILE);
    const downloadsPath = path.join(getDownloadsPath(), CONFIG.WATCH_FILE);
    
    // Check Downloads folder first
    const downloadsModifiedTime = getFileModifiedTime(downloadsPath);
    if (downloadsModifiedTime !== null && downloadsModifiedTime !== lastDownloadsModifiedTime) {
        lastDownloadsModifiedTime = downloadsModifiedTime;
        
        // Wait a moment to ensure file is fully written
        setTimeout(() => {
            if (moveFromDownloads()) {
                // Trigger the update process
                setTimeout(async () => {
                    await updateCumulativeStats();
                    pushToGitHub();
                }, 1000);
            }
        }, 500);
        return;
    }
    
    // Check project folder
    const currentModifiedTime = getFileModifiedTime(projectPath);

    if (currentModifiedTime !== null) {
        if (isFirstRun) {
            lastModifiedTime = currentModifiedTime;
            isFirstRun = false;
            console.log(`👀 Watching for leaderboard.json in:`);
            console.log(`   📁 Project folder: ${path.resolve(CONFIG.GITHUB_REPO_PATH)}`);
            console.log(`   📥 Downloads folder: ${getDownloadsPath()}`);
            console.log('\n💡 Generate a leaderboard and I\'ll automatically:');
            console.log('   1. Move it from Downloads to project folder');
            console.log('   2. Update cumulative stats');
            console.log('   3. Push everything to GitHub\n');
        }
        else if (lastModifiedTime !== null && currentModifiedTime > lastModifiedTime) {
            console.log(`\n📄 ${CONFIG.WATCH_FILE} was updated!`);
            lastModifiedTime = currentModifiedTime;
            
            setTimeout(async () => {
                await updateCumulativeStats();
                pushToGitHub();
            }, 1000);
        }
    } else {
        if (lastModifiedTime !== null) {
            console.log(`⚠️  ${CONFIG.WATCH_FILE} was deleted`);
            lastModifiedTime = null;
        }
    }
}

// Start watching
console.log('🎯 Leaderboard Auto-Updater Started!');
console.log('====================================');
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