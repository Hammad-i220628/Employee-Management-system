const { getConnection, sql } = require('./db/connection.js');

async function checkData() {
  try {
    console.log('Connecting to database...');
    const pool = await getConnection();
    console.log('Connected successfully!');
    console.log('Checking existing data in TblEmpS...');
    
    // Check for specific records that are causing the conflict
    const result = await pool.request().query(`
      SELECT emp_det_id, name, cnic, email 
      FROM TblEmpS 
      WHERE cnic = '98765-1234567-1' OR email = 'hammad@gmail.com' OR name = 'hammad'
    `);
    
    if (result.recordset.length > 0) {
      console.log('Found existing records:');
      result.recordset.forEach((record, index) => {
        console.log(`Record ${index + 1}:`, record);
      });
    } else {
      console.log('No existing records found with that CNIC, email, or name.');
    }
    
    // Also check the total count of employees
    const countResult = await pool.request().query('SELECT COUNT(*) as total FROM TblEmpS');
    console.log(`Total employees in TblEmpS: ${countResult.recordset[0].total}`);
    
    // Show all employees
    const allEmployees = await pool.request().query('SELECT * FROM TblEmpS ORDER BY emp_det_id');
    console.log('\nAll employees:');
    allEmployees.recordset.forEach(emp => {
      console.log(`ID: ${emp.emp_det_id}, Name: ${emp.name}, CNIC: ${emp.cnic}, Email: ${emp.email}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Database check failed:', error.message);
    if (error.number) {
      console.error('Error number:', error.number);
    }
    process.exit(1);
  }
}

checkData();
