const fetch = require('node-fetch');
const fs = require('fs').promises;
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    API_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjBiNDNhNDRjLWYyNGQtNDY5OC05MzQzLWQ2ZGJhZTUxZmNjOSIsImlhdCI6MTc2NzE1MDgwNiwic3ViIjoiZGV2ZWxvcGVyLzE5OGMyYzM1LWI5ZjEtM2EyNy00MmRhLWE1ODJiNjQ3NjdlMiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjEzOC4xOTkuMzMuMjQ0IiwiMTE1LjcwLjUwLjYyIl0sInR5cGUiOiJjbGllbnQifV19.8VhqoEY3UwFhFvQqDlYGShooQM_dKYHpdJZNfuhZ4klhbp5vyqk7fCdtfVyRSlkFwGmxhDAFBOkwfG0IlcblWQ', // Get from https://developer.clashofclans.com
    CLAN_TAG: '#LYJV220Y', // Your clan tag (with the #)
    // Run at specific times (24-hour format)
    FETCH_TIMES: ['10:00', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'], // 10 AM, 3 PM, 9 PM
    AUTO_GENERATE_LEADERBOARD: true, // Set to false if you want manual control
};

// Generate times for every 30 minutes in a day
function generateHalfHourTimes() {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
        times.push(`${hour.toString().padStart(2, '0')}:00`);
        times.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return times;
}

// Format clan tag for URL
function formatClanTag(tag) {
    return encodeURIComponent(tag);
}

