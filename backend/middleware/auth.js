// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');  // Add this

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        // Verify token first
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // ✅ Check if user is still active in database
        const pool = getPool();
        const result = await pool.request()
            .input('userId', sql.Int, decoded.id)
            .query('SELECT IsActive FROM Users WHERE Id = @userId');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (!result.recordset[0].IsActive) {
            // User is deactivated - force logout
            return res.status(403).json({ 
                error: 'Account blocked',
                message: 'Your account has been blocked by administrator.',
                code: 'ACCOUNT_BLOCKED',
                forceLogout: true
            });
        }

        req.user = decoded;
        next();
        
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = { authenticateToken, JWT_SECRET };