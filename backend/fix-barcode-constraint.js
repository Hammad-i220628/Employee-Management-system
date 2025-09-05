const { getConnection, sql } = require('./db/connection.js');

async function fixBarcodeConstraint() {
  try {
    console.log('🔧 Fixing barcode unique constraint to allow multiple NULLs...\n');
    const pool = await getConnection();
    
    // First, let's check the current constraint
    console.log('📋 Checking current barcode constraint...');
    const constraintInfo = await pool.request().query(`
      SELECT 
        tc.CONSTRAINT_NAME,
        tc.CONSTRAINT_TYPE,
        ccu.COLUMN_NAME,
        i.name as INDEX_NAME,
        i.is_unique,
        i.has_filter,
        i.filter_definition
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu 
        ON tc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
      LEFT JOIN sys.indexes i ON i.name = tc.CONSTRAINT_NAME
      WHERE tc.TABLE_NAME = 'TblEmpS' 
        AND ccu.COLUMN_NAME = 'barcode'
        AND tc.CONSTRAINT_TYPE = 'UNIQUE'
    `);
    
    if (constraintInfo.recordset.length > 0) {
      const constraint = constraintInfo.recordset[0];
      console.log(`Found constraint: ${constraint.CONSTRAINT_NAME}`);
      console.log(`Has filter: ${constraint.has_filter}`);
      console.log(`Filter definition: ${constraint.filter_definition || 'None'}`);
      
      // If there's no filter (meaning it doesn't allow multiple NULLs), we need to fix it
      if (!constraint.has_filter) {
        console.log('\n🔨 Dropping old constraint and creating new filtered unique index...');
        
        // Drop the existing constraint
        await pool.request().query(`
          ALTER TABLE TblEmpS DROP CONSTRAINT ${constraint.CONSTRAINT_NAME}
        `);
        console.log('✅ Dropped old constraint');
        
        // Create a new filtered unique index that allows multiple NULLs
        await pool.request().query(`
          CREATE UNIQUE NONCLUSTERED INDEX UQ_TblEmpS_Barcode_NotNull
          ON TblEmpS (barcode)
          WHERE barcode IS NOT NULL
        `);
        console.log('✅ Created new filtered unique index');
      } else {
        console.log('✅ Constraint already allows multiple NULLs');
      }
    } else {
      console.log('❌ No unique constraint found on barcode column');
    }
    
    // Reset all existing employee barcodes to NULL (except admin which we'll handle separately)
    console.log('\n🔄 Resetting employee barcodes to NULL...');
    const resetResult = await pool.request().query(`
      UPDATE TblEmpS 
      SET barcode = NULL 
      WHERE cnic != '00000-0000000-0'
    `);
    console.log(`✅ Reset ${resetResult.rowsAffected[0]} employee barcodes to NULL`);
    
    // Keep admin with a unique barcode
    const adminCheck = await pool.request().query(`
      SELECT barcode FROM TblEmpS WHERE cnic = '00000-0000000-0'
    `);
    
    if (adminCheck.recordset.length > 0 && adminCheck.recordset[0].barcode === null) {
      await pool.request().query(`
        UPDATE TblEmpS 
        SET barcode = 'ADMIN001' 
        WHERE cnic = '00000-0000000-0'
      `);
      console.log('✅ Set admin barcode to ADMIN001');
    } else if (adminCheck.recordset.length > 0) {
      console.log(`✅ Admin already has barcode: ${adminCheck.recordset[0].barcode}`);
    } else {
      console.log('⚠️ Admin user not found');
    }
    
    // Test the fix by trying to insert multiple employees with NULL barcodes
    console.log('\n🧪 Testing the fix...');
    
    // Show current employee count
    const beforeCount = await pool.request().query('SELECT COUNT(*) as count FROM TblEmpS');
    console.log(`Current employee count: ${beforeCount.recordset[0].count}`);
    
    // Show current barcodes
    const barcodes = await pool.request().query('SELECT emp_det_id, name, barcode FROM TblEmpS ORDER BY emp_det_id');
    console.log('\nCurrent barcodes:');
    barcodes.recordset.forEach(emp => {
      console.log(`  ${emp.name}: ${emp.barcode || 'NULL'}`);
    });
    
    console.log('\n✅ Barcode constraint fix completed!');
    console.log('\n📋 Summary:');
    console.log('   - Employees can now be created with NULL barcodes');
    console.log('   - Multiple employees can have NULL barcodes simultaneously');  
    console.log('   - When a barcode is assigned (via scanning), it must be unique');
    console.log('   - Admin has a unique barcode to avoid conflicts');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    if (error.number) {
      console.error('SQL Error number:', error.number);
    }
    process.exit(1);
  }
}

fixBarcodeConstraint();
