const fetch = require('node-fetch');
const fs = require('fs').promises;

// Configuration
const CONFIG = {
    API_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjBiNDNhNDRjLWYyNGQtNDY5OC05MzQzLWQ2ZGJhZTUxZmNjOSIsImlhdCI6MTc2NzE1MDgwNiwic3ViIjoiZGV2ZWxvcGVyLzE5OGMyYzM1LWI5ZjEtM2EyNy00MmRhLWE1ODJiNjQ3NjdlMiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjEzOC4xOTkuMzMuMjQ0IiwiMTE1LjcwLjUwLjYyIl0sInR5cGUiOiJjbGllbnQifV19.8VhqoEY3UwFhFvQqDlYGShooQM_dKYHpdJZNfuhZ4klhbp5vyqk7fCdtfVyRSlkFwGmxhDAFBOkwfG0IlcblWQ', // Get from https://developer.clashofclans.com
    CLAN_TAG: '#LYJV220Y', // Your clan tag (with the #)
    // Run at specific times (24-hour format)
    FETCH_TIMES: ['09:00', '15:00', '21:00'], // 9 AM, 3 PM, 9 PM
    // Or use interval (uncomment to use)
    // FETCH_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
};

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
async function performFetch() {
    try {
        console.log('\n⏰ Scheduled Fetch Starting...');
        console.log(new Date().toLocaleString());
        console.log('====================================\n');

        // Check if already fetched today (prevents duplicates)
        const alreadyFetched = await wasFetchedToday();
        if (alreadyFetched) {
            console.log('ℹ️  Already fetched war data today');
            console.log('💡 Skipping to avoid duplicate fetches\n');
            return;
        }

        // Fetch war data
        const warData = await fetchCurrentWar();
        
        if (!warData) {
            console.log('❌ Failed to fetch war data\n');
            return;
        }

        // Check war state
        if (warData.state === 'notInWar') {
            console.log('ℹ️  Not currently in war\n');
            return;
        }

        console.log(`📊 War State: ${warData.state}`);
        const participants = extractParticipants(warData);
        console.log(`👥 Found ${participants.length} participants`);

        await saveWarData(warData, participants);
        await markFetchComplete();
        
        console.log('🎉 Fetch complete!');
        console.log('💡 Open data-entry.html to generate leaderboard\n');

    } catch (error) {
        console.error('❌ Error during fetch:', error.message, '\n');
    }
}

// Calculate milliseconds until next scheduled time
function msUntilTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    
    // If target time has passed today, schedule for tomorrow
    if (target <= now) {
        target.setDate(target.getDate() + 1);
    }
    
    return target - now;
}

// Schedule fetches at specific times
function scheduleTimedFetches() {
    console.log('🕐 Scheduling fetches at specific times:');
    
    CONFIG.FETCH_TIMES.forEach(time => {
        const ms = msUntilTime(time);
        const nextRun = new Date(Date.now() + ms);
        console.log(`   ${time} - Next run: ${nextRun.toLocaleString()}`);
        
        // Schedule first run
        setTimeout(() => {
            performFetch();
            // Then repeat every 24 hours
            setInterval(performFetch, 24 * 60 * 60 * 1000);
        }, ms);
    });
    
    console.log('\n✅ Scheduler active! Leave this running.\n');
}

// Schedule fetch at interval
function scheduleIntervalFetch() {
    console.log('⏰ Scheduling fetch every 24 hours');
    console.log(`   Next run: ${new Date(Date.now() + CONFIG.FETCH_INTERVAL).toLocaleString()}\n`);
    
    // Run immediately
    performFetch();
    
    // Then repeat
    setInterval(performFetch, CONFIG.FETCH_INTERVAL);
}

// Start scheduler
console.log('🎯 Scheduled War Data Fetcher Started!');
console.log('====================================');
console.log(`🏰 Clan: ${CONFIG.CLAN_TAG}`);
console.log('====================================\n');

// Choose scheduling method
if (CONFIG.FETCH_TIMES && CONFIG.FETCH_TIMES.length > 0) {
    scheduleTimedFetches();
} else if (CONFIG.FETCH_INTERVAL) {
    scheduleIntervalFetch();
} else {
    console.error('❌ No scheduling configured!');
    console.error('Set either FETCH_TIMES or FETCH_INTERVAL in CONFIG');
    process.exit(1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping scheduler...');
    console.log('✅ Scheduler stopped. Goodbye!');
    process.exit(0);
});

// Keep script running
process.stdin.resume();