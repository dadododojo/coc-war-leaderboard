const fetch = require('node-fetch');
const fs = require('fs').promises;

// Configuration
const CONFIG = {
    API_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjBiNDNhNDRjLWYyNGQtNDY5OC05MzQzLWQ2ZGJhZTUxZmNjOSIsImlhdCI6MTc2NzE1MDgwNiwic3ViIjoiZGV2ZWxvcGVyLzE5OGMyYzM1LWI5ZjEtM2EyNy00MmRhLWE1ODJiNjQ3NjdlMiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjEzOC4xOTkuMzMuMjQ0IiwiMTE1LjcwLjUwLjYyIl0sInR5cGUiOiJjbGllbnQifV19.8VhqoEY3UwFhFvQqDlYGShooQM_dKYHpdJZNfuhZ4klhbp5vyqk7fCdtfVyRSlkFwGmxhDAFBOkwfG0IlcblWQ', // Get from https://developer.clashofclans.com
    CLAN_TAG: '#LYJV220Y', // Your clan tag (with the #)
    CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
    RATE_LIMIT_DELAY: 5000, // 5 second delay between API calls
};

// Format clan tag for URL (replace # with %23)
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
                console.error('❌ Rate limited by API! Waiting longer before next check...');
                throw new Error('Rate limit exceeded');
            }
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ API call successful`);
        
        // Add delay after successful call
        await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_DELAY));
        
        return data;
    } catch (error) {
        console.error('Error fetching war data:', error.message);
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
        
        // Extract attack 1 data
        let attack1 = { stars: 0, percentage: 0 };
        if (attacks.length > 0) {
            attack1 = {
                stars: attacks[0].stars || 0,
                percentage: attacks[0].destructionPercentage || 0
            };
        }

        // Extract attack 2 data (might not exist in CWL)
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
        isCWL: participants.some(p => p.attackCount === 1), // Detect if CWL
        preparationStartTime: warData.preparationStartTime,
        startTime: warData.startTime,
        endTime: warData.endTime,
        participants: participants
    };

    await fs.writeFile('war-data.json', JSON.stringify(output, null, 2));
    console.log('✅ War data saved to war-data.json');
    return output;
}

// Check if we've already processed this war
async function hasWarBeenProcessed(endTime) {
    try {
        const data = await fs.readFile('last-processed-war.txt', 'utf8');
        return data.trim() === endTime;
    } catch (error) {
        return false;
    }
}

// Mark war as processed
async function markWarAsProcessed(endTime) {
    await fs.writeFile('last-processed-war.txt', endTime);
}

// Main check function
async function checkForCompletedWar() {
    try {
        console.log('\n⏰ Checking for completed wars...');
        console.log(new Date().toLocaleString());

        const warData = await fetchCurrentWar();
        
        if (!warData) {
            console.log('❌ Failed to fetch war data');
            return;
        }

        // Check war state
        if (warData.state === 'notInWar') {
            console.log('ℹ️  Not currently in war');
            return;
        }

        if (warData.state === 'preparation' || warData.state === 'inWar') {
            console.log(`ℹ️  War in progress (${warData.state})`);
            return;
        }

        // War is in "warEnded" state
        if (warData.state === 'warEnded') {
            console.log('🎉 War has ended!');
            
            // Check if we've already processed this war
            const alreadyProcessed = await hasWarBeenProcessed(warData.endTime);
            if (alreadyProcessed) {
                console.log('ℹ️  This war has already been processed');
                return;
            }

            console.log('📥 Fetching final war data...');
            const participants = extractParticipants(warData);
            await saveWarData(warData, participants);
            
            // Mark as processed
            await markWarAsProcessed(warData.endTime);
            
            console.log(`✅ Processed war data for ${participants.length} participants`);
            if (warData.teamSize && participants.some(p => p.attackCount === 1)) {
                console.log('🏆 CWL war detected (1 attack per player)');
            }
            console.log('💡 You can now open data-entry.html to generate the leaderboard!');
        }

    } catch (error) {
        console.error('❌ Error checking for wars:', error.message);
    }
}

// Start the auto-fetcher
console.log('🤖 Auto War Data Fetcher Started!');
console.log('====================================');
console.log(`📡 Checking every ${CONFIG.CHECK_INTERVAL / 1000 / 60 / 60} hours`);
console.log(`🏰 Clan: ${CONFIG.CLAN_TAG}`);
console.log(`⏰ Next check: ${new Date(Date.now() + CONFIG.CHECK_INTERVAL).toLocaleString()}`);
console.log('====================================\n');

console.log('⚠️  IMPORTANT: This script should only run ONCE');
console.log('⚠️  Running multiple instances will hit API rate limits!\n');

// Run immediately on start
checkForCompletedWar();

// Then run on interval
const intervalId = setInterval(() => {
    console.log(`\n⏰ Next check scheduled for: ${new Date(Date.now() + CONFIG.CHECK_INTERVAL).toLocaleString()}`);
    checkForCompletedWar();
}, CONFIG.CHECK_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping auto-fetcher...');
    clearInterval(intervalId);
    console.log('✅ Auto-fetcher stopped. Goodbye!');
    process.exit(0);
});

// Keep script running
process.stdin.resume();