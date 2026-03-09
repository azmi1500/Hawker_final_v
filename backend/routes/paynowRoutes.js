// backend/routes/paynowRoutes.js

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET PayNow QR code for user
router.get('/paynow/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();
    
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT paynow_qr_url FROM users WHERE id = @userId');
    
    res.json({ 
      qrCodeUrl: result.recordset[0]?.paynow_qr_url || null 
    });
  } catch (error) {
    console.error('Error fetching PayNow QR:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE PayNow QR code
router.put('/update-paynow', authenticateToken, async (req, res) => {
  try {
    const { userId, qrCodeUrl } = req.body;
    const pool = getPool();
    
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('qrCodeUrl', sql.NVarChar, qrCodeUrl)
      .query('UPDATE users SET paynow_qr_url = @qrCodeUrl WHERE id = @userId');
    
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