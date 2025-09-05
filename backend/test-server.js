const { getConnection } = require('./db/connection');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const pool = await getConnection();
    console.log('✓ Database connection successful!');
    console.log('✓ Pool connected:', pool.connected);
    
    // Test a simple query
    const result = await pool.request().query('SELECT @@VERSION as version, GETDATE() as currentTime');
    console.log('✓ Database query successful!');
    console.log('SQL Server version:', result.recordset[0].version.split('\n')[0]);
    console.log('Current time:', result.recordset[0].currentTime);
    
    // Test employee table
    const employeeCount = await pool.request().query('SELECT COUNT(*) as count FROM TblEmpS');
    console.log('✓ Employee table accessible!');
    console.log('Current employee count:', employeeCount.recordset[0].count);
    
    console.log('\n✅ All tests passed! Backend is ready to start.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.number) {
      console.error('SQL Error number:', error.number);
    }
    process.exit(1);
  }
}

testConnection();
