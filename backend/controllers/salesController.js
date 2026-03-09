const { getPool, sql } = require('../config/db');

// backend/controllers/salesController.js

// backend/controllers/salesController.js - Update createSale

const createSale = async (req, res) => {
    try {
        const { total, paymentMethod, items } = req.body;
        const userId = req.user.id;
        
        // 🔍 DEBUG: See what's coming from frontend
        console.log('🔍 RAW ITEMS FROM FRONTEND:', JSON.stringify(items, null, 2));
        
        // ✅ CRITICAL: Ensure each item has category
        const itemsWithCategory = items.map(item => {
            // 🔍 Check each item's fields
            console.log(`🔍 Item "${item.name}" fields:`, {
                has_category: !!item.category,
                category_value: item.category,
                has_displayCategory: !!item.displayCategory,
                displayCategory_value: item.displayCategory,
                has_originalCategory: !!item.originalCategory,
                originalCategory_value: item.originalCategory
            });
            
            return {
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                // Try all fields
                category: item.category || item.displayCategory || 'Uncategorized',
                displayCategory: item.displayCategory || item.category || 'Uncategorized',
    originalCategory: item.originalCategory || item.category
            };
        });
        
        console.log('📦 FINAL items with categories:', itemsWithCategory.map(i => ({
            name: i.name,
            category: i.category
        })));
        
        const itemsJson = JSON.stringify(itemsWithCategory);
        
        const pool = getPool();
        
        await pool.request()
            .input('total', sql.Decimal(10,2), total)
            .input('paymentMethod', sql.NVarChar, paymentMethod)
            .input('itemsJson', sql.NVarChar, itemsJson)
            .input('userId', sql.Int, userId)
            .query(`
                INSERT INTO Sales (Total, PaymentMethod, ItemsJson, UserId)
                VALUES (@total, @paymentMethod, @itemsJson, @userId)
            `);

        const result = await pool.request()
            .query('SELECT TOP 1 Id, Total, PaymentMethod, SaleDate, ItemsJson FROM Sales ORDER BY Id DESC');

        const savedSale = result.recordset[0];
        
        let parsedItems = itemsWithCategory;
        if (savedSale.ItemsJson) {
            try {
                parsedItems = typeof savedSale.ItemsJson === 'string' 
                    ? JSON.parse(savedSale.ItemsJson)
                    : savedSale.ItemsJson;
            } catch (e) {
                console.error('Parse error:', e);
            }
        }

        const newSale = {
            id: savedSale.Id,
            total: savedSale.Total,
            paymentMethod: savedSale.PaymentMethod,
            date: savedSale.SaleDate,
            items: parsedItems
        };

        console.log('✅ Sale saved:', {
            id: newSale.id,
            items: parsedItems.map(i => ({name: i.name, category: i.category}))
        });
        
        res.status(201).json(newSale);
        
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get filtered sales

const getSales = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        const userId = req.user.id;
        const pool = getPool();
        
        console.log('📊 Getting sales for user:', userId);
        
        let query = 'SELECT Id, Total, PaymentMethod, SaleDate, CAST(ItemsJson AS NVARCHAR(MAX)) as ItemsJson FROM Sales WHERE UserId = @userId';
        const request = pool.request();
        request.input('userId', sql.Int, userId);

        console.log('Filter:', filter, 'Start:', startDate, 'End:', endDate);

        if (filter === 'today') {
            query += ' AND CAST(SaleDate AS DATE) = CAST(GETDATE() AS DATE)';
        } 
        else if (filter === 'week') {
            query += ' AND SaleDate >= DATEADD(day, -7, GETDATE())';
        } 
        else if (filter === 'month') {
            query += ' AND SaleDate >= DATEADD(month, -1, GETDATE())';
        } 
        else if (filter === 'custom' && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            
            query += ' AND SaleDate >= @startDate AND SaleDate <= @endDate';
            request.input('startDate', sql.DateTime, start);
            request.input('endDate', sql.DateTime, end);
        }

        query += ' ORDER BY SaleDate DESC';
        console.log('Final query:', query);
        
        const result = await request.query(query);
        console.log(`Found ${result.recordset.length} sales`);
        
        const formattedSales = result.recordset.map(sale => {
            let items = [];
            try {
                items = sale.ItemsJson ? JSON.parse(sale.ItemsJson) : [];
            } catch (e) {
                console.error('Parse error:', e);
                items = [];
            }
            
            return {
                id: sale.Id,
                total: sale.Total,
                paymentMethod: sale.PaymentMethod,
                date: sale.SaleDate,
                items: items
            };
        });

        console.log(`✅ Found ${formattedSales.length} sales`);
        res.json(formattedSales);
        
    } catch (err) {
        console.error('❌ Error:', err);
        // Return empty array on error instead of 500
        res.json([]);
    }
};
// Get sales summary
const getSalesSummary = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        const userId = req.user.id;
        const pool = getPool();
        
        let query = 'SELECT * FROM Sales WHERE UserId = @userId';
        const request = pool.request();
        request.input('userId', sql.Int, userId);

        if (filter === 'today') {
            query += ' AND CAST(SaleDate AS DATE) = CAST(GETDATE() AS DATE)';
        } 
        else if (filter === 'week') {
            query += ' AND SaleDate >= DATEADD(day, -7, GETDATE())';
        } 
        else if (filter === 'month') {
            query += ' AND SaleDate >= DATEADD(month, -1, GETDATE())';
        } 
        else if (filter === 'custom' && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            query += ' AND SaleDate >= @startDate AND SaleDate <= @endDate';
            request.input('startDate', sql.DateTime, start);
            request.input('endDate', sql.DateTime, end);
        }

        const result = await request.query(query);
        
        let totalRevenue = 0;
        let totalItems = 0;
        const paymentBreakdown = {};
        
        result.recordset.forEach(sale => {
            totalRevenue += sale.Total;
            
            try {
                const items = JSON.parse(sale.ItemsJson);
                items.forEach(item => {
                    totalItems += item.quantity || 0;
                });
            } catch (e) {
                console.error('Error parsing items');
            }
            
            paymentBreakdown[sale.PaymentMethod] = (paymentBreakdown[sale.PaymentMethod] || 0) + sale.Total;
        });

        res.json({
            totalSales: result.recordset.length,
            totalRevenue,
            totalItems,
            paymentBreakdown
        });
    } catch (err) {
        console.error('Error getting sales summary:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============ NEW CATEGORY-WISE FUNCTIONS ============

/**
 * ✅ Get sales by category with date/time filter
 * Endpoint: GET /api/sales/by-category?filter=today&startDate=2026-03-01&endDate=2026-03-03&startTime=09:00&endTime=18:00
 */
// backend/controllers/salesController.js

/**
 * ✅ FIXED: Get sales by category with date/time filter
 * Endpoint: GET /api/sales/by-category?filter=today
 */
// backend/controllers/salesController.js - FIXED getSalesByCategory

const getSalesByCategory = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        const userId = req.user.id;
        const pool = getPool();
        
        let query = 'SELECT Id, Total, PaymentMethod, SaleDate, CAST(ItemsJson AS NVARCHAR(MAX)) as ItemsJson FROM Sales WHERE UserId = @userId';
        const request = pool.request();
        request.input('userId', sql.Int, userId);

        console.log('📊 Category filter:', { filter, startDate, endDate });

        // Apply date filters
        if (filter === 'today') {
            query += ' AND CAST(SaleDate AS DATE) = CAST(GETDATE() AS DATE)';
        } 
        else if (filter === 'week') {
            query += ' AND SaleDate >= DATEADD(day, -7, GETDATE())';
        } 
        else if (filter === 'month') {
            query += ' AND SaleDate >= DATEADD(month, -1, GETDATE())';
        } 
        else if (filter === 'custom' && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            
            query += ' AND SaleDate >= @startDate AND SaleDate <= @endDate';
            request.input('startDate', sql.DateTime, start);
            request.input('endDate', sql.DateTime, end);
        }

        const result = await request.query(query);
        
        // 🔍 DEBUG: See raw ItemsJson from database
        console.log('🔍 RAW DATA FROM DATABASE:');
        result.recordset.forEach((sale, index) => {
            try {
                const items = JSON.parse(sale.ItemsJson);
                console.log(`\n📦 Sale #${index + 1} (ID: ${sale.Id}):`);
                items.forEach(item => {
                    console.log(`   Item: ${item.name}`);
                    console.log(`   → category: ${item.category}`);
                    console.log(`   → displayCategory: ${item.displayCategory}`);
                    console.log(`   → originalCategory: ${item.originalCategory}`);
                    console.log(`   → All fields:`, Object.keys(item));
                });
            } catch (e) {
                console.log(`Sale ${index + 1}: Parse error -`, e.message);
            }
        });

        // Process data with proper category grouping
        const categoryMap = new Map();
        const transactionSet = new Set();
        
        result.recordset.forEach(sale => {
            transactionSet.add(sale.Id);
            try {
                const itemsList = JSON.parse(sale.ItemsJson);
                
                itemsList.forEach(item => {
                    // Get category - try all possible fields
                    const categoryName = item.displayCategory || item.category || item.originalCategory || 'Uncategorized';
                    
                    if (!categoryMap.has(categoryName)) {
                        categoryMap.set(categoryName, {
                            name: categoryName,
                            totalRevenue: 0,
                            totalQuantity: 0,
                            items: new Map(),
                            transactions: new Set()
                        });
                    }
                    
                    const category = categoryMap.get(categoryName);
                    const revenue = (item.price || 0) * (item.quantity || 1);
                    
                    category.totalRevenue += revenue;
                    category.totalQuantity += (item.quantity || 1);
                    category.transactions.add(sale.Id);
                    
                    // Track individual items
                    const itemName = item.name;
                    if (!category.items.has(itemName)) {
                        category.items.set(itemName, {
                            name: itemName,
                            quantity: 0,
                            revenue: 0,
                            price: item.price || 0,
                            transactions: new Set()
                        });
                    }
                    
                    const catItem = category.items.get(itemName);
                    catItem.quantity += (item.quantity || 1);
                    catItem.revenue += revenue;
                    catItem.transactions.add(sale.Id);
                });
                
            } catch (e) {
                console.error('Parse error:', e);
            }
        });
        
        // Format response
        const formattedCategories = [];
        let totalRevenue = 0;
        let totalItems = 0;
        
        for (const [catName, catData] of categoryMap) {
            const itemsList = Array.from(catData.items.values()).map(item => ({
                name: item.name,
                quantity: item.quantity,
                revenue: item.revenue,
                price: item.price,
                transactionCount: item.transactions.size
            })).sort((a, b) => b.revenue - a.revenue);
            
            formattedCategories.push({
                name: catName,
                totalRevenue: catData.totalRevenue,
                totalQuantity: catData.totalQuantity,
                totalTransactions: catData.transactions.size,
                items: itemsList,
                itemCount: itemsList.length
            });
            
            totalRevenue += catData.totalRevenue;
            totalItems += catData.totalQuantity;
        }
        
        // Sort categories by revenue
        formattedCategories.sort((a, b) => b.totalRevenue - a.totalRevenue);
        
        console.log('\n✅ FINAL CATEGORIES:', formattedCategories.map(c => ({
            name: c.name,
            revenue: c.totalRevenue,
            items: c.items.map(i => `${i.name}(${i.quantity})`)
        })));
        
        res.json({
            success: true,
            summary: {
                totalRevenue,
                totalTransactions: transactionSet.size,
                totalCategories: formattedCategories.length,
                totalItems
            },
            categories: formattedCategories,
            dateRange: {
                filter,
                startDate: startDate || null,
                endDate: endDate || null
            }
        });
        
    } catch (err) {
        console.error('❌ Error in category sales:', err);
        res.status(500).json({ error: err.message });
    }
};
/**
 * ✅ FIXED: Get items for a specific category
 */
