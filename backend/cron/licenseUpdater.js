// backend/cron/licenseUpdater.js
const cron = require('node-cron');
const { getPool } = require('../config/db');

const startLicenseUpdater = () => {
    console.log('⏰ Starting license auto-updater...');
    
    // Run every minute
    cron.schedule('* * * * *', async () => {
        console.log(`🔄 License check at ${new Date().toLocaleString()}`);
        
        try {
            const pool = getPool();
            
            // ✅ DIRECT COMPARISON - No timezone conversion needed
            // Database already has IST, GETDATE() returns server time (UTC)
            // So we need to convert GETDATE() to IST for comparison
            
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
                console.log(`✅ Updated ${count} licenses at ${new Date().toLocaleString()}`);
                
                // Log expired ones
                const expired = await pool.request()
                    .query(`
                        SELECT ShopName, ExpiryDate 
                        FROM Licenses 
                        WHERE IsActive = 0
                    `);
                
                if (expired.recordset.length > 0) {
                    console.log('📋 Inactive shops:', expired.recordset.map(s => 
                        `${s.ShopName} (${new Date(s.ExpiryDate).toLocaleString()})`
                    ).join(', '));
                }
            }
            
        } catch (err) {
            console.error('❌ Error:', err.message);
        }
    });
    
    console.log('✅ License auto-updater running EVERY MINUTE (IST)');
};

module.exports = startLicenseUpdater;