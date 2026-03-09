// backend/routes/dishItemRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    getAllItems,
    getItemsByCategory,
    createItem,
    updateItem,
    deleteItem
} = require('../controllers/dishItemController');
const { authenticateToken } = require('../middleware/auth');
// Configure multer for file uploads
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

router.get('/', getAllItems);
router.get('/category/:categoryId', getItemsByCategory);
router.post('/', upload.single('image'), createItem);
router.put('/:id', upload.single('image'), updateItem);
router.delete('/:id', deleteItem);

module.exports = router;