// backend/routes/dishGroupRoutes.js
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');  // ✅ Add this for middleware
const {
    getAllGroups,
    getGroupById,
    createGroup,
    updateGroup,
    deleteGroup,
    updateGroupOrder
} = require('../controllers/dishGroupController');

// ✅ MIDDLEWARE: Get effective user ID (owner for staff)
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
                console.log(`👤 Staff ${userId} using owner ${req.effectiveUserId} data`);
            } else {
                req.effectiveUserId = userId; // Fallback
            }
        } else {
            // Owner or admin uses their own ID
            req.effectiveUserId = userId;
        }
        
        next();
    } catch (err) {
        console.error('❌ Error in getEffectiveUserId:', err);
        req.effectiveUserId = req.user.id;
        next();
    }
};

// Apply middleware to all routes
router.use(getEffectiveUserId);

// GET all dish groups - Staff sees owner's groups
router.get('/', getAllGroups);

// GET single dish group by ID
router.get('/:id', getGroupById);

// CREATE new dish group - Staff creates under owner's ID
router.post('/', createGroup);

// UPDATE dish group
router.put('/:id', updateGroup);

// DELETE dish group
router.delete('/:id', deleteGroup);

// Update group order (for drag & drop)
router.post('/update-order', updateGroupOrder);

module.exports = router;