// Fetch current war data
async function fetchCurrentWar() {
    const url = `https://api.clashofclans.com/v1/clans/${formatClanTag(CONFIG.CLAN_TAG)}/currentwar`;
    
    try {
        console.log(`🌐 Making API call to Clash of Clans...`);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 429) {
                console.error('❌ Rate limited by API!');
                throw new Error('Rate limit exceeded');
            }
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ API call successful`);
        return data;
    } catch (error) {
        console.error('❌ Error fetching war data:', error.message);
        return null;
    }
}

// Extract participant information with attack data
function extractParticipants(warData) {
    if (warData.state === 'notInWar') {
        return [];
    }

    const participants = warData.clan.members.map(member => {
        const attacks = member.attacks || [];
        
        let attack1 = { stars: 0, percentage: 0 };
        if (attacks.length > 0) {
            attack1 = {
                stars: attacks[0].stars || 0,
                percentage: attacks[0].destructionPercentage || 0
            };
        }

        let attack2 = { stars: 0, percentage: 0 };
        if (attacks.length > 1) {
            attack2 = {
                stars: attacks[1].stars || 0,
                percentage: attacks[1].destructionPercentage || 0
            };
        }

        return {
            tag: member.tag,
            name: member.name,
            townHallLevel: member.townhallLevel,
            mapPosition: member.mapPosition,
            attack1: attack1,
            attack2: attack2,
            attackCount: attacks.length
        };
    });

    return participants;
}

// Save war data to JSON file
async function saveWarData(warData, participants) {
    const output = {
        lastUpdated: new Date().toISOString(),
        warState: warData.state,
        teamSize: warData.teamSize,
        isCWL: participants.some(p => p.attackCount === 1),
        preparationStartTime: warData.preparationStartTime,
        startTime: warData.startTime,
        endTime: warData.endTime,
        participants: participants
    };

    await fs.writeFile('war-data.json', JSON.stringify(output, null, 2));
    console.log('✅ War data saved to war-data.json');
}

// Generate leaderboard automatically from war data
async function generateLeaderboard(participants) {
    console.log('📊 Generating leaderboard automatically...');

    const results = participants.map(player => {
        const stars1 = player.attack1.stars || 0;
        const percent1 = player.attack1.percentage || 0;
        const stars2 = player.attack2.stars || 0;
        const percent2 = player.attack2.percentage || 0;

        // Detect missed attacks (0 stars, 0%)
        const missedAttack1 = stars1 === 0 && percent1 === 0;
        const missedAttack2 = stars2 === 0 && percent2 === 0;
        const missedAttacks = (missedAttack1 ? 1 : 0) + (missedAttack2 ? 1 : 0);

        return {
            tag: player.tag,
            name: player.name,
            townHallLevel: player.townHallLevel,
            totalStars: stars1 + stars2,
            totalPercentage: percent1 + percent2,
            missedAttacks: missedAttacks,
            attack1: {
                stars: stars1,
                percentage: percent1,
                isLoot: false, // Auto-generation assumes no loot attacks
                missed: missedAttack1
            },
            attack2: {
                stars: stars2,
                percentage: percent2,
                isLoot: false,
                missed: missedAttack2
            }
        };
    });

    // Sort by stars (desc), then percentage (desc), then missed attacks (asc)
    results.sort((a, b) => {
        if (b.totalStars !== a.totalStars) {
            return b.totalStars - a.totalStars;
        }
        if (b.totalPercentage !== a.totalPercentage) {
            return b.totalPercentage - a.totalPercentage;
        }
        return a.missedAttacks - b.missedAttacks;
    });

    const leaderboardData = {
        lastUpdated: new Date().toISOString(),
        players: results
    };

    await fs.writeFile('leaderboard.json', JSON.stringify(leaderboardData, null, 2));
    console.log('✅ Leaderboard generated: leaderboard.json');

    return leaderboardData;
}

// Update cumulative stats
async function updateCumulativeStats() {
    try {
        console.log('📈 Updating cumulative statistics...');
        execSync('node cumulative-tracker.js', { stdio: 'inherit' });
        console.log('✅ Cumulative stats updated');
    } catch (error) {
        console.error('❌ Error updating cumulative stats:', error.message);
    }
}

// Push to GitHub
async function pushToGitHub() {
    try {
        console.log('🚀 Pushing to GitHub...');
        
        const filesToAdd = [];
        
        // Only add files that exist and aren't ignored
        const files = ['leaderboard.json', 'leaderboard-cumulative.json'];
        
        for (const file of files) {
            if (await fileExists(file)) {
                filesToAdd.push(file);
            }
        }
        
        if (filesToAdd.length === 0) {
            console.log('⚠️  No files to push');
            return;
        }
        
        execSync(`git add ${filesToAdd.join(' ')}`, { stdio: 'pipe' });
        
        const timestamp = new Date().toLocaleString();
        execSync(`git commit -m "Auto-update: ${timestamp}"`, { stdio: 'pipe' });
        
        execSync('git push', { stdio: 'inherit' });
        
        console.log('✅ Successfully pushed to GitHub!');
        console.log('🌐 Your site will update in 1-2 minutes');
    } catch (error) {
        if (error.message.includes('nothing to commit')) {
            console.log('ℹ️  No changes to push');
        } else {
            console.error('❌ Error pushing to GitHub:', error.message);
        }
    }
}

// Helper to check if file exists
async function fileExists(path) {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

// Check if war data was already fetched today
async function wasFetchedToday() {
    try {
        const data = await fs.readFile('last-fetch-time.txt', 'utf8');
        const lastFetch = new Date(data);
        const today = new Date();
        
        return lastFetch.toDateString() === today.toDateString();
    } catch (error) {
        return false;
    }
}

// Mark fetch as completed
async function markFetchComplete() {
    await fs.writeFile('last-fetch-time.txt', new Date().toISOString());
}

// Main fetch function
async function performFullAutomation() {
    try {
        console.log('\n════════════════════════════════════════');
        console.log('⚡ FULL AUTOMATION CYCLE STARTING');
        console.log(new Date().toLocaleString());
        console.log('════════════════════════════════════════\n');

        // Check if already fetched today
        const alreadyFetched = await wasFetchedToday();
        if (alreadyFetched) {
            console.log('ℹ️  Already processed today');
            console.log('💡 Skipping to avoid duplicates\n');
            return;
        }

        // STEP 1: Fetch war data from API
        console.log('STEP 1: Fetching war data from API...');
        const warData = await fetchCurrentWar();
        
        if (!warData) {
            console.log('❌ Failed to fetch war data\n');
            return;
        }

        if (warData.state === 'notInWar') {
            console.log('ℹ️  Not currently in war\n');
            return;
        }

        // NEW: Only process if war has ENDED
        if (warData.state !== 'warEnded') {
            console.log(`ℹ️  War is in progress (${warData.state})`);
            console.log('💡 Waiting for war to end before processing stats');
            console.log(`   War ends: ${new Date(warData.endTime).toLocaleString()}\n`);
            return;
        }

        console.log(`✅ War has ENDED - safe to process!`);
        console.log(`📊 War State: ${warData.state}`);
        const participants = extractParticipants(warData);
        console.log(`👥 Found ${participants.length} participants\n`);

        await saveWarData(warData, participants);

        // STEP 2: Generate leaderboard automatically
        if (CONFIG.AUTO_GENERATE_LEADERBOARD) {
            console.log('STEP 2: Auto-generating leaderboard...');
            await generateLeaderboard(participants);
            console.log('');

            // STEP 3: Update cumulative stats
            console.log('STEP 3: Updating cumulative statistics...');
            await updateCumulativeStats();
            console.log('');

            // STEP 4: Push to GitHub
            console.log('STEP 4: Pushing to GitHub...');
            await pushToGitHub();
            console.log('');
        } else {
            console.log('ℹ️  Auto-generation disabled');
            console.log('💡 Open data-entry.html to manually review and generate\n');
        }

        await markFetchComplete();
        
        console.log('════════════════════════════════════════');
        console.log('🎉 FULL AUTOMATION CYCLE COMPLETE!');
        console.log('════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error during automation:', error.message, '\n');
    }
}

// Calculate milliseconds until next scheduled time
function msUntilTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    
    if (target <= now) {
        target.setDate(target.getDate() + 1);
    }
    
    return target - now;
}

// Schedule fetches at specific times
function scheduleTimedFetches() {
    console.log('🕐 Scheduling fetches every 30 minutes:');
    console.log(`   Total fetch times: ${CONFIG.FETCH_TIMES.length} per day\n`);
    
    // Show next 5 fetch times
    console.log('   Next 5 fetch times:');
    const now = new Date();
    const nextTimes = CONFIG.FETCH_TIMES
        .map(time => {
            const ms = msUntilTime(time);
            return { time, ms, date: new Date(Date.now() + ms) };
        })
        .sort((a, b) => a.ms - b.ms)
        .slice(0, 5);
    
    nextTimes.forEach(({time, date}) => {
        console.log(`   ${time} - ${date.toLocaleString()}`);
    });
    
    // Schedule all times
    CONFIG.FETCH_TIMES.forEach(time => {
        const ms = msUntilTime(time);
        
        // Schedule first run
        setTimeout(() => {
            performFullAutomation();
            // Then repeat every 24 hours
            setInterval(performFullAutomation, 24 * 60 * 60 * 1000);
        }, ms);
    });
    
    console.log('\n✅ Scheduler active! Fetching every 30 minutes.\n');
}

// Schedule fetch at interval
function scheduleIntervalFetch() {
    const intervalMinutes = CONFIG.FETCH_INTERVAL / 1000 / 60;
    console.log(`⏰ Scheduling fetch every ${intervalMinutes} minutes`);
    console.log(`   Next run: ${new Date(Date.now() + CONFIG.FETCH_INTERVAL).toLocaleString()}\n`);
    
    // Run immediately
    performFullAutomation();
    
    // Then repeat
    setInterval(performFullAutomation, CONFIG.FETCH_INTERVAL);
}

// Start scheduler
console.log('🤖 FULLY AUTOMATED WAR TRACKER');
console.log('════════════════════════════════════════');
console.log(`🏰 Clan: ${CONFIG.CLAN_TAG}`);
console.log(`🔄 Auto-generate: ${CONFIG.AUTO_GENERATE_LEADERBOARD ? 'ENABLED' : 'DISABLED'}`);
console.log(`⏱️  Fetch method: ${CONFIG.USE_INTERVAL ? 'Every 30 minutes' : 'Scheduled times'}`);
console.log('════════════════════════════════════════\n');

// Choose scheduling method
if (CONFIG.USE_INTERVAL) {
    scheduleIntervalFetch();
} else {
    scheduleTimedFetches();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping automation...');
    console.log('✅ Automation stopped. Goodbye!');
    process.exit(0);
});

// Keep script running
process.stdin.resume();