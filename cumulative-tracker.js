const fs = require('fs').promises;

// File paths
const LEADERBOARD_FILE = 'leaderboard.json';
const CUMULATIVE_FILE = 'cumulative-stats.json';

// Load existing cumulative stats
async function loadCumulativeStats() {
    try {
        const data = await fs.readFile(CUMULATIVE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return empty structure
        return {
            players: {},
            totalWars: 0,
            lastUpdated: null
        };
    }
}

// Load current war leaderboard
async function loadCurrentLeaderboard() {
    try {
        const data = await fs.readFile(LEADERBOARD_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading leaderboard.json:', error.message);
        return null;
    }
}

// Update cumulative stats with new war data
function updateCumulativeStats(cumulativeStats, currentWarData) {
    // Increment war count
    cumulativeStats.totalWars += 1;
    cumulativeStats.lastUpdated = new Date().toISOString();

    // Process each player from current war
    currentWarData.players.forEach(player => {
        const playerName = player.name;

        // Initialize player if doesn't exist
        if (!cumulativeStats.players[playerName]) {
            cumulativeStats.players[playerName] = {
                name: playerName,
                townHallLevel: player.townHallLevel,
                totalStars: 0,
                totalPercentage: 0,
                totalAttacks: 0,
                warsParticipated: 0,
                attackHistory: []
            };
        }

        // Update player stats
        const playerStats = cumulativeStats.players[playerName];
        playerStats.townHallLevel = player.townHallLevel; // Update TH level in case it changed
        playerStats.totalStars += player.totalStars;
        playerStats.totalPercentage += player.totalPercentage;
        playerStats.totalAttacks += 2; // Assuming 2 attacks per war
        playerStats.warsParticipated += 1;

        // Add this war's performance to history
        playerStats.attackHistory.push({
            warNumber: cumulativeStats.totalWars,
            stars: player.totalStars,
            percentage: player.totalPercentage,
            date: cumulativeStats.lastUpdated
        });
    });

    return cumulativeStats;
}

// Generate cumulative leaderboard
function generateCumulativeLeaderboard(cumulativeStats) {
    // Convert players object to array and calculate averages
    const playersArray = Object.values(cumulativeStats.players).map(player => ({
        name: player.name,
        townHallLevel: player.townHallLevel,
        totalStars: player.totalStars,
        totalPercentage: player.totalPercentage,
        warsParticipated: player.warsParticipated,
        averageStars: (player.totalStars / player.warsParticipated).toFixed(2),
        averagePercentage: (player.totalPercentage / player.warsParticipated).toFixed(1)
    }));

    // Sort by total stars, then total percentage
    playersArray.sort((a, b) => {
        if (b.totalStars !== a.totalStars) {
            return b.totalStars - a.totalStars;
        }
        return b.totalPercentage - a.totalPercentage;
    });

    return {
        lastUpdated: cumulativeStats.lastUpdated,
        totalWars: cumulativeStats.totalWars,
        players: playersArray
    };
}

// Save cumulative stats
async function saveCumulativeStats(stats) {
    await fs.writeFile(CUMULATIVE_FILE, JSON.stringify(stats, null, 2));
}

// Save cumulative leaderboard
async function saveCumulativeLeaderboard(leaderboard) {
    await fs.writeFile('leaderboard-cumulative.json', JSON.stringify(leaderboard, null, 2));
}

// Main function
async function main() {
    try {
        console.log('📊 Updating Cumulative Statistics...\n');

        // Load current war data
        const currentWarData = await loadCurrentLeaderboard();
        if (!currentWarData) {
            console.error('❌ Could not load leaderboard.json');
            console.log('Make sure you have generated a leaderboard first!');
            return;
        }

        // Load cumulative stats
        const cumulativeStats = await loadCumulativeStats();
        console.log(`📁 Loaded stats for ${Object.keys(cumulativeStats.players).length} players`);
        console.log(`📈 Total wars tracked: ${cumulativeStats.totalWars}`);

        // Update with new war data
        const updatedStats = updateCumulativeStats(cumulativeStats, currentWarData);
        
        // Save updated cumulative stats
        await saveCumulativeStats(updatedStats);
        console.log(`\n✅ Updated cumulative stats (War #${updatedStats.totalWars})`);

        // Generate and save cumulative leaderboard
        const cumulativeLeaderboard = generateCumulativeLeaderboard(updatedStats);
        await saveCumulativeLeaderboard(cumulativeLeaderboard);
        console.log('✅ Generated leaderboard-cumulative.json');

        // Show top 5 players
        console.log('\n🏆 Top 5 Players (All-Time):');
        cumulativeLeaderboard.players.slice(0, 5).forEach((player, index) => {
            console.log(`${index + 1}. ${player.name} - ${player.totalStars}⭐ (${player.warsParticipated} wars)`);
        });

        console.log('\n💡 Files created:');
        console.log('   - cumulative-stats.json (detailed stats)');
        console.log('   - leaderboard-cumulative.json (use this for your website!)');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();