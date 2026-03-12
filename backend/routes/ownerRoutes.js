const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// ✅ OWNER DASHBOARD - Get owner's own shop details
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Owner access required' });
        }

        const pool = getPool();
        
        // Get owner's details with license
        const ownerResult = await pool.request()
            .input('ownerId', sql.Int, req.user.id)
            .query(`
                SELECT 
                    u.Id, 
                    u.Username, 
                    u.ShopName,
                    u.Role,
                    u.IsActive,
                    l.LicenseKey,
                    l.StartDate,
                    l.ExpiryDate,
                    l.IsActive as LicenseActive
                FROM Users u
                LEFT JOIN Licenses l ON u.Id = l.UserId
                WHERE u.Id = @ownerId
            `);
        
        // Get all staff under this owner
        const staffResult = await pool.request()
            .input('ownerId', sql.Int, req.user.id)
            .query(`
                SELECT 
                    Id, 
                    Username, 
                    FullName,
                    IsActive,
                    CreatedDate,
                    LastLoginDate
                FROM Users 
                WHERE OwnerId = @ownerId
                ORDER BY Username
            `);
        
        res.json({
            success: true,
            owner: ownerResult.recordset[0],
            staff: staffResult.recordset,
            totalStaff: staffResult.recordset.length
        });
        
    } catch (err) {
        console.error('❌ Owner dashboard error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Get owner's license details
router.get('/license', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Owner access required' });
        }

        const pool = getPool();
        
        const result = await pool.request()
            .input('ownerId', sql.Int, req.user.id)
            .query(`
                SELECT 
                    LicenseKey,
                    StartDate,
                    ExpiryDate,
                    IsActive,
                    DATEDIFF(day, GETDATE(), ExpiryDate) as DaysRemaining
                FROM Licenses 
                WHERE UserId = @ownerId
            `);
        
        res.json(result.recordset[0] || { error: 'No license found' });
        
    } catch (err) {
        console.error('❌ License error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Create new staff (owner only)
router.post('/staff', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Owner access required' });
        }

        const { username, password, fullName } = req.body;
        const pool = getPool();
        
        // Check if username exists
        const existing = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT Id FROM Users WHERE Username = @username');
        
        if (existing.recordset.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Get owner's shop name
        const ownerResult = await pool.request()
            .input('ownerId', sql.Int, req.user.id)
            .query('SELECT ShopName FROM Users WHERE Id = @ownerId');
        
        const shopName = ownerResult.recordset[0]?.ShopName || 'Shop';
        
        // Create staff
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('passwordHash', sql.NVarChar, hashedPassword)
            .input('shopName', sql.NVarChar, shopName)
            .input('role', sql.NVarChar, 'staff')
            .input('ownerId', sql.Int, req.user.id)
            .input('fullName', sql.NVarChar, fullName || username)
            .query(`
                INSERT INTO Users (Username, PasswordHash, Role, ShopName, OwnerId, FullName, IsActive)
                OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.FullName
                VALUES (@username, @passwordHash, @role, @shopName, @ownerId, @fullName, 1)
            `);
        
        res.status(201).json({
            success: true,
            staff: result.recordset[0]
        });
        
    } catch (err) {
        console.error('❌ Create staff error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Toggle staff status (owner only)
router.put('/staff/:staffId/toggle', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Owner access required' });
        }

        const { staffId } = req.params;
        const { isActive } = req.body;
        const pool = getPool();
        
        // Verify staff belongs to this owner
        const checkResult = await pool.request()
            .input('staffId', sql.Int, staffId)
            .input('ownerId', sql.Int, req.user.id)
            .query('SELECT Id FROM Users WHERE Id = @staffId AND OwnerId = @ownerId');
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Staff not found' });
        }
        
        await pool.request()
            .input('staffId', sql.Int, staffId)
            .input('isActive', sql.Bit, isActive)
            .query('UPDATE Users SET IsActive = @isActive WHERE Id = @staffId');
        
        res.json({ success: true });
        
    } catch (err) {
        console.error('❌ Toggle error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;