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
        
        // ✅ Use a single query with LEFT JOIN to get both in one go
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    u.ShopName,
                    ISNULL(c.CompanyName, '') as CompanyName,
                    ISNULL(c.Address, '') as Address,
                    ISNULL(c.GSTNo, '') as GSTNo,
                    ISNULL(c.GSTPercentage, 9) as GSTPercentage,
                    ISNULL(c.Phone, '') as Phone,
                    ISNULL(c.Email, '') as Email,
                    ISNULL(c.CashierName, '') as CashierName,
                    ISNULL(c.Currency, 'SGD') as Currency,
                    ISNULL(c.CurrencySymbol, '$') as CurrencySymbol
                FROM Users u
                LEFT JOIN CompanySettings c ON u.Id = c.UserId
                WHERE u.Id = @userId
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const row = result.recordset[0];
        
        // ✅ If no settings exist, return defaults
        const settings = {
            CompanyName: row.CompanyName,
            Address: row.Address,
            GSTNo: row.GSTNo,
            GSTPercentage: row.GSTPercentage,
            Phone: row.Phone,
            Email: row.Email,
            CashierName: row.CashierName,
            Currency: row.Currency,
            CurrencySymbol: row.CurrencySymbol
        };
        
        res.json({
            success: true,
            settings,
            shopName: row.ShopName
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
        
        // ✅ SINGLE QUERY using MERGE (insert or update in one go)
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
            .input('currencySymbol', sql.NVarChar, CurrencySymbol || '$')
            .query(`
                MERGE INTO CompanySettings AS target
                USING (SELECT @userId AS UserId) AS source
                ON target.UserId = source.UserId
                WHEN MATCHED THEN
                    UPDATE SET 
                        CompanyName = @companyName,
                        Address = @address,
                        GSTNo = @gstNo,
                        GSTPercentage = @gstPercentage,
                        Phone = @phone,
                        Email = @email,
                        CashierName = @cashierName,
                        Currency = @currency,
                        CurrencySymbol = @currencySymbol
                WHEN NOT MATCHED THEN
                    INSERT (UserId, CompanyName, Address, GSTNo, GSTPercentage, Phone, Email, CashierName, Currency, CurrencySymbol)
                    VALUES (@userId, @companyName, @address, @gstNo, @gstPercentage, @phone, @email, @cashierName, @currency, @currencySymbol);
            `);
        
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
