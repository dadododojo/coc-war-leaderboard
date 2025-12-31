const { execSync } = require('child_process');
const fetch = require('node-fetch');
const fs = require('fs').promises;

// Configuration
const CONFIG = {
    API_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjBiNDNhNDRjLWYyNGQtNDY5OC05MzQzLWQ2ZGJhZTUxZmNjOSIsImlhdCI6MTc2NzE1MDgwNiwic3ViIjoiZGV2ZWxvcGVyLzE5OGMyYzM1LWI5ZjEtM2EyNy00MmRhLWE1ODJiNjQ3NjdlMiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjEzOC4xOTkuMzMuMjQ0IiwiMTE1LjcwLjUwLjYyIl0sInR5cGUiOiJjbGllbnQifV19.8VhqoEY3UwFhFvQqDlYGShooQM_dKYHpdJZNfuhZ4klhbp5vyqk7fCdtfVyRSlkFwGmxhDAFBOkwfG0IlcblWQ',
    CLAN_TAG: '#LYJV220Y',
    GITHUB_REPO_PATH: '.', // Current directory (your local repo)
    UPDATE_INTERVAL: 30 * 60 * 1000, // 30 minutes in milliseconds
};

// Format clan tag for URL
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
        return null;
    }
}

// Extract participant information
function extractParticipants(warData) {
    if (!warData || warData.state === 'notInWar') {
        console.log('Clan is not currently in war');
        return [];
    }

    const participants = warData.clan.members.map(member => ({
        tag: member.tag,
        name: member.name,
        townHallLevel: member.townhallLevel,
        mapPosition: member.mapPosition,
        attacks: member.attacks || []
    }));

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
    return output;
}

// Generate leaderboard from war data
async function generateLeaderboard(warData) {
    const participants = warData.clan.members.map(member => {
        const attacks = member.attacks || [];
        
        let totalStars = 0;
        let totalPercentage = 0;
        let attack1 = { stars: 0, percentage: 0 };
        let attack2 = { stars: 0, percentage: 0 };

        if (attacks.length > 0) {
            attack1 = {
                stars: attacks[0].stars,
                percentage: attacks[0].destructionPercentage
            };
            totalStars += attacks[0].stars;
            totalPercentage += attacks[0].destructionPercentage;
        }

        if (attacks.length > 1) {
            attack2 = {
                stars: attacks[1].stars,
                percentage: attacks[1].destructionPercentage
            };
            totalStars += attacks[1].stars;
            totalPercentage += attacks[1].destructionPercentage;
        }

        return {
            name: member.name,
            townHallLevel: member.townhallLevel,
            totalStars,
            totalPercentage,
            attack1,
            attack2
        };
    });

    // Sort by stars, then percentage
    participants.sort((a, b) => {
        if (b.totalStars !== a.totalStars) {
            return b.totalStars - a.totalStars;
        }
        return b.totalPercentage - a.totalPercentage;
    });

    const leaderboardData = {
        lastUpdated: new Date().toISOString(),
        players: participants
    };

    await fs.writeFile('leaderboard.json', JSON.stringify(leaderboardData, null, 2));
    console.log('Leaderboard generated and saved');
}

// Push changes to GitHub
function pushToGitHub() {
    try {
        console.log('Pushing to GitHub...');
        
        // Add all changes
        execSync('git add war-data.json leaderboard.json', { 
            cwd: CONFIG.GITHUB_REPO_PATH,
            stdio: 'inherit'
        });

        // Commit with timestamp
        const timestamp = new Date().toISOString();
        execSync(`git commit -m "Auto-update war data: ${timestamp}"`, { 
            cwd: CONFIG.GITHUB_REPO_PATH,
            stdio: 'inherit'
        });

        // Push to GitHub
        execSync('git push', { 
            cwd: CONFIG.GITHUB_REPO_PATH,
            stdio: 'inherit'
        });

        console.log('Successfully pushed to GitHub!');
    } catch (error) {
        console.error('Error pushing to GitHub:', error.message);
        console.log('Make sure you have git configured and authenticated');
    }
}

// Main update function
async function updateData() {
    console.log('\n=== Starting update cycle ===');
    console.log(new Date().toLocaleString());

    try {
        // Fetch war data
        const warData = await fetchCurrentWar();
        
        if (!warData) {
            console.log('Failed to fetch war data, skipping this cycle');
            return;
        }

        // Save war data
        const participants = extractParticipants(warData);
        await saveWarData(warData, participants);

        // Generate leaderboard
        if (warData.state !== 'notInWar') {
            await generateLeaderboard(warData);
            
            // Push to GitHub
            pushToGitHub();
        } else {
            console.log('No active war, skipping leaderboard generation');
        }

        console.log('=== Update cycle complete ===\n');
    } catch (error) {
        console.error('Error during update:', error.message);
    }
}

// Run immediately on start
console.log('Auto-update script started!');
console.log(`Will update every ${CONFIG.UPDATE_INTERVAL / 1000 / 60} minutes`);
updateData();

// Schedule regular updates
setInterval(updateData, CONFIG.UPDATE_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down auto-update script...');
    process.exit(0);
});