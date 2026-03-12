// backend/routes/dishItemRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getPool, sql } = require('../config/db');  // ✅ Add for middleware
const {
    getAllItems,
    getItemsByCategory,
    createItem,
    updateItem,
    deleteItem
} = require('../controllers/dishItemController');
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
                console.log(`👤 Staff ${userId} using owner ${req.effectiveUserId} data for dish items`);
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

// ============================================
// MULTER CONFIGURATION
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// ============================================
// APPLY MIDDLEWARE TO ALL ROUTES
// ============================================
router.use(authenticateToken);  // First authenticate
router.use(getEffectiveUserId); // Then get effective user ID

// ============================================
// ROUTES
// ============================================

// GET all dish items - Staff sees owner's items
router.get('/', getAllItems);

// GET items by category
router.get('/category/:categoryId', getItemsByCategory);

// CREATE new dish item - Staff creates under owner's ID
router.post('/', upload.single('image'), createItem);

// UPDATE dish item
router.put('/:id', upload.single('image'), updateItem);

// DELETE dish item
router.delete('/:id', deleteItem);

module.exports = router;