// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');  // ✅ ADD THIS LINE

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Auth router is working!' });
});

// ✅ Check user status route
router.get('/check-status', authenticateToken, async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query('SELECT IsActive FROM Users WHERE Id = @userId');

        if (result.recordset.length === 0 || !result.recordset[0].IsActive) {
            return res.status(403).json({
                error: 'Account blocked',
                message: 'Your account has been blocked by administrator.',
                code: 'ACCOUNT_BLOCKED',
                forceLogout: true
            });
        }

        res.json({ status: 'active' });
    } catch (err) {
        console.error('❌ Status check error:', err);
        res.status(500).json({ error: 'Status check failed' });
    }
});

// REAL LOGIN ROUTE
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const pool = getPool();
        
        // First, update expired licenses
        await pool.request()
            .query('UPDATE Licenses SET IsActive = 0 WHERE ExpiryDate < GETDATE()');
        
        // Get user with license
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query(`
                SELECT u.Id, u.Username, u.PasswordHash, u.Role, u.ShopName, u.FullName, u.Email,
                       u.IsActive as UserActive,  
                       l.ExpiryDate, l.IsActive as LicenseActive,
                       DATEDIFF(minute, GETDATE(), l.ExpiryDate) as MinutesRemaining
                FROM Users u
                LEFT JOIN Licenses l ON u.Id = l.UserId
                WHERE u.Username = @username
            `);

        // Case 1: User not found
        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.recordset[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Case 2: User deactivated by admin
        if (!user.UserActive) {
            return res.status(403).json({
                error: 'Account blocked',
                message: 'Your account has been blocked by administrator. Please contact your admin.',
                code: 'ACCOUNT_BLOCKED'
            });
        }

        // Case 3: License expired
        if (user.ExpiryDate && new Date(user.ExpiryDate) < new Date()) {
            return res.status(403).json({
                error: 'License expired',
                message: 'Your license has expired. Please contact your administrator.',
                code: 'LICENSE_EXPIRED'
            });
        }

        // Case 4: Login successful
        await pool.request()
            .input('userId', sql.Int, user.Id)
            .query('UPDATE Users SET LastLoginDate = GETDATE() WHERE Id = @userId');

        const token = jwt.sign(
            { id: user.Id, username: user.Username, role: user.Role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('✅ Login successful for:', user.Username);

        res.json({
            token,
            user: {
                id: user.Id,
                username: user.Username,
                role: user.Role,
                shopName: user.ShopName
            },
            license: {
                expiryDate: user.ExpiryDate,
                minutesRemaining: user.MinutesRemaining
            }
        });
        
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;