require('dotenv').config();   // MUST be at top
// backend/server.js
const multer = require('multer');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const { authenticateToken } = require('./middleware/auth');
const startLicenseUpdater = require('./cron/licenseUpdater');

// Import routes
const authRoutes = require('./routes/authRoutes');
const dishGroupRoutes = require('./routes/dishGroupRoutes');
const dishItemRoutes = require('./routes/dishItemRoutes');
const salesRoutes = require('./routes/salesRoutes');
const adminRoutes = require('./routes/adminRoutes');
const companySettingsRoutes = require('./routes/companySettingsRoutes');  
const paynowRoutes = require('./routes/paynowRoutes');

const app = express();  // ✅ ONLY ONE app declaration!
const PORT = process.env.PORT || 5000;

// Create uploads directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
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
    }
    cb(new Error('Only images are allowed'));
  }
});

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log all requests
app.use((req, res, next) => {
    console.log('📨 Incoming headers:', req.headers);
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ✅ ROOT ROUTES - These must come BEFORE other routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'POS Backend is running!',
        api: 'https://hawkerfinalv-production.up.railway.app/api',
        status: 'healthy',
        time: new Date().toISOString()
    });
});

app.get('/api', (req, res) => {
    res.json({ 
        message: 'POS API is running!',
        endpoints: {
            test: '/api/test',
            auth: '/api/auth/login',
            dishgroups: '/api/dishgroups',
            dishitems: '/api/dishitems',
            sales: '/api/sales',
            'company-settings': '/api/company-settings/:userId',
            license: '/api/license/status'
        },
        time: new Date().toISOString()
    });
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Server is working!',
        time: new Date().toISOString(),
        routes: {
            auth: '/api/auth/login',
            dishgroups: '/api/dishgroups',
            dishitems: '/api/dishitems',
            sales: '/api/sales'
        }
    });
});

// ✅ PUBLIC ROUTES - NO AUTH REQUIRED
app.use('/api/auth', authRoutes);

// ✅ PROTECTED ROUTES - AUTH REQUIRED
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/license', authenticateToken, adminRoutes);
app.use('/api/dishgroups', authenticateToken, dishGroupRoutes);
app.use('/api/dishitems', authenticateToken, dishItemRoutes);
app.use('/api/sales', authenticateToken, salesRoutes);
app.use('/api/company-settings', authenticateToken, companySettingsRoutes); 
app.use('/api/user', authenticateToken, paynowRoutes);

// UPI routes
app.get('/api/user/upi/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = await connectDB();
        
        const result = await pool.request()
            .input('userId', userId)
            .query('SELECT upi_id FROM users WHERE id = @userId');
        
        res.json({ 
            upiId: result.recordset[0]?.upi_id || null 
        });
    } catch (error) {
        console.error('Error fetching UPI ID:', error);
        res.status(500).json({ error: error.message });
    }
});

// Payment modes
app.get('/api/user/payment-modes/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = await connectDB();
        
        const result = await pool.request()
            .input('userId', userId)
            .query('SELECT payment_modes FROM user_preferences WHERE user_id = @userId');
        
        const modes = result.recordset[0]?.payment_modes 
            ? JSON.parse(result.recordset[0].payment_modes) 
            : [];
        
        res.json({ paymentModes: modes });
    } catch (error) {
        console.error('Error fetching payment modes:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/user/payment-modes', authenticateToken, async (req, res) => {
    try {
        const { userId, paymentModes } = req.body;
        const pool = await connectDB();
        
        const exists = await pool.request()
            .input('userId', userId)
            .query('SELECT id FROM user_preferences WHERE user_id = @userId');
        
        const modesJson = JSON.stringify(paymentModes);
        
        if (exists.recordset.length > 0) {
            await pool.request()
                .input('userId', userId)
                .input('paymentModes', modesJson)
                .input('updatedAt', new Date())
                .query('UPDATE user_preferences SET payment_modes = @paymentModes, updated_at = @updatedAt WHERE user_id = @userId');
        } else {
            await pool.request()
                .input('userId', userId)
                .input('paymentModes', modesJson)
                .query('INSERT INTO user_preferences (user_id, payment_modes) VALUES (@userId, @paymentModes)');
        }
        
        res.json({ success: true, paymentModes });
    } catch (error) {
        console.error('Error updating payment modes:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update UPI
app.put('/api/user/update-upi', authenticateToken, async (req, res) => {
    try {
        const { userId, upiId } = req.body;
        const pool = await connectDB();
        
        await pool.request()
            .input('userId', userId)
            .input('upiId', upiId)
            .query('UPDATE users SET upi_id = @upiId WHERE id = @userId');
        
        res.json({ 
            success: true, 
            message: 'UPI ID updated successfully',
            upiId 
        });
    } catch (error) {
        console.error('Error updating UPI ID:', error);
        res.status(500).json({ error: error.message });
    }
});

// PayNow routes
app.get('/api/user/paynow/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = await connectDB();
        
        const result = await pool.request()
            .input('userId', userId)
            .query('SELECT paynow_qr_url FROM users WHERE id = @userId');
        
        res.json({ 
            qrCodeUrl: result.recordset[0]?.paynow_qr_url || null 
        });
    } catch (error) {
        console.error('Error fetching PayNow QR:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/user/update-paynow', authenticateToken, async (req, res) => {
    try {
        const { userId, qrCodeUrl } = req.body;
        const pool = await connectDB();
        
        await pool.request()
            .input('userId', userId)
            .input('qrCodeUrl', qrCodeUrl)
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

// File upload
app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    console.log('✅ File uploaded:', req.file.filename);
    
    res.json({ 
      success: true, 
      imageUrl,
      message: 'File uploaded successfully' 
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({ error: err.message });
});

// Start server
connectDB().then(() => {
    startLicenseUpdater(); 
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`📍 Local: http://localhost:${PORT}`);
        console.log(`📍 Network: http://192.168.0.243:${PORT}`);
        console.log(`📍 Test: http://localhost:${PORT}/api/test`);
        console.log(`📍 Auth: http://localhost:${PORT}/api/auth/login`);
    });
}).catch(err => {
    console.error('❌ Failed to start server:', err);
});