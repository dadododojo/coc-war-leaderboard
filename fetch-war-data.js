const fetch = require('node-fetch');
const fs = require('fs').promises;

// Configuration
const CONFIG = {
    API_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjBiNDNhNDRjLWYyNGQtNDY5OC05MzQzLWQ2ZGJhZTUxZmNjOSIsImlhdCI6MTc2NzE1MDgwNiwic3ViIjoiZGV2ZWxvcGVyLzE5OGMyYzM1LWI5ZjEtM2EyNy00MmRhLWE1ODJiNjQ3NjdlMiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjEzOC4xOTkuMzMuMjQ0IiwiMTE1LjcwLjUwLjYyIl0sInR5cGUiOiJjbGllbnQifV19.8VhqoEY3UwFhFvQqDlYGShooQM_dKYHpdJZNfuhZ4klhbp5vyqk7fCdtfVyRSlkFwGmxhDAFBOkwfG0IlcblWQ', // Get from https://developer.clashofclans.com
    CLAN_TAG: '#LYJV220Y', // Your clan tag (with the #)
};

// Format clan tag for URL (replace # with %23)
function formatClanTag(tag) {
    return encodeURIComponent(tag);
}

// Fetch current war data
async function fetchCurrentWar() {
    const url = `https://api.clashofclans.com/v1/clans/${formatClanTag(CONFIG.CLAN_TAG)}/currentwar`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching war data:', error.message);
        throw error;
    }
}

// Extract participant information with attack data
function extractParticipants(warData) {
    if (warData.state === 'notInWar') {
        console.log('Clan is not currently in war');
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

        // Extract attack 2 data
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
            attack2: attack2
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
        preparationStartTime: warData.preparationStartTime,
        startTime: warData.startTime,
        endTime: warData.endTime,
        participants: participants
    };

    await fs.writeFile('war-data.json', JSON.stringify(output, null, 2));
    console.log('War data saved to war-data.json');
}

// Main execution
async function main() {
    try {
        console.log('Fetching current war data...');
        const warData = await fetchCurrentWar();
        
        const participants = extractParticipants(warData);
        console.log(`Found ${participants.length} participants`);
        
        // Check war state
        if (warData.state === 'notInWar') {
            console.log('⚠️  Clan is not in war');
            console.log('ℹ️  War data not saved');
            return;
        }
        
        // Warn if war is still in progress
        if (warData.state !== 'warEnded') {
            console.log(`\n⚠️  WARNING: War is still in progress (${warData.state})`);
            console.log(`   War ends: ${new Date(warData.endTime).toLocaleString()}`);
            console.log(`\n💡 Stats may be incomplete - some players haven't attacked yet`);
            console.log(`   For accurate stats, fetch after war ends (state: warEnded)\n`);
        } else {
            console.log(`\n✅ War has ended - stats are complete!`);
        }

        await saveWarData(warData, participants);
        
        console.log('Success! Check war-data.json for results');
    } catch (error) {
        console.error('Failed to fetch war data:', error.message);
        process.exit(1);
    }
}

main();const fetch = require('node-fetch');
const fs = require('fs').promises;

// Configuration
const CONFIG = {
    API_KEY: 'YOUR_API_KEY_HERE', // Get from https://developer.clashofclans.com
    CLAN_TAG: '#YOUR_CLAN_TAG', // Your clan tag (with the #)
};

// Format clan tag for URL (replace # with %23)
function formatClanTag(tag) {
    return encodeURIComponent(tag);
}

// Fetch current war data
async function fetchCurrentWar() {
    const url = `https://api.clashofclans.com/v1/clans/${formatClanTag(CONFIG.CLAN_TAG)}/currentwar`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching war data:', error.message);
        throw error;
    }
}

// Extract participant information with attack data
function extractParticipants(warData) {
    if (warData.state === 'notInWar') {
        console.log('Clan is not currently in war');
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

        // Extract attack 2 data
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
            attack2: attack2
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
        preparationStartTime: warData.preparationStartTime,
        startTime: warData.startTime,
        endTime: warData.endTime,
        participants: participants
    };

    await fs.writeFile('war-data.json', JSON.stringify(output, null, 2));
    console.log('War data saved to war-data.json');
}

// Main execution
async function main() {
    try {
        console.log('Fetching current war data...');
        const warData = await fetchCurrentWar();
        
        const participants = extractParticipants(warData);
        console.log(`Found ${participants.length} participants`);
        
        // Check war state
        if (warData.state === 'notInWar') {
            console.log('⚠️  Clan is not in war');
            console.log('ℹ️  War data not saved');
            return;
        }
        
        // Warn if war is still in progress
        if (warData.state !== 'warEnded') {
            console.log(`\n⚠️  WARNING: War is still in progress (${warData.state})`);
            console.log(`   War ends: ${new Date(warData.endTime).toLocaleString()}`);
            console.log(`\n💡 Stats may be incomplete - some players haven't attacked yet`);
            console.log(`   For accurate stats, fetch after war ends (state: warEnded)\n`);
        } else {
            console.log(`\n✅ War has ended - stats are complete!`);
        }

        await saveWarData(warData, participants);
        
        console.log('Success! Check war-data.json for results');
    } catch (error) {
        console.error('Failed to fetch war data:', error.message);
        process.exit(1);
    }
}

main();