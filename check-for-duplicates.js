const fs = require('fs').promises;

async function checkForDuplicates() {
    console.log('🔍 Checking for Duplicate Wars\n');
    console.log('═══════════════════════════════════════\n');

    try {
        // Load cumulative stats
        const data = await fs.readFile('cumulative-stats.json', 'utf8');
        const stats = JSON.parse(data);

        console.log(`📊 Total Wars Recorded: ${stats.totalWars}`);
        console.log(`📅 Last War Hash: ${stats.lastWarHash}`);
        if (stats.lastWarHash) {
            console.log(`   (${new Date(stats.lastWarHash).toLocaleString()})\n`);
        } else {
            console.log('   (No hash recorded - old version)\n');
        }

        // Check current leaderboard
        try {
            const leaderboardData = await fs.readFile('leaderboard.json', 'utf8');
            const leaderboard = JSON.parse(leaderboardData);
            
            console.log('📄 Current Leaderboard:');
            console.log(`   Timestamp: ${leaderboard.lastUpdated}`);
            console.log(`   (${new Date(leaderboard.lastUpdated).toLocaleString()})`);
            
            if (stats.lastWarHash === leaderboard.lastUpdated) {
                console.log('\n✅ GOOD: This leaderboard has already been processed');
                console.log('   Running cumulative-tracker.js again will be SKIPPED');
            } else {
                console.log('\n⚠️  NEW WAR: This leaderboard has NOT been processed yet');
                console.log('   Running cumulative-tracker.js will ADD this war');
            }
        } catch (error) {
            console.log('\n❌ No current leaderboard.json found');
        }

        // Analyze players for duplicate detection
        console.log('\n\n👥 Player Analysis:\n');
        const players = Object.values(stats.players);
        
        if (players.length === 0) {
            console.log('No players found in cumulative stats.');
            return;
        }

        // Check first 3 players in detail
        players.slice(0, 3).forEach((player, index) => {
            console.log(`Player ${index + 1}: ${player.name} (${player.tag})`);
            console.log('─────────────────────────────────────');
            console.log(`Wars Participated: ${player.warsParticipated}`);
            console.log(`Total Stars: ${player.totalStars}`);
            console.log(`Total Attacks: ${player.warsParticipated * 2}`);
            
            // Expected vs actual
            const expectedAttacks = player.warsParticipated * 2;
            const averageStarsPerWar = player.totalStars / player.warsParticipated;
            
            console.log(`\nAverage per war: ${averageStarsPerWar.toFixed(2)} stars`);
            
            if (averageStarsPerWar > 6) {
                console.log('⚠️  WARNING: Average > 6 stars/war suggests duplicates!');
            } else {
                console.log('✅ Average looks normal (≤6 stars/war)');
            }
            
            // Show attack history
            if (player.attackHistory && player.attackHistory.length > 0) {
                console.log(`\nAttack History (${player.attackHistory.length} wars):`);
                player.attackHistory.forEach((war, warIndex) => {
                    console.log(`  War ${war.warNumber}: ${war.stars}⭐ ${war.percentage}% (${new Date(war.date).toLocaleDateString()})`);
                });
                
                // Check for duplicate dates
                const dates = player.attackHistory.map(w => new Date(w.date).toDateString());
                const uniqueDates = new Set(dates);
                
                if (dates.length !== uniqueDates.size) {
                    console.log('\n⚠️  WARNING: Duplicate dates detected!');
                    console.log('   Same war may have been counted multiple times');
                    
                    // Find duplicates
                    const dateCounts = {};
                    dates.forEach(date => {
                        dateCounts[date] = (dateCounts[date] || 0) + 1;
                    });
                    
                    Object.entries(dateCounts).forEach(([date, count]) => {
                        if (count > 1) {
                            console.log(`   - ${date}: counted ${count} times`);
                        }
                    });
                } else {
                    console.log('\n✅ All war dates are unique');
                }
            }
            
            console.log('\n');
        });

        // Summary
        console.log('═══════════════════════════════════════');
        console.log('SUMMARY:\n');
        
        const avgWarsPerPlayer = players.reduce((sum, p) => sum + p.warsParticipated, 0) / players.length;
        console.log(`Average wars per player: ${avgWarsPerPlayer.toFixed(1)}`);
        console.log(`Total wars recorded: ${stats.totalWars}`);
        
        if (avgWarsPerPlayer > stats.totalWars * 1.1) {
            console.log('\n⚠️  DUPLICATE DETECTED!');
            console.log('   Average wars per player is higher than total wars');
            console.log('   This suggests wars were counted multiple times\n');
            console.log('RECOMMENDED ACTION:');
            console.log('1. Stop fully-automated.js (Ctrl+C)');
            console.log('2. Run: node reset-leaderboard.js');
            console.log('3. Type: YES');
            console.log('4. Start fresh with current war');
        } else {
            console.log('\n✅ No obvious duplicates detected');
        }
        
        console.log('\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\nMake sure cumulative-stats.json exists.');
        console.log('Run: node cumulative-tracker.js\n');
    }
}

checkForDuplicates();