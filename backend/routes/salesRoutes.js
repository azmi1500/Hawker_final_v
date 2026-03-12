// backend/routes/salesRoutes.js
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');  // ✅ Add for middleware
const {
    createSale,
    getSales,
    getSalesSummary,
    getSalesByCategory,
    getCategoryItems
} = require('../controllers/salesController');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// MIDDLEWARE - Get effective user ID (owner for staff)
// ============================================
const getEffectiveUserId = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        // If user is staff, get their owner's ID
        if (userRole === 'staff') {
            const pool = getPool();
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT OwnerId FROM Users WHERE Id = @userId');
            
            if (result.recordset.length > 0 && result.recordset[0].OwnerId) {
                req.effectiveUserId = result.recordset[0].OwnerId;
                console.log(`👤 Staff ${userId} using owner ${req.effectiveUserId} for sales`);
            } else {
                req.effectiveUserId = userId; // Fallback
            }
        } else {
            // Owner or admin uses their own ID
            req.effectiveUserId = userId;
        }
        
        // ✅ FIX: Only set _effectiveUserId if req.body exists (POST requests)
        if (req.body && typeof req.body === 'object') {
            req.body._effectiveUserId = req.effectiveUserId;
        }
        
        // Also attach to req for controllers to use directly
        req.userEffectiveId = req.effectiveUserId;
        
        next();
    } catch (err) {
        console.error('❌ Error in getEffectiveUserId:', err);
        req.effectiveUserId = req.user.id;
        req.userEffectiveId = req.user.id;
        next();
    }
};

// ============================================
// APPLY MIDDLEWARE TO ALL ROUTES
// ============================================
router.use(authenticateToken);      // First authenticate
router.use(getEffectiveUserId);      // Then get effective user ID

// ============================================
// SALES ROUTES
// ============================================

// ✅ POST /api/sales - Create new sale (staff creates under owner)
router.post('/', createSale);

// ✅ GET /api/sales?filter=today - Get sales (staff sees owner's sales)
router.get('/', getSales);

// ✅ GET /api/sales/summary?filter=today - Get sales summary
router.get('/summary', getSalesSummary);

// ✅ GET /api/sales/summarys - Optional duplicate
router.get('/summarys', getSalesSummary);

// ✅ GET /api/sales/by-category?filter=today - Category analysis
router.get('/by-category', getSalesByCategory);

// ✅ GET /api/sales/category/Appetiser?filter=today - Items in category
router.get('/category/:category', getCategoryItems);

module.exports = router;