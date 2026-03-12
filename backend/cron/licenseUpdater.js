// backend/cron/licenseUpdater.js
const cron = require('node-cron');
const { getPool } = require('../config/db');

const startLicenseUpdater = () => {
    console.log('⏰ Starting license auto-updater...');
    
    // ✅ Run once per day at 6:00 AM Singapore time
    // Cron expression: 0 6 * * *  (minute 0, hour 6, every day)
    // Node-cron uses server local time, so we need to calculate Singapore time
    cron.schedule('* * * * *', async () => {
        // Get current time in Singapore (UTC+8)
        const now = new Date();
        const singaporeHour = (now.getUTCHours() + 8) % 24;
        const singaporeMinute = now.getUTCMinutes();
        
        // Check if it's 6:00 AM Singapore time (with 1 minute window)
        if (singaporeHour === 6 && singaporeMinute === 0) {
            console.log(`🔄 Daily license check at Singapore 6:00 AM - ${new Date().toLocaleString()}`);
            
            try {
                const pool = getPool();
                
                // Update expired licenses
                const result = await pool.request()
                    .query(`
                        UPDATE Licenses 
                        SET IsActive = CASE 
                            -- Convert GETDATE() (UTC) to IST by adding 5:30 hours
                            WHEN ExpiryDate < DATEADD(hour, 5, DATEADD(minute, 30, GETDATE())) THEN 0 
                            ELSE 1 
                        END;
                        
                        SELECT @@ROWCOUNT as UpdatedCount;
                    `);
                
                const count = result.recordset[0].UpdatedCount;
                
                if (count > 0) {
                    console.log(`✅ Updated ${count} expired licenses at Singapore 6:00 AM`);
                    
                    // Log expired ones
                    const expired = await pool.request()
                        .query(`
                            SELECT ShopName, ExpiryDate 
                            FROM Licenses 
                            WHERE IsActive = 0
                        `);
                    
                    if (expired.recordset.length > 0) {
                        console.log('📋 Expired shops:', expired.recordset.map(s => 
                            `${s.ShopName} (${new Date(s.ExpiryDate).toLocaleString()})`
                        ).join(', '));
                    }
                } else {
                    console.log('✅ No expired licenses today');
                }
                
            } catch (err) {
                console.error('❌ Error:', err.message);
            }
        }
    });
    
    console.log('✅ License auto-updater running DAILY at 6:00 AM Singapore time');
};

module.exports = startLicenseUpdater;