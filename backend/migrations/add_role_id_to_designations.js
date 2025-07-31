// Set the correct path for config.env
require('dotenv').config({ path: '../config.env' });
const { getConnection, sql } = require('../db/connection');

async function addRoleIdToDesignations() {
  try {
    const pool = await getConnection();
    
    console.log('Adding role_id column to Designations table...');
    
    // Check if the column already exists
    const columnCheck = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Designations' AND COLUMN_NAME = 'role_id'
    `);
    
    if (columnCheck.recordset.length === 0) {
      // Add the role_id column
      await pool.request().query(`
        ALTER TABLE Designations 
        ADD role_id INT NULL
      `);
      
      // Add foreign key constraint
      await pool.request().query(`
        ALTER TABLE Designations 
        ADD CONSTRAINT FK_Designations_Roles 
        FOREIGN KEY (role_id) REFERENCES Roles(role_id)
      `);
      
      console.log('Successfully added role_id column to Designations table');
    } else {
      console.log('role_id column already exists in Designations table');
    }
    
  } catch (error) {
    console.error('Error adding role_id column to Designations:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addRoleIdToDesignations()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addRoleIdToDesignations };
