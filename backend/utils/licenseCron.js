const cron = require('node-cron');
const { getPool } = require('../config/db');

const startLicenseChecker = () => {
    // Run every minute (for testing)
    cron.schedule('* * * * *', async () => {
        try {
            const pool = getPool();
            
            // Update expired licenses
            const result = await pool.request()
                .query(`
                    UPDATE Licenses 
                    SET IsActive = 0 
                    WHERE ExpiryDate < GETDATE() AND IsActive = 1;
                    
                    SELECT @@ROWCOUNT as count;
                `);
            
            const count = result.recordset[0].count;
            if (count > 0) {
                console.log(`✅ ${count} licenses auto-expired at ${new Date().toLocaleString()}`);
            }
        } catch (err) {
           
        }
    });
    
    console.log('⏰ License checker started (every minute)');
     cron.schedule('0 * * * *', async () => {
        console.log('Hourly license check...');
    });
};

module.exports = startLicenseChecker;