// backend/controllers/salesController.js - FIXED getCategoryItems

const getCategoryItems = async (req, res) => {
    try {
        const { category } = req.params;
        const { filter, startDate, endDate } = req.query;
        const userId = req.user.id;
        const pool = getPool();
        
        let query = 'SELECT Id, Total, PaymentMethod, SaleDate, CAST(ItemsJson AS NVARCHAR(MAX)) as ItemsJson FROM Sales WHERE UserId = @userId';
        const request = pool.request();
        request.input('userId', sql.Int, userId);

        console.log(`📊 Loading items for category: ${category}`);

        // Apply date filters
        if (filter === 'today') {
            query += ' AND CAST(SaleDate AS DATE) = CAST(GETDATE() AS DATE)';
        } 
        else if (filter === 'week') {
            query += ' AND SaleDate >= DATEADD(day, -7, GETDATE())';
        } 
        else if (filter === 'month') {
            query += ' AND SaleDate >= DATEADD(month, -1, GETDATE())';
        } 
        else if (filter === 'custom' && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            
            query += ' AND SaleDate >= @startDate AND SaleDate <= @endDate';
            request.input('startDate', sql.DateTime, start);
            request.input('endDate', sql.DateTime, end);
        }

        const result = await request.query(query);
        
        // Process items and transactions for this category
        const itemMap = new Map();
        const transactions = []; // ✅ NEW: Store all transactions
        
        result.recordset.forEach(sale => {
            try {
                const itemsList = JSON.parse(sale.ItemsJson);
                itemsList.forEach(item => {
                    const itemCategory = item.displayCategory || item.category || item.originalCategory || 'Uncategorized';
                    
                    if (itemCategory === category) {
                        const itemName = item.name;
                        const quantity = item.quantity || 1;
                        const price = item.price || 0;
                        const revenue = price * quantity;
                        
                        // Track items (for summary)
                        if (!itemMap.has(itemName)) {
                            itemMap.set(itemName, {
                                name: itemName,
                                quantity: 0,
                                revenue: 0,
                                price: price,
                                transactions: new Set()
                            });
                        }
                        
                        const catItem = itemMap.get(itemName);
                        catItem.quantity += quantity;
                        catItem.revenue += revenue;
                        catItem.transactions.add(sale.Id);
                        
                        // ✅ NEW: Track each transaction separately
                        transactions.push({
                            saleId: sale.Id,
                            saleDate: sale.SaleDate,
                            name: itemName,
                            quantity: quantity,
                            price: price,
                            total: revenue
                        });
                    }
                });
            } catch (e) {
                console.error('Parse error:', e);
            }
        });
        
        // Format items list
        const itemsList = Array.from(itemMap.values())
            .map(item => ({
                ...item,
                transactionCount: item.transactions.size
            }))
            .sort((a, b) => b.revenue - a.revenue);
        
        const totalRevenue = itemsList.reduce((sum, item) => sum + item.revenue, 0);
        const totalQuantity = itemsList.reduce((sum, item) => sum + item.quantity, 0);
        
        console.log(`✅ Found ${itemsList.length} items in ${category}`);
        console.log(`✅ Found ${transactions.length} transactions in ${category}`);
        
        res.json({
            success: true,
            category,
            totalRevenue,
            totalQuantity,
            totalItems: itemsList.length,
            items: itemsList,
            transactions: transactions // ✅ NEW: Send transactions to frontend
        });
        
    } catch (err) {
        console.error('❌ Error in category items:', err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createSale,
    getSales,
    getSalesSummary,
    getSalesByCategory,
    getCategoryItems
};