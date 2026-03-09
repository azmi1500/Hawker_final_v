// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const { generateLicenseKey } = require('../utils/licenseGenerator');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');

// ✅ FIXED CREATE SHOP
router.post('/create-shop', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { shopName, username, password, startDate, endDate } = req.body;
        const pool = getPool();
        
        // ✅ Parse dates
        const startLocal = new Date(startDate);
        const endLocal = new Date(endDate);
        
        // ✅ Convert to UTC for database
        const startUTC = new Date(startLocal.getTime() - (startLocal.getTimezoneOffset() * 60000));
        const endUTC = new Date(endLocal.getTime() - (endLocal.getTimezoneOffset() * 60000));
        
        console.log('Original start:', startDate);
        console.log('Parsed start:', startLocal);
        console.log('Saving to DB:', startUTC);
        
        // ✅ Calculate duration months correctly
        const yearsDiff = endLocal.getFullYear() - startLocal.getFullYear();
        const monthsDiff = endLocal.getMonth() - startLocal.getMonth();
        const daysDiff = endLocal.getDate() - startLocal.getDate();
        
        let durationMonths = yearsDiff * 12 + monthsDiff;
        
        // If end day is less than start day, it's not a full month
        if (daysDiff < 0) {
            durationMonths -= 1;
        }

        // Ensure minimum 1 month if days selected
        if (durationMonths < 1 && (endLocal - startLocal) > 0) {
            durationMonths = 1;
        }

        console.log('Start:', startLocal, 'End:', endLocal, 'Months:', durationMonths);
        
        // Check if username exists
        const existing = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT Id FROM Users WHERE Username = @username');
            
        if (existing.recordset.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Start transaction
        const transaction = pool.transaction();
        await transaction.begin();
        
        try {
            // Create user
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            const userResult = await transaction.request()
                .input('username', sql.NVarChar, username)
                .input('passwordHash', sql.NVarChar, hashedPassword)
                .input('shopName', sql.NVarChar, shopName)
                .query(`
                    INSERT INTO Users (Username, PasswordHash, Role, ShopName, IsActive)
                    OUTPUT INSERTED.Id
                    VALUES (@username, @passwordHash, 'staff', @shopName, 1)
                `);
            
            const userId = userResult.recordset[0].Id;
            
            // Generate license
            const licenseKey = generateLicenseKey(shopName, durationMonths);
            
            // ✅ Save UTC times to database
            await transaction.request()
                .input('userId', sql.Int, userId)
                .input('licenseKey', sql.NVarChar, licenseKey)
                .input('shopName', sql.NVarChar, shopName)
                .input('startDate', sql.DateTime, startUTC)  // UTC time
                .input('expiryDate', sql.DateTime, endUTC)   // UTC time
                .input('durationMonths', sql.Int, durationMonths)
                .query(`
                    INSERT INTO Licenses (UserId, LicenseKey, ShopName, StartDate, ExpiryDate, DurationMonths)
                    VALUES (@userId, @licenseKey, @shopName, @startDate, @expiryDate, @durationMonths)
                `);
            
            await transaction.commit();
            
            // Return original local times for display
            res.json({
                success: true,
                shop: {
                    username,
                    shopName,
                    licenseKey,
                    startDate: startLocal,  // Return local time
                    expiryDate: endLocal,    // Return local time
                    durationMonths
                }
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});
// backend/routes/adminRoutes.js - Add these new routes

// ✅ Toggle user active status
// ✅ Toggle user active status
// ✅ Toggle user active status
// backend/routes/adminRoutes.js - Fix toggle route

// backend/routes/adminRoutes.js

router.put('/toggle-status/:userId', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { userId } = req.params;
        const { isActive } = req.body;

        console.log(`🔄 Toggle request - User: ${userId}, New Status: ${isActive}`);

        const pool = getPool();

        // First check if user exists
        const checkResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT Id, Username, IsActive FROM Users WHERE Id = @userId');

        if (checkResult.recordset.length === 0) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('📋 Before update:', checkResult.recordset[0]);

        // Update user status
        const updateResult = await pool.request()
            .input('userId', sql.Int, userId)
            .input('isActive', sql.Bit, isActive)
            .query('UPDATE Users SET IsActive = @isActive WHERE Id = @userId');

        console.log('✅ Rows affected:', updateResult.rowsAffected[0]);

        // Verify update
        const verifyResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT Id, Username, IsActive FROM Users WHERE Id = @userId');

        console.log('📋 After update:', verifyResult.recordset[0]);

        if (updateResult.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ 
            success: true, 
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            user: verifyResult.recordset[0]
        });

    } catch (err) {
        console.error('❌ Toggle error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Delete user and related data
// backend/routes/adminRoutes.js - Add this DELETE route

// ✅ Delete user and related data
// backend/routes/adminRoutes.js - Update delete route

// ✅ Delete user and related data
router.delete('/delete-user/:userId', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { userId } = req.params;
        const pool = getPool();

        // Start transaction
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            // 1. First delete from user_preferences (this was missing!)
            await transaction.request()
                .input('userId', sql.Int, userId)
                .query('DELETE FROM user_preferences WHERE user_id = @userId');

            // 2. Delete from CompanySettings
            await transaction.request()
                .input('userId', sql.Int, userId)
                .query('DELETE FROM CompanySettings WHERE UserId = @userId');

            // 3. Delete from Sales
            await transaction.request()
                .input('userId', sql.Int, userId)
                .query('DELETE FROM Sales WHERE UserId = @userId');

            // 4. Delete from DishItem
            await transaction.request()
                .input('userId', sql.Int, userId)
                .query('DELETE FROM DishItem WHERE UserId = @userId');

            // 5. Delete from DishGroup
            await transaction.request()
                .input('userId', sql.Int, userId)
                .query('DELETE FROM DishGroup WHERE UserId = @userId');

            // 6. Delete license
            await transaction.request()
                .input('userId', sql.Int, userId)
                .query('DELETE FROM Licenses WHERE UserId = @userId');

            // 7. Finally delete user
            await transaction.request()
                .input('userId', sql.Int, userId)
                .query('DELETE FROM Users WHERE Id = @userId');

            await transaction.commit();
            res.json({ success: true, message: 'User and all associated data deleted successfully' });
            
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Transaction error:', error);
            throw error;
        }
    } catch (err) {
        console.error('❌ Delete error:', err);
        res.status(500).json({ error: err.message });
    }
});
// ✅ Get all shops
// In backend/routes/adminRoutes.js - /shops route

router.get('/shops', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const pool = getPool();
        
        // Update license status based on expiry
        await pool.request()
            .query(`
                UPDATE Licenses 
                SET IsActive = CASE 
                    WHEN ExpiryDate < DATEADD(hour, 5, DATEADD(minute, 30, GETDATE())) THEN 0 
                    ELSE 1 
                END
            `);
        
        const result = await pool.request()
            .query(`
                SELECT 
                    u.Id, 
                    u.Username, 
                    u.ShopName,
                    u.IsActive as UserActive,           
                    ISNULL(l.LicenseKey, 'No License') as LicenseKey,
                    l.StartDate,
                    l.ExpiryDate,
                    l.DurationMonths,
                    l.IsActive as LicenseActive,       
                    CASE 
                        WHEN l.LicenseKey IS NULL THEN 'No License'
                        WHEN l.IsActive = 1 THEN 'Active'
                        ELSE 'Inactive'
                    END as LicenseStatus,
                    DATEDIFF(minute, GETDATE(), DATEADD(hour, -5, DATEADD(minute, -30, l.ExpiryDate))) as MinutesRemaining
                FROM Users u
                LEFT JOIN Licenses l ON u.Id = l.UserId
                WHERE u.Role = 'staff'
                ORDER BY l.ExpiryDate
            `);
        
        console.log(`✅ Found ${result.recordset.length} shops`);
        res.json(result.recordset);
        
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Renew license
// ✅ Renew license with date picker
// ✅ Renew license with correct timezone handling
router.post('/renew-license/:userId', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { userId } = req.params;
        const { startDate, endDate } = req.body;
        const pool = getPool();
        
        // ✅ Parse local dates from picker
        const startLocal = new Date(startDate);
        const endLocal = new Date(endDate);
        
        // ✅ Convert local to UTC for database
        const startUTC = new Date(startLocal.getTime() - (startLocal.getTimezoneOffset() * 60000));
        const endUTC = new Date(endLocal.getTime() - (endLocal.getTimezoneOffset() * 60000));
        
        console.log('Renew - Local Start:', startLocal.toLocaleString());
        console.log('Renew - Local End:', endLocal.toLocaleString());
        console.log('Renew - UTC Start:', startUTC.toISOString());
        console.log('Renew - UTC End:', endUTC.toISOString());
        
        // Calculate duration
        const diffTime = Math.abs(endUTC - startUTC);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const durationMonths = Math.ceil(diffDays / 30);
        
        // Generate new license key
        const newLicenseKey = generateLicenseKey('RENEW', durationMonths);
        
        // Get shop name
        const shopResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT ShopName FROM Users WHERE Id = @userId');
        
        const shopName = shopResult.recordset[0]?.ShopName || 'Shop';
        
        // ✅ Save UTC times to database
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('licenseKey', sql.NVarChar, newLicenseKey)
            .input('shopName', sql.NVarChar, shopName)
            .input('startDate', sql.DateTime, startUTC)  // UTC time
            .input('expiryDate', sql.DateTime, endUTC)   // UTC time
            .input('durationMonths', sql.Int, durationMonths)
            .query(`
                UPDATE Licenses 
                SET StartDate = @startDate,
                    ExpiryDate = @expiryDate,
                    LicenseKey = @licenseKey,
                    ShopName = @shopName,
                    DurationMonths = @durationMonths,
                    IsActive = 1
                WHERE UserId = @userId
            `);
        
        res.json({ 
            success: true, 
            message: 'License renewed',
            license: {
                key: newLicenseKey,
                startDate: startLocal,  // Return local for display
                expiryDate: endLocal,
                durationMonths
            }
        });
        
    } catch (err) {
        console.error('Renew error:', err);
        res.status(500).json({ error: err.message });
    }
});
// ✅ Get license status
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const pool = getPool();
        
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query(`
                SELECT 
                    ExpiryDate,
                    LicenseKey,
                    IsActive,
                    -- Calculate minutes remaining (IST to IST comparison)
                    DATEDIFF(minute, GETDATE(), DATEADD(hour, -5, DATEADD(minute, -30, ExpiryDate))) as MinutesRemaining
                FROM Licenses
                WHERE UserId = @userId
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'No license found' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('License status error:', err);
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;