const { setupAttendanceTable } = require('./setup-attendance-table');
const { setupAttendanceProcedures } = require('./setup-attendance-procedures');

const setupAttendanceComplete = async () => {
  try {
    console.log('🚀 Starting complete attendance system setup...\n');
    
    // Step 1: Setup table
    console.log('Step 1: Setting up TblAttendance table...');
    await setupAttendanceTable();
    console.log('✅ Table setup completed\n');
    
    // Step 2: Setup stored procedures
    console.log('Step 2: Setting up stored procedures...');
    await setupAttendanceProcedures();
    console.log('✅ Stored procedures setup completed\n');
    
    console.log('🎉 Complete attendance system setup finished successfully!');
    console.log('\nThe attendance system is now ready to use with:');
    console.log('- ✅ TblAttendance table with proper structure');
    console.log('- ✅ All required indexes for performance');
    console.log('- ✅ Foreign key constraints');
    console.log('- ✅ All stored procedures for CRUD operations');
    console.log('\nYou can now:');
    console.log('- Mark employee attendance');
    console.log('- View attendance records by date');
    console.log('- Get attendance statistics');
    console.log('- Generate attendance reports');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
};

// Run the complete setup if this file is executed directly
if (require.main === module) {
  setupAttendanceComplete()
    .then(() => {
      console.log('\n✨ Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupAttendanceComplete };
