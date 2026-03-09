// backend/update-users.js
const bcrypt = require('bcryptjs');
const { getPool, connectDB, sql } = require('./config/db');

async function updateUsers() {
    try {
        await connectDB();
        const pool = getPool();

        // Hash passwords
        const adminHash = await bcrypt.hash('admin123', 10);
        const staffHash = await bcrypt.hash('staff123', 10);
        const managerHash = await bcrypt.hash('manager123', 10);

        // Check if users exist and update/insert
        const users = [
            { username: 'admin', password: adminHash, role: 'admin', fullName: 'Administrator' },
            { username: 'staff1', password: staffHash, role: 'staff', fullName: 'Staff One' },
            { username: 'staff2', password: staffHash, role: 'staff', fullName: 'Staff Two' },
            { username: 'manager', password: managerHash, role: 'manager', fullName: 'Manager' }
        ];

        for (const user of users) {
            // Check if user exists
            const checkResult = await pool.request()
                .input('username', sql.NVarChar, user.username)
                .query('SELECT Id FROM Users WHERE Username = @username');

            if (checkResult.recordset.length > 0) {
                // Update existing user
                await pool.request()
                    .input('username', sql.NVarChar, user.username)
                    .input('passwordHash', sql.NVarChar, user.password)
                    .input('role', sql.NVarChar, user.role)
                    .input('fullName', sql.NVarChar, user.fullName)
                    .query(`
                        UPDATE Users 
                        SET PasswordHash = @passwordHash, 
                            Role = @role, 
                            FullName = @fullName
                        WHERE Username = @username
                    `);
                console.log(`✅ Updated user: ${user.username}`);
            } else {
                // Insert new user
                await pool.request()
                    .input('username', sql.NVarChar, user.username)
                    .input('passwordHash', sql.NVarChar, user.password)
                    .input('role', sql.NVarChar, user.role)
                    .input('fullName', sql.NVarChar, user.fullName)
                    .query(`
                        INSERT INTO Users (Username, PasswordHash, Role, FullName)
                        VALUES (@username, @passwordHash, @role, @fullName)
                    `);
                console.log(`✅ Created user: ${user.username}`);
            }
        }

        console.log('🎉 All users updated successfully!');
        
        // Show all users
        const allUsers = await pool.request()
            .query('SELECT Id, Username, Role, FullName FROM Users');
        
        console.log('\n📋 Current users in database:');
        allUsers.recordset.forEach(u => {
            console.log(`   ${u.Id}: ${u.Username} (${u.Role}) - ${u.FullName}`);
        });

    } catch (err) {
        console.error('❌ Error updating users:', err);
    }
}

updateUsers();