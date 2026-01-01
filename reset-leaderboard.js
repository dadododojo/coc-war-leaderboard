const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('⚠️  RESET LEADERBOARD DATA');
console.log('====================================');
console.log('This will DELETE all historical data:');
console.log('  - cumulative-stats.json');
console.log('  - leaderboard-cumulative.json');
console.log('  - last-processed-war.txt');
console.log('');
console.log('⚠️  This action CANNOT be undone!');
console.log('====================================\n');

rl.question('Are you sure you want to reset? Type "YES" to confirm: ', (answer) => {
    if (answer === 'YES') {
        let deleted = 0;

        // Delete cumulative stats
        try {
            if (fs.existsSync('cumulative-stats.json')) {
                fs.unlinkSync('cumulative-stats.json');
                console.log('✅ Deleted cumulative-stats.json');
                deleted++;
            }
        } catch (err) {
            console.error('❌ Error deleting cumulative-stats.json:', err.message);
        }

        // Delete cumulative leaderboard
        try {
            if (fs.existsSync('leaderboard-cumulative.json')) {
                fs.unlinkSync('leaderboard-cumulative.json');
                console.log('✅ Deleted leaderboard-cumulative.json');
                deleted++;
            }
        } catch (err) {
            console.error('❌ Error deleting leaderboard-cumulative.json:', err.message);
        }

        // Delete last processed war tracker
        try {
            if (fs.existsSync('last-processed-war.txt')) {
                fs.unlinkSync('last-processed-war.txt');
                console.log('✅ Deleted last-processed-war.txt');
                deleted++;
            }
        } catch (err) {
            console.error('❌ Error deleting last-processed-war.txt:', err.message);
        }

        console.log(`\n🎉 Reset complete! Deleted ${deleted} file(s).`);
        console.log('💡 Next time you generate a leaderboard, it will start fresh!');
    } else {
        console.log('\n❌ Reset cancelled. No files were deleted.');
    }

    rl.close();
});