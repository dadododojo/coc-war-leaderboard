const fs = require('fs').promises;
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Load current leaderboard
async function loadLeaderboard() {
    try {
        const data = await fs.readFile('leaderboard.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Could not load leaderboard.json');
        console.error('Make sure the file exists!');
        return null;
    }
}

// Save updated leaderboard
async function saveLeaderboard(data) {
    await fs.writeFile('leaderboard.json', JSON.stringify(data, null, 2));
}

// Display players with numbers
function displayPlayers(players) {
    console.log('\n📋 CURRENT WAR PLAYERS:\n');
    players.forEach((player, index) => {
        const num = index + 1;
        const a1 = `${player.attack1.stars}⭐ ${player.attack1.percentage}%`;
        const a2 = `${player.attack2.stars}⭐ ${player.attack2.percentage}%`;
        const loot1 = player.attack1.isLoot ? ' 🪙' : '';
        const loot2 = player.attack2.isLoot ? ' 🪙' : '';
        
        console.log(`${num}. ${player.name} (${player.tag})`);
        console.log(`   Attack 1: ${a1}${loot1}`);
        console.log(`   Attack 2: ${a2}${loot2}`);
        console.log('');
    });
}

// Recalculate player stats
function recalculateStats(player) {
    // Calculate totals (excluding loot attacks)
    const countedStars1 = player.attack1.isLoot ? 0 : player.attack1.stars;
    const countedPercent1 = player.attack1.isLoot ? 0 : player.attack1.percentage;
    const countedStars2 = player.attack2.isLoot ? 0 : player.attack2.stars;
    const countedPercent2 = player.attack2.isLoot ? 0 : player.attack2.percentage;

    player.totalStars = countedStars1 + countedStars2;
    player.totalPercentage = countedPercent1 + countedPercent2;

    // Recalculate missed attacks (excluding loot)
    const missedAttack1 = !player.attack1.isLoot && player.attack1.stars === 0 && player.attack1.percentage === 0;
    const missedAttack2 = !player.attack2.isLoot && player.attack2.stars === 0 && player.attack2.percentage === 0;
    player.missedAttacks = (missedAttack1 ? 1 : 0) + (missedAttack2 ? 1 : 0);
}

// Mark attacks as loot
async function markLootAttacks(leaderboard) {
    displayPlayers(leaderboard.players);

    console.log('═══════════════════════════════════════');
    console.log('🪙 MARK LOOT ATTACKS');
    console.log('═══════════════════════════════════════\n');
    console.log('Enter player numbers and attacks to mark as loot.');
    console.log('Examples:');
    console.log('  "5 1" = Player 5, Attack 1');
    console.log('  "5 2" = Player 5, Attack 2');
    console.log('  "5 both" = Player 5, Both attacks');
    console.log('  "done" = Finish and save\n');

    let modified = false;

    while (true) {
        const input = await question('Mark loot attack (or "done"): ');
        
        if (input.toLowerCase() === 'done') {
            break;
        }

        const parts = input.trim().split(/\s+/);
        if (parts.length !== 2) {
            console.log('❌ Invalid format. Use: <player_number> <attack_number|both>');
            continue;
        }

        const playerNum = parseInt(parts[0]);
        const attackSpec = parts[1].toLowerCase();

        if (isNaN(playerNum) || playerNum < 1 || playerNum > leaderboard.players.length) {
            console.log(`❌ Invalid player number. Must be 1-${leaderboard.players.length}`);
            continue;
        }

        const player = leaderboard.players[playerNum - 1];

        if (attackSpec === '1') {
            player.attack1.isLoot = true;
            console.log(`✅ Marked ${player.name} - Attack 1 as loot`);
            modified = true;
        } else if (attackSpec === '2') {
            player.attack2.isLoot = true;
            console.log(`✅ Marked ${player.name} - Attack 2 as loot`);
            modified = true;
        } else if (attackSpec === 'both') {
            player.attack1.isLoot = true;
            player.attack2.isLoot = true;
            console.log(`✅ Marked ${player.name} - BOTH attacks as loot`);
            modified = true;
        } else {
            console.log('❌ Invalid attack. Use: 1, 2, or both');
            continue;
        }

        // Recalculate stats
        recalculateStats(player);
    }

    return modified;
}

// Re-sort players by stats
function resortPlayers(players) {
    players.sort((a, b) => {
        if (b.totalStars !== a.totalStars) {
            return b.totalStars - a.totalStars;
        }
        if (b.totalPercentage !== a.totalPercentage) {
            return b.totalPercentage - a.totalPercentage;
        }
        return a.missedAttacks - b.missedAttacks;
    });
}

// Update cumulative stats
async function updateCumulative() {
    try {
        console.log('\n📊 Updating cumulative statistics...');
        execSync('node cumulative-tracker.js', { stdio: 'inherit' });
        console.log('✅ Cumulative stats updated');
    } catch (error) {
        console.error('❌ Error updating cumulative:', error.message);
    }
}

// Push to GitHub
async function pushToGitHub() {
    try {
        console.log('\n🚀 Pushing to GitHub...');
        execSync('git add leaderboard.json leaderboard-cumulative.json cumulative-stats.json', { 
            stdio: 'inherit' 
        });
        
        const timestamp = new Date().toLocaleString();
        execSync(`git commit -m "Override: Mark loot attacks - ${timestamp}"`, { 
            stdio: 'inherit' 
        });
        
        execSync('git push', { stdio: 'inherit' });
        
        console.log('✅ Successfully pushed to GitHub!');
        console.log('🌐 Your site will update in 1-2 minutes\n');
    } catch (error) {
        if (error.message.includes('nothing to commit')) {
            console.log('ℹ️  No changes to push\n');
        } else {
            console.error('❌ Error pushing:', error.message);
        }
    }
}

// Main function
async function main() {
    console.log('═══════════════════════════════════════');
    console.log('🪙 LOOT ATTACK OVERRIDE TOOL');
    console.log('═══════════════════════════════════════\n');

    // Load leaderboard
    const leaderboard = await loadLeaderboard();
    if (!leaderboard) {
        rl.close();
        return;
    }

    console.log(`📅 Leaderboard Date: ${new Date(leaderboard.lastUpdated).toLocaleString()}`);
    console.log(`👥 Players: ${leaderboard.players.length}`);

    // Mark loot attacks
    const modified = await markLootAttacks(leaderboard);

    if (!modified) {
        console.log('\nℹ️  No changes made. Exiting.');
        rl.close();
        return;
    }

    // Update timestamp
    leaderboard.lastUpdated = new Date().toISOString();

    // Re-sort players
    console.log('\n🔄 Re-sorting leaderboard...');
    resortPlayers(leaderboard.players);

    // Save updated leaderboard
    console.log('💾 Saving updated leaderboard...');
    await saveLeaderboard(leaderboard);
    console.log('✅ Leaderboard saved');

    // Ask if user wants to update cumulative and push
    const updateCum = await question('\nUpdate cumulative stats? (y/n): ');
    if (updateCum.toLowerCase() === 'y') {
        await updateCumulative();
        
        const pushGit = await question('\nPush to GitHub? (y/n): ');
        if (pushGit.toLowerCase() === 'y') {
            await pushToGitHub();
        }
    }

    console.log('\n🎉 Done! Loot attacks marked successfully.\n');
    rl.close();
}

main().catch(error => {
    console.error('❌ Error:', error);
    rl.close();
});