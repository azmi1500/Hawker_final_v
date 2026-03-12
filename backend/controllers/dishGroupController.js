// backend/controllers/dishGroupController.js
const { getPool, sql } = require('../config/db');

// ============================================
// HELPER FUNCTION - Get effective user ID
// ============================================
const getEffectiveUserId = async (userId, userRole) => {
    // If user is staff, get their owner's ID
    if (userRole === 'staff') {
        const pool = getPool();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT OwnerId FROM Users WHERE Id = @userId');
        
        if (result.recordset.length > 0 && result.recordset[0].OwnerId) {
            console.log(`👤 Staff ${userId} using owner ${result.recordset[0].OwnerId} data`);
            return result.recordset[0].OwnerId;
        }
    }
    // Owner or admin uses their own ID
    return userId;
};

// ============================================
// GET all dish groups
// ============================================
const getAllGroups = async (req, res) => {
    try {
        // ✅ Staff sees owner's data
        const effectiveUserId = await getEffectiveUserId(req.user.id, req.user.role);
        const pool = getPool();
        
        // Check if DisplayOrder column exists
        const columnCheck = await pool.request()
            .query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'DishGroup' AND COLUMN_NAME = 'DisplayOrder'
            `);
        
        let query;
        if (columnCheck.recordset.length > 0) {
            query = `
                SELECT Id, Name, ItemCount, IsActive as active, DisplayOrder
                FROM DishGroup 
                WHERE UserId = @userId 
                ORDER BY DisplayOrder, Name
            `;
        } else {
            query = `
                SELECT Id, Name, ItemCount, IsActive as active, 0 as DisplayOrder
                FROM DishGroup 
                WHERE UserId = @userId 
                ORDER BY Id
            `;
        }
        
        const result = await pool.request()
            .input('userId', sql.Int, effectiveUserId)  // Use effectiveUserId
            .query(query);
        
        console.log(`✅ ${req.user.role} ${req.user.id} fetched ${result.recordset.length} groups (using userId: ${effectiveUserId})`);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error getting groups:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================
// GET single dish group
// ============================================
const getGroupById = async (req, res) => {
    try {
        const { id } = req.params;
        const effectiveUserId = await getEffectiveUserId(req.user.id, req.user.role);
        const pool = getPool();
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, effectiveUserId)
            .query('SELECT Id, Name, ItemCount, IsActive as active FROM DishGroup WHERE Id = @id AND UserId = @userId');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error getting group:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================
// UPDATE group order (drag & drop)
// ============================================
const updateGroupOrder = async (req, res) => {
    try {
        const { groups } = req.body;
        const effectiveUserId = await getEffectiveUserId(req.user.id, req.user.role);
        
        if (!Array.isArray(groups)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }
        
        const pool = getPool();
        
        // Ensure DisplayOrder column exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                           WHERE TABLE_NAME = 'DishGroup' AND COLUMN_NAME = 'DisplayOrder')
            BEGIN
                ALTER TABLE DishGroup ADD DisplayOrder INT NOT NULL DEFAULT 0;
            END
        `);
        
        const transaction = pool.transaction();
        await transaction.begin();
        
        try {
            for (const group of groups) {
                // Verify group belongs to effective user (owner)
                const checkResult = await transaction.request()
                    .input('id', sql.Int, group.id)
                    .input('userId', sql.Int, effectiveUserId)
                    .query('SELECT Id FROM DishGroup WHERE Id = @id AND UserId = @userId');
                
                if (checkResult.recordset.length === 0) {
                    throw new Error(`Group ${group.id} not found or access denied`);
                }
                
                await transaction.request()
                    .input('id', sql.Int, group.id)
                    .input('order', sql.Int, group.order)
                    .query('UPDATE DishGroup SET DisplayOrder = @order WHERE Id = @id');
            }
            
            await transaction.commit();
            res.json({ success: true, message: 'Order updated successfully' });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (err) {
        console.error('Error updating group order:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================
// CREATE new dish group
// ============================================
const createGroup = async (req, res) => {
    try {
        const { name, active } = req.body;
        // ✅ Staff creates under owner's ID
        const effectiveUserId = await getEffectiveUserId(req.user.id, req.user.role);
        
        const pool = getPool();
        
        // Ensure DisplayOrder column exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                           WHERE TABLE_NAME = 'DishGroup' AND COLUMN_NAME = 'DisplayOrder')
            BEGIN
                ALTER TABLE DishGroup ADD DisplayOrder INT NOT NULL DEFAULT 0;
            END
        `);
        
        // Get max order for this user (owner)
        const maxOrderResult = await pool.request()
            .input('userId', sql.Int, effectiveUserId)
            .query('SELECT ISNULL(MAX(DisplayOrder), -1) + 1 as NextOrder FROM DishGroup WHERE UserId = @userId');
        
        const nextOrder = maxOrderResult.recordset[0].NextOrder;
        
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('active', sql.Bit, active !== undefined ? active : true)
            .input('userId', sql.Int, effectiveUserId)  // Store under owner's ID
            .input('order', sql.Int, nextOrder)
            .query(`
                INSERT INTO DishGroup (Name, IsActive, UserId, DisplayOrder) 
                OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.ItemCount, 
                       INSERTED.IsActive as active, INSERTED.DisplayOrder
                VALUES (@name, @active, @userId, @order)
            `);
        
        console.log(`✅ ${req.user.role} ${req.user.id} created group under owner ${effectiveUserId}`);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating group:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================
// UPDATE dish group
// ============================================
// backend/controllers/dishGroupController.js - UPDATE updateGroup

const updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, active } = req.body;
        const effectiveUserId = await getEffectiveUserId(req.user.id, req.user.role);
        
        console.log('🔄 Updating group:', { 
            oldId: id, 
            newName: name, 
            active, 
            userId: effectiveUserId 
        });
        
        const pool = getPool();
        
        // Start transaction
        const transaction = pool.transaction();
        await transaction.begin();
        
        try {
            // First, get the old group name
            const oldGroupResult = await transaction.request()
                .input('id', sql.Int, id)
                .input('userId', sql.Int, effectiveUserId)
                .query('SELECT Name FROM DishGroup WHERE Id = @id AND UserId = @userId');
            
            if (oldGroupResult.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Group not found' });
            }
            
            const oldName = oldGroupResult.recordset[0].Name;
            
            // ✅ FIX: Use INSERTED.DisplayOrder instead of ISNULL
            const groupResult = await transaction.request()
                .input('id', sql.Int, id)
                .input('name', sql.NVarChar, name)
                .input('active', sql.Bit, active)
                .input('userId', sql.Int, effectiveUserId)
                .query(`
                    UPDATE DishGroup 
                    SET Name = @name, IsActive = @active 
                    OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.ItemCount, 
                           INSERTED.IsActive as active, INSERTED.DisplayOrder as DisplayOrder
                    WHERE Id = @id AND UserId = @userId
                `);
            
            // UPDATE 2: Update all DishItems with this category
            await transaction.request()
                .input('oldCategory', sql.NVarChar, oldName)
                .input('newCategory', sql.NVarChar, name)
                .input('userId', sql.Int, effectiveUserId)
                .input('categoryId', sql.Int, id)
                .query(`
                    UPDATE DishItem 
                    SET 
                        DisplayCategory = @newCategory,
                        OriginalCategory = @newCategory,
                        CategoryId = @categoryId
                    WHERE 
                        (DisplayCategory = @oldCategory OR OriginalCategory = @oldCategory)
                        AND UserId = @userId
                `);
            
            console.log(`✅ Updated ${oldName} → ${name}`);
            console.log(`✅ Updated all items under category ${oldName} to ${name}`);
            
            await transaction.commit();
            
            res.json(groupResult.recordset[0]);
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (err) {
        console.error('❌ Error updating group:', err);
        res.status(500).json({ error: err.message });
    }
};
// ============================================
// DELETE dish group
// ============================================
const deleteGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const effectiveUserId = await getEffectiveUserId(req.user.id, req.user.role);
        const pool = getPool();
        
        const transaction = pool.transaction();
        await transaction.begin();
        
        try {
            // Check if group belongs to effective user (owner)
            const checkResult = await transaction.request()
                .input('id', sql.Int, id)
                .input('userId', sql.Int, effectiveUserId)
                .query('SELECT Id, DisplayOrder FROM DishGroup WHERE Id = @id AND UserId = @userId');
            
            if (checkResult.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Group not found or access denied' });
            }
            
            const deletedOrder = checkResult.recordset[0].DisplayOrder || 0;
            
            // Delete items in this group (under owner's ID)
            await transaction.request()
                .input('categoryId', sql.Int, id)
                .input('userId', sql.Int, effectiveUserId)
                .query('DELETE FROM DishItem WHERE CategoryId = @categoryId AND UserId = @userId');
            
            // Delete the group
            await transaction.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM DishGroup WHERE Id = @id');
            
            // Reorder remaining groups
            await transaction.request()
                .input('userId', sql.Int, effectiveUserId)
                .input('deletedOrder', sql.Int, deletedOrder)
                .query(`
                    UPDATE DishGroup 
                    SET DisplayOrder = DisplayOrder - 1 
                    WHERE UserId = @userId AND DisplayOrder > @deletedOrder
                `);
            
            await transaction.commit();
            res.json({ message: 'Group deleted successfully' });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (err) {
        console.error('Error deleting group:', err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getAllGroups,
    getGroupById,
    createGroup,
    updateGroup,
    deleteGroup,
    updateGroupOrder
};