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

        const { 
            shopName, 
            ownerUsername,     
            ownerPassword,     
            staffUsername,     
            staffPassword,     
            startDate, 
            endDate 
        } = req.body;
        
        const pool = getPool();
        
        // ✅ CHECK BOTH USERNAMES FIRST!
        const existingOwner = await pool.request()
            .input('username', sql.NVarChar, ownerUsername)
            .query('SELECT Id FROM Users WHERE Username = @username');
            
        const existingStaff = await pool.request()
            .input('username', sql.NVarChar, staffUsername)
            .query('SELECT Id FROM Users WHERE Username = @username');
        
        // Check if owner username exists
        if (existingOwner.recordset.length > 0) {
            return res.status(400).json({ 
                error: `Owner username '${ownerUsername}' already exists! Please choose another.` 
            });
        }
        
        // Check if staff username exists
        if (existingStaff.recordset.length > 0) {
            return res.status(400).json({ 
                error: `Staff username '${staffUsername}' already exists! Please choose another.` 
            });
        }
        
        // ✅ Also check if owner and staff are same (can't be same)
        if (ownerUsername === staffUsername) {
            return res.status(400).json({ 
                error: 'Owner and Staff usernames must be different!' 
            });
        }
        
        // Parse dates
        const startLocal = new Date(startDate);
        const endLocal = new Date(endDate);
        
        const startUTC = new Date(startLocal.getTime() - (startLocal.getTimezoneOffset() * 60000));
        const endUTC = new Date(endLocal.getTime() - (endLocal.getTimezoneOffset() * 60000));
        
        // Calculate duration
        const yearsDiff = endLocal.getFullYear() - startLocal.getFullYear();
        const monthsDiff = endLocal.getMonth() - startLocal.getMonth();
        const daysDiff = endLocal.getDate() - startLocal.getDate();
        
        let durationMonths = yearsDiff * 12 + monthsDiff;
        if (daysDiff < 0) durationMonths -= 1;
        if (durationMonths < 1 && (endLocal - startLocal) > 0) durationMonths = 1;
        
        // Start transaction
        const transaction = pool.transaction();
        await transaction.begin();
        
        try {
            // Create owner
            const salt = await bcrypt.genSalt(10);
            const ownerHashedPassword = await bcrypt.hash(ownerPassword, salt);
            
            const ownerResult = await transaction.request()
                .input('username', sql.NVarChar, ownerUsername)
                .input('passwordHash', sql.NVarChar, ownerHashedPassword)
                .input('shopName', sql.NVarChar, shopName)
                .input('role', sql.NVarChar, 'owner')
                .query(`
                    INSERT INTO Users (Username, PasswordHash, Role, ShopName, IsActive)
                    OUTPUT INSERTED.Id
                    VALUES (@username, @passwordHash, @role, @shopName, 1)
                `);
            
            const ownerId = ownerResult.recordset[0].Id;
            
            // Create staff
            const staffHashedPassword = await bcrypt.hash(staffPassword, salt);
            
            const staffResult = await transaction.request()
                .input('username', sql.NVarChar, staffUsername)
                .input('passwordHash', sql.NVarChar, staffHashedPassword)
                .input('shopName', sql.NVarChar, shopName)
                .input('role', sql.NVarChar, 'staff')
                .input('ownerId', sql.Int, ownerId)
                .query(`
                    INSERT INTO Users (Username, PasswordHash, Role, ShopName, OwnerId, IsActive)
                    OUTPUT INSERTED.Id
                    VALUES (@username, @passwordHash, @role, @shopName, @ownerId, 1)
                `);
            
            const staffId = staffResult.recordset[0].Id;
            
            // Generate license for owner
            const licenseKey = generateLicenseKey(shopName, durationMonths);
            
            await transaction.request()
                .input('userId', sql.Int, ownerId)
                .input('licenseKey', sql.NVarChar, licenseKey)
                .input('shopName', sql.NVarChar, shopName)
                .input('startDate', sql.DateTime, startUTC)
                .input('expiryDate', sql.DateTime, endUTC)
                .input('durationMonths', sql.Int, durationMonths)
                .query(`
                    INSERT INTO Licenses (UserId, LicenseKey, ShopName, StartDate, ExpiryDate, DurationMonths)
                    VALUES (@userId, @licenseKey, @shopName, @startDate, @expiryDate, @durationMonths)
                `);
            
            await transaction.commit();
            
            res.json({
                success: true,
                shop: {
                    owner: { username: ownerUsername, id: ownerId },
                    staff: { username: staffUsername, id: staffId },
                    shopName,
                    licenseKey,
                    startDate: startLocal,
                    expiryDate: endLocal,
                    durationMonths
                }
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (err) {
        console.error('❌ Error:', err);
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
        
        const result = await pool.request()
            .query(`
                SELECT 
                    u.Id, 
                    u.Username, 
                    u.ShopName,
                    u.Role,
                    u.IsActive as UserActive,
                    u.OwnerId,
                    
                    -- License Key
                    CASE 
                        WHEN u.Role = 'staff' THEN 
                            (SELECT LicenseKey FROM Licenses WHERE UserId = u.OwnerId)
                        ELSE l.LicenseKey
                    END as LicenseKey,
                    
                    -- ✅ ADDED: Start Date
                    CASE 
                        WHEN u.Role = 'staff' THEN 
                            (SELECT StartDate FROM Licenses WHERE UserId = u.OwnerId)
                        ELSE l.StartDate
                    END as StartDate,
                    
                    -- Expiry Date
                    CASE 
                        WHEN u.Role = 'staff' THEN 
                            (SELECT ExpiryDate FROM Licenses WHERE UserId = u.OwnerId)
                        ELSE l.ExpiryDate
                    END as ExpiryDate,
                    
                    -- License Active status
                    CASE 
                        WHEN u.Role = 'staff' THEN 
                            (SELECT IsActive FROM Licenses WHERE UserId = u.OwnerId)
                        ELSE l.IsActive
                    END as LicenseActive
                    
                FROM Users u
                LEFT JOIN Licenses l ON u.Id = l.UserId
                WHERE u.Role IN ('owner', 'staff')
                ORDER BY u.ShopName, u.Role
            `);
        
        console.log(`✅ Found ${result.recordset.length} users`);
        console.log('Sample with StartDate:', result.recordset[0]); // Debug
        
        res.json(result.recordset);
        
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ error: err.message });
    }
});

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
        const userId = req.user.id;
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    CASE 
                        WHEN u.Role = 'staff' THEN 
                            (SELECT LicenseKey FROM Licenses WHERE UserId = u.OwnerId)
                        ELSE l.LicenseKey
                    END as LicenseKey,
                    
                    CASE 
                        WHEN u.Role = 'staff' THEN 
                            (SELECT ExpiryDate FROM Licenses WHERE UserId = u.OwnerId)
                        ELSE l.ExpiryDate
                    END as ExpiryDate,
                    
                    -- ✅ FIX: Convert IST stored in DB to UTC for comparison
                    CASE 
                        WHEN u.Role = 'staff' THEN 
                            DATEDIFF(minute, GETUTCDATE(), 
                                DATEADD(hour, -5, DATEADD(minute, -30, 
                                    (SELECT ExpiryDate FROM Licenses WHERE UserId = u.OwnerId)
                                ))
                            )
                        ELSE DATEDIFF(minute, GETUTCDATE(), 
                                DATEADD(hour, -5, DATEADD(minute, -30, l.ExpiryDate))
                            )
                    END as MinutesRemaining,
                    
                    CASE 
                        WHEN u.Role = 'staff' THEN 
                            (SELECT IsActive FROM Licenses WHERE UserId = u.OwnerId)
                        ELSE l.IsActive
                    END as IsActive,
                    
                    u.ShopName
                    
                FROM Users u
                LEFT JOIN Licenses l ON u.Id = l.UserId
                WHERE u.Id = @userId
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`✅ License status for user ${userId}:`, {
            minutesLeft: result.recordset[0].MinutesRemaining,
            expiryDate: result.recordset[0].ExpiryDate,
            isActive: result.recordset[0].IsActive,
            role: req.user.role
        });
        
        res.json(result.recordset[0]);
        
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;