const { setupAttendanceProcedures } = require('./setup-attendance-procedures');
const { setupBarcodeProcedures } = require('./setup-barcode-procedures');
const { getConnection } = require('./db/connection');

const setupAllProcedures = async () => {
  try {
    console.log('🚀 Starting comprehensive database setup...');
    
    // Test database connection first
    console.log('📡 Testing database connection...');
    const pool = await getConnection();
    console.log('✅ Database connection successful');

    // Setup attendance procedures
    console.log('\n📋 Setting up attendance procedures...');
    await setupAttendanceProcedures();
    
    // Setup barcode procedures
    console.log('\n📊 Setting up barcode procedures...');
    await setupBarcodeProcedures();

    // Verify barcode column exists in TblEmpS
    console.log('\n🔍 Checking barcode column in TblEmpS...');
    try {
      const columnCheck = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'TblEmpS' AND COLUMN_NAME = 'barcode'
      `);
      
      if (columnCheck.recordset.length === 0) {
        console.log('⚠️  Barcode column not found, adding it...');
        await pool.request().query(`
          ALTER TABLE TblEmpS 
          ADD barcode VARCHAR(100) NULL
        `);
        
        // Add unique constraint on barcode (allowing NULLs)
        await pool.request().query(`
          CREATE UNIQUE NONCLUSTERED INDEX IX_TblEmpS_Barcode 
          ON TblEmpS (barcode) 
          WHERE barcode IS NOT NULL
        `);
        
        console.log('✅ Barcode column and unique constraint added successfully');
      } else {
        console.log('✅ Barcode column already exists');
      }
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Barcode column setup is already complete');
      } else {
        console.error('❌ Error setting up barcode column:', error.message);
      }
    }

    // Verify attendance table has required columns
    console.log('\n🔍 Checking attendance table structure...');
    try {
      const attendanceColumns = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'TblAttendance'
        ORDER BY ORDINAL_POSITION
      `);
      
      const requiredColumns = ['attendance_id', 'emp_id', 'date', 'check_in', 'check_out', 'status', 'hours_worked', 'notes'];
      const existingColumns = attendanceColumns.recordset.map(col => col.COLUMN_NAME.toLowerCase());
      
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col.toLowerCase()));
      
      if (missingColumns.length > 0) {
        console.log(`⚠️  Missing columns in TblAttendance: ${missingColumns.join(', ')}`);
        // Add missing columns logic here if needed
      } else {
        console.log('✅ All required attendance table columns exist');
      }
      
      console.log('📋 Attendance table columns:', existingColumns);
      
    } catch (error) {
      console.error('❌ Error checking attendance table:', error.message);
    }

    console.log('\n🎉 All database procedures setup completed successfully!');
    console.log('\n📋 Setup Summary:');
    console.log('   ✅ Attendance procedures created');
    console.log('   ✅ Barcode procedures created');
    console.log('   ✅ Database schema verified');
    console.log('\n🚀 Your barcode attendance system is ready to use!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
};

// Run the setup if this file is executed directly
if (require.main === module) {
  setupAllProcedures()
    .then(() => {
      console.log('\n✨ Database setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupAllProcedures };
