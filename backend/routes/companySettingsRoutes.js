// backend/routes/companySettingsRoutes.js - UPDATED with Currency

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET company settings for a user
router.get('/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const loggedInUserId = req.user.id;
        
        // Security check
        if (parseInt(userId) !== loggedInUserId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const pool = getPool();
        
        // Also get shop name from Users table (readonly)
        const userResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT ShopName 
                FROM Users 
                WHERE Id = @userId
            `);
        
        const shopName = userResult.recordset[0]?.ShopName || '';
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    CompanyName,
                    Address,
                    GSTNo,
                    GSTPercentage,
                    Phone,
                    Email,
                    CashierName,
                    Currency,
                    CurrencySymbol
                FROM CompanySettings 
                WHERE UserId = @userId
            `);
        
        if (result.recordset.length === 0) {
            // Create default settings if none exist
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('companyName', sql.NVarChar, '')
                .input('address', sql.NVarChar, '')
                .input('gstNo', sql.NVarChar, '')
                .input('gstPercentage', sql.Decimal(5,2), 9) // Singapore default 9%
                .input('phone', sql.NVarChar, '')
                .input('email', sql.NVarChar, '')
                .input('cashierName', sql.NVarChar, '')
                .input('currency', sql.NVarChar, 'SGD')
                .input('currencySymbol', sql.NVarChar, '$')
                .query(`
                    INSERT INTO CompanySettings 
                    (UserId, CompanyName, Address, GSTNo, GSTPercentage, Phone, Email, CashierName, Currency, CurrencySymbol)
                    VALUES (@userId, @companyName, @address, @gstNo, @gstPercentage, @phone, @email, @cashierName, @currency, @currencySymbol)
                `);
            
            return res.json({
                success: true,
                settings: {
                    CompanyName: '',
                    Address: '',
                    GSTNo: '',
                    GSTPercentage: 9,
                    Phone: '',
                    Email: '',
                    CashierName: '',
                    Currency: 'SGD',
                    CurrencySymbol: ''
                },
                shopName: shopName // Send shop name from Users table
            });
        }
        
        res.json({
            success: true,
            settings: result.recordset[0],
            shopName: shopName // Send shop name from Users table
        });
        
    } catch (err) {
        console.error('❌ Error getting settings:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST (create/update) company settings
router.post('/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const loggedInUserId = req.user.id;
        
        // Security check
        if (parseInt(userId) !== loggedInUserId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const { 
            CompanyName, 
            Address, 
            GSTNo, 
            GSTPercentage, 
            Phone, 
            Email, 
            CashierName,
            Currency,
            CurrencySymbol
        } = req.body;
        
        const pool = getPool();
        
        // Check if settings exist
        const exists = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT Id FROM CompanySettings WHERE UserId = @userId');
        
        if (exists.recordset.length > 0) {
            // Update
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('companyName', sql.NVarChar, CompanyName || '')
                .input('address', sql.NVarChar, Address || '')
                .input('gstNo', sql.NVarChar, GSTNo || '')
                .input('gstPercentage', sql.Decimal(5,2), GSTPercentage || 9)
                .input('phone', sql.NVarChar, Phone || '')
                .input('email', sql.NVarChar, Email || '')
                .input('cashierName', sql.NVarChar, CashierName || '')
                .input('currency', sql.NVarChar, Currency || 'SGD')
                .input('currencySymbol', sql.NVarChar, CurrencySymbol || '')
                .query(`
                    UPDATE CompanySettings 
                    SET CompanyName = @companyName,
                        Address = @address,
                        GSTNo = @gstNo,
                        GSTPercentage = @gstPercentage,
                        Phone = @phone,
                        Email = @email,
                        CashierName = @cashierName,
                        Currency = @currency,
                        CurrencySymbol = @currencySymbol
                    WHERE UserId = @userId
                `);
        } else {
            // Insert
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('companyName', sql.NVarChar, CompanyName || '')
                .input('address', sql.NVarChar, Address || '')
                .input('gstNo', sql.NVarChar, GSTNo || '')
                .input('gstPercentage', sql.Decimal(5,2), GSTPercentage || 9)
                .input('phone', sql.NVarChar, Phone || '')
                .input('email', sql.NVarChar, Email || '')
                .input('cashierName', sql.NVarChar, CashierName || 'Admin')
                .input('currency', sql.NVarChar, Currency || 'SGD')
                .input('currencySymbol', sql.NVarChar, CurrencySymbol || '')
                .query(`
                    INSERT INTO CompanySettings 
                    (UserId, CompanyName, Address, GSTNo, GSTPercentage, Phone, Email, CashierName, Currency, CurrencySymbol)
                    VALUES (@userId, @companyName, @address, @gstNo, @gstPercentage, @phone, @email, @cashierName, @currency, @currencySymbol)
                `);
        }
        
        res.json({ 
            success: true, 
            message: 'Company settings saved successfully' 
        });
        
    } catch (err) {
        console.error('❌ Error saving settings:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;