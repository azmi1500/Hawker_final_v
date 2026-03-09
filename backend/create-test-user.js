// backend/create-test-user.js
const bcrypt = require('bcryptjs');
const { getPool, connectDB, sql } = require('./config/db');

async function createTestUser() {
    try {
        await connectDB();
        const pool = getPool();

        // Hash password 'admin123'
        const hashedPassword = await bcrypt.hash('admin123', 10);
        console.log('Hashed password:', hashedPassword);

        // Check if user exists
        const checkResult = await pool.request()
            .input('username', sql.NVarChar, 'admin')
            .query('SELECT Id FROM Users WHERE Username = @username');

        if (checkResult.recordset.length > 0) {
            // Update existing user
            await pool.request()
                .input('username', sql.NVarChar, 'admin')
                .input('passwordHash', sql.NVarChar, hashedPassword)
                .input('role', sql.NVarChar, 'admin')
                .input('fullName', sql.NVarChar, 'Administrator')
                .query(`
                    UPDATE Users 
                    SET PasswordHash = @passwordHash, 
                        Role = @role, 
                        FullName = @fullName
                    WHERE Username = @username
                `);
            console.log('✅ Updated admin user');
        } else {
            // Insert new user
            await pool.request()
                .input('username', sql.NVarChar, 'admin')
                .input('passwordHash', sql.NVarChar, hashedPassword)
                .input('role', sql.NVarChar, 'admin')
                .input('fullName', sql.NVarChar, 'Administrator')
                .query(`
                    INSERT INTO Users (Username, PasswordHash, Role, FullName)
                    VALUES (@username, @passwordHash, @role, @fullName)
                `);
            console.log('✅ Created admin user');
        }

        // Create staff user
        const staffHash = await bcrypt.hash('staff123', 10);
        
        const staffCheck = await pool.request()
            .input('username', sql.NVarChar, 'staff')
            .query('SELECT Id FROM Users WHERE Username = @username');

        if (staffCheck.recordset.length > 0) {
            await pool.request()
                .input('username', sql.NVarChar, 'staff')
                .input('passwordHash', sql.NVarChar, staffHash)
                .input('role', sql.NVarChar, 'staff')
                .input('fullName', sql.NVarChar, 'Staff Member')
                .query(`
                    UPDATE Users 
                    SET PasswordHash = @passwordHash, 
                        Role = @role, 
                        FullName = @fullName
                    WHERE Username = @username
                `);
            console.log('✅ Updated staff user');
        } else {
            await pool.request()
                .input('username', sql.NVarChar, 'staff')
                .input('passwordHash', sql.NVarChar, staffHash)
                .input('role', sql.NVarChar, 'staff')
                .input('fullName', sql.NVarChar, 'Staff Member')
                .query(`
                    INSERT INTO Users (Username, PasswordHash, Role, FullName)
                    VALUES (@username, @passwordHash, @role, @fullName)
                `);
            console.log('✅ Created staff user');
        }

        // List all users
        const allUsers = await pool.request()
            .query('SELECT Id, Username, Role, FullName FROM Users');
        
        console.log('\n📋 Users in database:');
        allUsers.recordset.forEach(u => {
            console.log(`   ${u.Id}: ${u.Username} (${u.Role}) - ${u.FullName}`);
        });

    } catch (err) {
        console.error('❌ Error:', err);
    }
}

createTestUser();