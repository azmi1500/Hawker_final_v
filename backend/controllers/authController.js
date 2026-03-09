// backend/controllers/authController.js
const { getPool, sql } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

// Register new user
const register = async (req, res) => {
    try {
        const { username, password, role, fullName, email } = req.body;

        // Check if user exists
        const pool = getPool();
        const existingUser = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT Id FROM Users WHERE Username = @username');

        if (existingUser.recordset.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('passwordHash', sql.NVarChar, hashedPassword)
            .input('role', sql.NVarChar, role || 'staff')
            .input('fullName', sql.NVarChar, fullName || username)
            .input('email', sql.NVarChar, email || '')
            .query(`
                INSERT INTO Users (Username, PasswordHash, Role, FullName, Email)
                OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.Role, INSERTED.FullName, INSERTED.Email
                VALUES (@username, @passwordHash, @role, @fullName, @email)
            `);

        const newUser = result.recordset[0];
        
        // Create token
        const token = jwt.sign(
            { id: newUser.Id, username: newUser.Username, role: newUser.Role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser.Id,
                username: newUser.Username,
                role: newUser.Role,
                fullName: newUser.FullName,
                email: newUser.Email
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const pool = getPool();
        
        // ✅ First, update expired licenses
        await pool.request()
            .query('UPDATE Licenses SET IsActive = 0 WHERE ExpiryDate < GETDATE()');
        
        // ✅ Get user WITH license info
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query(`
                SELECT u.Id, u.Username, u.PasswordHash, u.Role, u.FullName, u.Email, u.IsActive,
                       l.ExpiryDate, l.LicenseKey, l.IsActive as LicenseActive
                FROM Users u
                LEFT JOIN Licenses l ON u.Id = l.UserId
                WHERE u.Username = @username
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = result.recordset[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // ✅ Check if user is active
        if (!user.IsActive) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // ✅ Check if license expired
        if (user.ExpiryDate && new Date(user.ExpiryDate) < new Date()) {
            return res.status(401).json({ 
                error: 'Invalid username or password'  // Same message
            });
        }

        // Update last login
        await pool.request()
            .input('userId', sql.Int, user.Id)
            .query('UPDATE Users SET LastLoginDate = GETDATE() WHERE Id = @userId');

        // Create token
        const token = jwt.sign(
            { 
                id: user.Id, 
                username: user.Username, 
                role: user.Role 
            },
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
                fullName: user.FullName,
                email: user.Email
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = getPool();

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT Id, Username, Role, FullName, Email, CreatedDate, LastLoginDate
                FROM Users 
                WHERE Id = @userId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ error: 'Failed to get profile' });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        const pool = getPool();

        // Get current password hash
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT PasswordHash FROM Users WHERE Id = @userId');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.recordset[0];

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.PasswordHash);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('passwordHash', sql.NVarChar, hashedPassword)
            .query('UPDATE Users SET PasswordHash = @passwordHash WHERE Id = @userId');

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    changePassword
};