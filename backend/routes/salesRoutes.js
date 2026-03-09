// backend/routes/salesRoutes.js
const express = require('express');
const router = express.Router();
const {
    createSale,
    getSales,
    getSalesSummary,
    getSalesByCategory,      // ✅ NEW - Category analysis
    getCategoryItems         // ✅ NEW - Items in category
} = require('../controllers/salesController');

// ✅ Existing routes
router.post('/', createSale);                    // POST /api/sales
router.get('/', getSales);                       // GET /api/sales?filter=today
router.get('/summary', getSalesSummary);         // GET /api/sales/summary?filter=today
router.get('/summarys', getSalesSummary);        // (optional duplicate)

// ✅ NEW Category routes
router.get('/by-category', getSalesByCategory);           // GET /api/sales/by-category?filter=today
router.get('/category/:category', getCategoryItems);      // GET /api/sales/category/Appetiser?filter=today

module.exports = router;