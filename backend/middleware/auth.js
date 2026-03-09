// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');  // Add this

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

// backend/middleware/auth.js

const authenticateToken = async (req, res, next) => {
    // ✅ LOG EVERYTHING
    console.log('========== AUTH MIDDLEWARE ==========');
    console.log('📨 Request URL:', req.url);
    console.log('📨 Request Method:', req.method);
    console.log('📨 All Headers:', JSON.stringify(req.headers, null, 2));
    
    const authHeader = req.headers['authorization'];
    console.log('🔐 Auth Header Raw:', authHeader);
    
    const token = authHeader && authHeader.split(' ')[1];
    console.log('🔐 Token extracted:', token ? 'Yes (length: ' + token.length + ')' : 'No');

    if (!token) {
        console.log('❌ No token found - sending 401');
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        // Verify token first
        console.log('🔐 Verifying token...');
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Token verified for user:', decoded.id);
        console.log('🔐 Decoded token:', JSON.stringify(decoded, null, 2));
        
        // ✅ Check if user is still active in database
        console.log('🔐 Checking user status in DB...');
        const pool = getPool();
        const result = await pool.request()
            .input('userId', sql.Int, decoded.id)
            .query('SELECT IsActive FROM Users WHERE Id = @userId');

        console.log('🔐 DB Result:', JSON.stringify(result.recordset, null, 2));

        if (result.recordset.length === 0) {
            console.log('❌ User not found in DB');
            return res.status(401).json({ error: 'User not found' });
        }

        if (!result.recordset[0].IsActive) {
            console.log('❌ User is inactive');
            return res.status(403).json({ 
                error: 'Account blocked',
                message: 'Your account has been blocked by administrator.',
                code: 'ACCOUNT_BLOCKED',
                forceLogout: true
            });
        }

        console.log('✅ User is active, proceeding...');
        req.user = decoded;
        next();
        
    } catch (err) {
        console.log('❌ Token verification error:', err.message);
        console.log('❌ Error name:', err.name);
        console.log('❌ Full error:', err);
        
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        return res.status(500).json({ error: 'Authentication failed' });
    }
};
module.exports = { authenticateToken, JWT_SECRET };