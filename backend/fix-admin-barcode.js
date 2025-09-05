const { getConnection, sql } = require('./db/connection.js');

async function fixAdminBarcode() {
  try {
    console.log('🔧 Fixing admin user barcode...\n');
    const pool = await getConnection();
    
    // Update admin user to have a unique barcode instead of NULL
    const adminBarcode = 'ADMIN' + String(Date.now()).slice(-6);
    
    const result = await pool.request()
      .input('barcode', sql.VarChar(100), adminBarcode)
      .query(`
        UPDATE TblEmpS 
        SET barcode = @barcode 
        WHERE cnic = '00000-0000000-0' AND email = 'admin@gmail.com'
      `);
    
    console.log(`✅ Admin user barcode updated to: ${adminBarcode}`);
    console.log(`Rows affected: ${result.rowsAffected[0]}`);
    
    // Verify the change
    const verification = await pool.request().query('SELECT emp_det_id, name, email, barcode FROM TblEmpS WHERE cnic = \'00000-0000000-0\'');
    console.log('\n📊 Admin user details after update:');
    console.log(verification.recordset[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
}

fixAdminBarcode();
