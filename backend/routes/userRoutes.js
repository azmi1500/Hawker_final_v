// backend/routes/paynowRoutes.js - UPDATED with Owner-Staff Support

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// HELPER FUNCTION - Get owner ID (for staff)
// ============================================
const getOwnerId = async (userId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT 
                CASE 
                    WHEN Role = 'staff' THEN OwnerId
                    ELSE Id
                END as OwnerId
            FROM Users 
            WHERE Id = @userId
        `);
    
    return result.recordset[0]?.OwnerId || userId;
};

// ============================================
// GET PayNow QR code - Staff sees owner's QR
// ============================================
router.get('/paynow/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // ✅ ALWAYS get owner ID
    const ownerId = await getOwnerId(userId);
    
    const pool = getPool();
    
    const result = await pool.request()
      .input('userId', sql.Int, ownerId)
      .query('SELECT paynow_qr_url FROM users WHERE id = @userId');
    
    const qrUrl = result.recordset[0]?.paynow_qr_url || null;
    
    console.log(`📱 PayNow QR for user ${userId} (owner: ${ownerId}):`, qrUrl ? '✅ Has QR' : '❌ No QR');
    
    res.json({ 
      qrCodeUrl: qrUrl
    });
  } catch (error) {
    console.error('Error fetching PayNow QR:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// UPDATE PayNow QR code - Staff updates owner's QR
// ============================================
router.put('/update-paynow', authenticateToken, async (req, res) => {
  try {
    const { userId, qrCodeUrl } = req.body;
    
    // ✅ ALWAYS update owner's QR
    const ownerId = await getOwnerId(userId);
    
    const pool = getPool();
    
    await pool.request()
      .input('userId', sql.Int, ownerId)
      .input('qrCodeUrl', sql.NVarChar, qrCodeUrl)
      .query('UPDATE users SET paynow_qr_url = @qrCodeUrl WHERE id = @userId');
    
    console.log(`✅ PayNow QR updated for user ${userId} (owner: ${ownerId})`);
    
    res.json({ 
      success: true, 
      message: 'PayNow QR updated successfully',
      qrCodeUrl 
    });
  } catch (error) {
    console.error('Error updating PayNow QR:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;