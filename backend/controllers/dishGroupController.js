// backend/controllers/dishGroupController.js
const { getPool, sql } = require('../config/db');

// GET all dish groups
const getAllGroups = async (req, res) => {
    try {
        const userId = req.user.id; // Get from JWT token
        const pool = getPool();
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT Id, Name, ItemCount, IsActive as active 
                FROM DishGroup 
                WHERE UserId = @userId 
                ORDER BY Id
            `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Error getting groups:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET single dish group
const getGroupById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT Id, Name, ItemCount, IsActive as active FROM DishGroup WHERE Id = @id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error getting group:', err);
        res.status(500).json({ error: err.message });
    }
};

// CREATE new dish group
const createGroup = async (req, res) => {
    try {
        const { name, active } = req.body;
        const userId = req.user.id; // Get from JWT token
        
        const pool = getPool();
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('active', sql.Bit, active !== undefined ? active : true)
            .input('userId', sql.Int, userId)
            .query(`
                INSERT INTO DishGroup (Name, IsActive, UserId) 
                OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.ItemCount, INSERTED.IsActive as active
                VALUES (@name, @active, @userId)
            `);
        
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating group:', err);
        res.status(500).json({ error: err.message });
    }
};

// UPDATE dish group
const updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, active } = req.body;
        const userId = req.user.id;
        
        console.log('Updating group:', { id, name, active, userId }); // DEBUG LOG
        
        const pool = getPool();
        
        // Check if group belongs to user
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, userId)
            .query('SELECT Id FROM DishGroup WHERE Id = @id AND UserId = @userId');
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Group not found or access denied' });
        }
        
        // ✅ FIX: Use correct column names (IsActive not active)
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('active', sql.Bit, active)
            .input('userId', sql.Int, userId)
            .query(`
                UPDATE DishGroup 
                SET Name = @name, IsActive = @active 
                OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.ItemCount, INSERTED.IsActive as active
                WHERE Id = @id AND UserId = @userId
            `);
        
        console.log('Update result:', result.recordset[0]); // DEBUG LOG
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('❌ Error updating group:', err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE dish group
const deleteGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const pool = getPool();
        
        // Check if group belongs to user
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, userId)
            .query('SELECT Id FROM DishGroup WHERE Id = @id AND UserId = @userId');
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Group not found or access denied' });
        }
        
        // Delete items in this group (verify ownership)
        await pool.request()
            .input('categoryId', sql.Int, id)
            .input('userId', sql.Int, userId)
            .query('DELETE FROM DishItem WHERE CategoryId = @categoryId AND UserId = @userId');
        
        // Delete the group
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM DishGroup WHERE Id = @id');
        
        res.json({ message: 'Group deleted successfully' });
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
    deleteGroup
};