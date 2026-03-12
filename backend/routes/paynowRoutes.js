// backend/routes/paynowRoutes.js - UPDATED with Owner-Staff Support
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// HELPER FUNCTION - Get effective user ID (owner for staff)
// ============================================
const getEffectiveUserId = async (userId, userRole) => {
    // If user is staff, get their owner's ID
    if (userRole === 'staff') {
        const pool = getPool();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT OwnerId FROM Users WHERE Id = @userId');
        
        if (result.recordset.length > 0 && result.recordset[0].OwnerId) {
            console.log(`👤 Staff ${userId} using owner ${result.recordset[0].OwnerId} for PayNow`);
            return result.recordset[0].OwnerId;
        }
    }
    // Owner or admin uses their own ID
    return userId;
};

// ✅ GET PayNow QR code - Staff sees owner's QR
router.get('/paynow/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userRole = req.user.role;
    
    // If staff, use owner's ID
    const effectiveUserId = await getEffectiveUserId(
      parseInt(userId), 
      userRole
    );
    
    const pool = getPool();
    
    const result = await pool.request()
      .input('userId', sql.Int, effectiveUserId)
      .query('SELECT paynow_qr_url FROM users WHERE id = @userId');
    
    console.log(`✅ ${userRole} ${req.user.id} fetched PayNow QR (using userId: ${effectiveUserId})`);
    res.json({ qrCodeUrl: result.recordset[0]?.paynow_qr_url || null });
    
  } catch (error) {
    console.error('Error fetching PayNow QR:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ UPDATE PayNow QR code - Staff updates owner's QR
router.put('/update-paynow', authenticateToken, async (req, res) => {
  try {
    const { userId, qrCodeUrl } = req.body;
    const userRole = req.user.role;
    
    // If staff, update owner's QR
    const effectiveUserId = await getEffectiveUserId(
      parseInt(userId), 
      userRole
    );
    
    const pool = getPool();
    
    await pool.request()
      .input('userId', sql.Int, effectiveUserId)
      .input('qrCodeUrl', sql.NVarChar, qrCodeUrl)
      .query('UPDATE users SET paynow_qr_url = @qrCodeUrl WHERE id = @userId');
    
    console.log(`✅ ${userRole} ${req.user.id} updated PayNow QR for user ${effectiveUserId}`);
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