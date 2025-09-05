const { getConnection, sql } = require('./db/connection.js');

async function restoreReferenceData() {
  try {
    console.log('🔧 Restoring missing reference data...\n');
    const pool = await getConnection();
    
    // Check what's missing
    console.log('📋 Checking current reference data...');
    
    const deptCount = await pool.request().query('SELECT COUNT(*) as count FROM TblDepartments');
    const sectionCount = await pool.request().query('SELECT COUNT(*) as count FROM TblSections');
    const roleCount = await pool.request().query('SELECT COUNT(*) as count FROM TblRoles');
    const desigCount = await pool.request().query('SELECT COUNT(*) as count FROM TblDesignations');
    const userCount = await pool.request().query('SELECT COUNT(*) as count FROM TblUsers');
    
    console.log(`Departments: ${deptCount.recordset[0].count}`);
    console.log(`Sections: ${sectionCount.recordset[0].count}`);
    console.log(`Roles: ${roleCount.recordset[0].count}`);
    console.log(`Designations: ${desigCount.recordset[0].count}`);
    console.log(`Users: ${userCount.recordset[0].count}`);
    
    console.log('\n🔄 Restoring reference data...');
    
    // Insert Departments if missing
    if (deptCount.recordset[0].count === 0) {
      await pool.request().query(`
        INSERT INTO TblDepartments (name) VALUES 
        ('HR'), ('IT'), ('Finance')
      `);
      console.log('✅ Departments restored');
    } else {
      console.log('✅ Departments already exist');
    }
    
    // Insert Sections if missing
    if (sectionCount.recordset[0].count === 0) {
      await pool.request().query(`
        INSERT INTO TblSections (name, dept_id) VALUES 
        ('Recruitment', 1), 
        ('Employee Relations', 1),
        ('Software Development', 2), 
        ('IT Support', 2),
        ('Accounts Payable', 3), 
        ('Budgeting & Planning', 3)
      `);
      console.log('✅ Sections restored');
    } else {
      console.log('✅ Sections already exist');
    }
    
    // Insert Roles if missing
    if (roleCount.recordset[0].count === 0) {
      await pool.request().query(`
        INSERT INTO TblRoles (name) VALUES 
        ('Employee'), ('HR')
      `);
      console.log('✅ Roles restored');
    } else {
      console.log('✅ Roles already exist');
    }
    
    // Insert Designations if missing
    if (desigCount.recordset[0].count === 0) {
      await pool.request().query(`
        INSERT INTO TblDesignations (title, role_id) VALUES 
        ('Software Engineer', 1),
        ('Accounts Executive', 1),
        ('HR Manager', 2),
        ('Recruitment Officer', 2)
      `);
      console.log('✅ Designations restored');
    } else {
      console.log('✅ Designations already exist');
    }
    
    // Insert Admin User if missing
    if (userCount.recordset[0].count === 0) {
      await pool.request().query(`
        INSERT INTO TblUsers (username, email, password_hash, role)
        VALUES ('admin', 'admin@gmail.com', '$2b$10$IctalKBt74Nny6Ysz.wUT.SFoLIWX0J4rJx9Shz5fEJ8CXvCqVJAq', 'Admin')
      `);
      console.log('✅ Admin user restored');
      
      // Also restore admin employee details if needed
      const adminEmpCheck = await pool.request().query(`
        SELECT COUNT(*) as count FROM TblEmpS WHERE email = 'admin@gmail.com'
      `);
      
      if (adminEmpCheck.recordset[0].count === 0) {
        await pool.request().query(`
          INSERT INTO TblEmpS (name, cnic, start_date, email, barcode)
          VALUES ('admin', '00000-0000000-0', '2024-01-01', 'admin@gmail.com', 'ADMIN001')
        `);
        
        // Get the admin emp_det_id
        const adminDetails = await pool.request().query(`
          SELECT emp_det_id FROM TblEmpS WHERE email = 'admin@gmail.com'
        `);
        
        if (adminDetails.recordset.length > 0) {
          await pool.request().query(`
            INSERT INTO TblEmpM (emp_det_id, section_id, desig_id, type, work_start_time, work_end_time, salary, bonus)
            VALUES (${adminDetails.recordset[0].emp_det_id}, 1, 3, 'fixed', '09:00:00', '17:00:00', 50000.00, 0.00)
          `);
          console.log('✅ Admin employee details restored');
        }
      }
    } else {
      console.log('✅ Admin user already exists');
    }
    
    // Verify the restoration
    console.log('\n📊 Final counts:');
    const finalDeptCount = await pool.request().query('SELECT COUNT(*) as count FROM TblDepartments');
    const finalSectionCount = await pool.request().query('SELECT COUNT(*) as count FROM TblSections');
    const finalRoleCount = await pool.request().query('SELECT COUNT(*) as count FROM TblRoles');
    const finalDesigCount = await pool.request().query('SELECT COUNT(*) as count FROM TblDesignations');
    const finalUserCount = await pool.request().query('SELECT COUNT(*) as count FROM TblUsers');
    const finalEmpCount = await pool.request().query('SELECT COUNT(*) as count FROM TblEmpS');
    
    console.log(`Departments: ${finalDeptCount.recordset[0].count}`);
    console.log(`Sections: ${finalSectionCount.recordset[0].count}`);
    console.log(`Roles: ${finalRoleCount.recordset[0].count}`);
    console.log(`Designations: ${finalDesigCount.recordset[0].count}`);
    console.log(`Users: ${finalUserCount.recordset[0].count}`);
    console.log(`Employees: ${finalEmpCount.recordset[0].count}`);
    
    console.log('\n✅ Reference data restoration completed!');
    console.log('\n🎉 The system is now ready for employee creation with barcode scanning!');
    console.log('\nKey points:');
    console.log('- ✅ Barcode constraint fixed - multiple employees can have NULL barcodes');
    console.log('- ✅ Employees can be created without barcodes initially');
    console.log('- ✅ Barcodes can be scanned and assigned later via the barcode API');
    console.log('- ✅ Once assigned, barcodes must be unique');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Restoration failed:', error.message);
    process.exit(1);
  }
}

restoreReferenceData();
