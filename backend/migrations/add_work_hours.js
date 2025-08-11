const { getConnection, sql } = require('../db/connection');

async function addWorkHoursFields() {
  try {
    const pool = await getConnection();
    
    console.log('Adding work_start_time and work_end_time fields to TblEmpM table...');
    
    // Add work hours fields to TblEmpM table (editable information)
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'TblEmpM' AND COLUMN_NAME = 'work_start_time'
      )
      BEGIN
        ALTER TABLE TblEmpM 
        ADD work_start_time TIME DEFAULT '09:00:00' NOT NULL;
      END
    `);
    
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'TblEmpM' AND COLUMN_NAME = 'work_end_time'
      )
      BEGIN
        ALTER TABLE TblEmpM 
        ADD work_end_time TIME DEFAULT '17:00:00' NOT NULL;
      END
    `);
    
    console.log('Work hours fields added successfully!');
    
    // Update existing records to have default work hours (9 AM - 5 PM)
    await pool.request().query(`
      UPDATE TblEmpM 
      SET work_start_time = '09:00:00', work_end_time = '17:00:00'
      WHERE work_start_time IS NULL OR work_end_time IS NULL;
    `);
    
    console.log('Updated existing records with default work hours (9 AM - 5 PM)');
    
  } catch (error) {
    console.error('Error adding work hours fields:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  addWorkHoursFields()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addWorkHoursFields };
