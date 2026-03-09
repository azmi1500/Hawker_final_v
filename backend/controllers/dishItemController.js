// backend/controllers/dishItemController.js
const { getPool, sql } = require('../config/db');

// GET all dish items
const getAllItems = async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = getPool();
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT d.Id, d.Name, d.Price, d.ImageUrl as imageUri, 
                       d.CategoryId, d.OriginalName, d.OriginalCategory,
                       d.DisplayCategory, d.IsActive,
                       g.Name as categoryName
                FROM DishItem d
                LEFT JOIN DishGroup g ON d.CategoryId = g.Id AND g.UserId = @userId
                WHERE d.UserId = @userId
                ORDER BY d.Id
            `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Error getting items:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET items by category
const getItemsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const pool = getPool();
        const result = await pool.request()
            .input('categoryId', sql.Int, categoryId)
            .query(`
                SELECT d.Id, d.Name, d.Price, d.ImageUrl as imageUri,
                       d.OriginalName, d.OriginalCategory, d.DisplayCategory
                FROM DishItem d
                WHERE d.CategoryId = @categoryId AND d.IsActive = 1
            `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Error getting items by category:', err);
        res.status(500).json({ error: err.message });
    }
};

// CREATE new dish item
const createItem = async (req, res) => {
    try {
        const { name, price, category, originalName, originalCategory, displayCategory } = req.body;
        const userId = req.user.id;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        
        const pool = getPool();
        
        // Verify category belongs to user
        const categoryCheck = await pool.request()
            .input('categoryId', sql.Int, category)
            .input('userId', sql.Int, userId)
            .query('SELECT Id FROM DishGroup WHERE Id = @categoryId AND UserId = @userId');
        
        if (categoryCheck.recordset.length === 0) {
            return res.status(403).json({ error: 'Category not found or access denied' });
        }
        
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('price', sql.Decimal(10,2), price)
            .input('categoryId', sql.Int, category)
            .input('imageUrl', sql.NVarChar, imageUrl)
            .input('originalName', sql.NVarChar, originalName || name)
            .input('originalCategory', sql.NVarChar, originalCategory || category)
            .input('displayCategory', sql.NVarChar, displayCategory || '')
            .input('userId', sql.Int, userId)
            .query(`
                INSERT INTO DishItem (Name, Price, CategoryId, ImageUrl, OriginalName, OriginalCategory, DisplayCategory, UserId)
                OUTPUT INSERTED.*
                VALUES (@name, @price, @categoryId, @imageUrl, @originalName, @originalCategory, @displayCategory, @userId)
            `);
        
        // Update item count in category
        await pool.request()
            .input('categoryId', sql.Int, category)
            .query('UPDATE DishGroup SET ItemCount = ItemCount + 1 WHERE Id = @categoryId');
        
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating item:', err);
        res.status(500).json({ error: err.message });
    }
};

// UPDATE dish item (verify ownership)
const updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        // ✅ Add isActive to destructuring
        const { name, price, category, originalName, originalCategory, displayCategory, isActive } = req.body;
        const userId = req.user.id;
        
        console.log('📝 Updating item:', { id, name, price, category, isActive }); // Debug
        
        const pool = getPool();
        
        // Check if item belongs to user
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, userId)
            .query('SELECT Id, CategoryId FROM DishItem WHERE Id = @id AND UserId = @userId');
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Item not found or access denied' });
        }
        
        const oldCategoryId = checkResult.recordset[0].CategoryId;
        
        // Verify new category belongs to user (if changed)
        if (category && oldCategoryId !== parseInt(category)) {
            const categoryCheck = await pool.request()
                .input('categoryId', sql.Int, category)
                .input('userId', sql.Int, userId)
                .query('SELECT Id FROM DishGroup WHERE Id = @categoryId AND UserId = @userId');
            
            if (categoryCheck.recordset.length === 0) {
                return res.status(403).json({ error: 'New category not found or access denied' });
            }
        }
        
        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }
        
        // Build dynamic update query
        let updateQuery = 'UPDATE DishItem SET ';
        const updates = [];
        const request = pool.request();
        
        request.input('id', sql.Int, id);
        request.input('userId', sql.Int, userId);
        
        if (name !== undefined) {
            updates.push('Name = @name');
            request.input('name', sql.NVarChar, name);
        }
        if (price !== undefined) {
            updates.push('Price = @price');
            request.input('price', sql.Decimal(10,2), price);
        }
        if (category !== undefined) {
            updates.push('CategoryId = @categoryId');
            request.input('categoryId', sql.Int, category);
        }
        if (originalName !== undefined) {
            updates.push('OriginalName = @originalName');
            request.input('originalName', sql.NVarChar, originalName);
        }
        if (originalCategory !== undefined) {
            updates.push('OriginalCategory = @originalCategory');
            request.input('originalCategory', sql.NVarChar, originalCategory);
        }
        if (displayCategory !== undefined) {
            updates.push('DisplayCategory = @displayCategory');
            request.input('displayCategory', sql.NVarChar, displayCategory);
        }
        // ✅ Add isActive update
        if (isActive !== undefined) {
            updates.push('IsActive = @isActive');
            request.input('isActive', sql.Bit, isActive ? 1 : 0);
        }
        if (imageUrl) {
            updates.push('ImageUrl = @imageUrl');
            request.input('imageUrl', sql.NVarChar, imageUrl);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        updateQuery += updates.join(', ') + ' OUTPUT INSERTED.* WHERE Id = @id AND UserId = @userId';
        
        const result = await request.query(updateQuery);
        
        // Update category counts if category changed
        if (category && oldCategoryId !== parseInt(category)) {
            // Decrease count in old category
            await pool.request()
                .input('categoryId', sql.Int, oldCategoryId)
                .query('UPDATE DishGroup SET ItemCount = ItemCount - 1 WHERE Id = @categoryId');
            
            // Increase count in new category
            await pool.request()
                .input('categoryId', sql.Int, category)
                .query('UPDATE DishGroup SET ItemCount = ItemCount + 1 WHERE Id = @categoryId');
        }
        
        console.log('✅ Item updated:', result.recordset[0]);
        res.json(result.recordset[0]);
        
    } catch (err) {
        console.error('❌ Error updating item:', err);
        res.status(500).json({ error: err.message });
    }
};
// DELETE dish item
const deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const pool = getPool();
        
        // Get category before deleting (verify ownership)
        const item = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, userId)
            .query('SELECT CategoryId FROM DishItem WHERE Id = @id AND UserId = @userId');
        
        if (item.recordset.length === 0) {
            return res.status(404).json({ error: 'Item not found or access denied' });
        }
        
        const categoryId = item.recordset[0].CategoryId;
        
        // Delete the item
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM DishItem WHERE Id = @id');
        
        // Decrease item count in category
        await pool.request()
            .input('categoryId', sql.Int, categoryId)
            .query('UPDATE DishGroup SET ItemCount = ItemCount - 1 WHERE Id = @categoryId');
        
        res.json({ message: 'Item deleted successfully' });
    } catch (err) {
        console.error('Error deleting item:', err);
        res.status(500).json({ error: err.message });
    }
};


module.exports = {
    getAllItems,
    getItemsByCategory,
    createItem,
    updateItem,
    deleteItem
};