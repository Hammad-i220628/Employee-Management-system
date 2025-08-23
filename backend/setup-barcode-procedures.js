const { getConnection, sql } = require('./db/connection');

const setupBarcodeProcedures = async () => {
  try {
    const pool = await getConnection();
    
    console.log('Setting up barcode attendance stored procedures...');
    
    // Create sp_MarkAttendanceByBarcode procedure
    const markAttendanceByBarcodeProcedure = `
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_MarkAttendanceByBarcode')
        DROP PROCEDURE sp_MarkAttendanceByBarcode
      GO
      
      CREATE PROCEDURE sp_MarkAttendanceByBarcode
          @barcode VARCHAR(100),
          @date DATE
      AS
      BEGIN
          SET NOCOUNT ON;
          
          DECLARE @emp_id INT;
          DECLARE @employee_name VARCHAR(100);
          DECLARE @existing_status VARCHAR(20);
          
          -- Find employee by barcode
          SELECT TOP 1 
              @emp_id = e.emp_id,
              @employee_name = ed.name
          FROM TblEmpS ed
          INNER JOIN TblEmpM e ON ed.emp_det_id = e.emp_det_id
          WHERE ed.barcode = @barcode AND e.status = 'Active';
          
          -- Check if employee exists
          IF @emp_id IS NULL
          BEGIN
              SELECT 
                  0 as success,
                  'Employee not found or inactive. Please check the barcode and try again.' as message,
                  NULL as employee_name;
              RETURN;
          END
          
          -- Check if attendance already marked for today
          SELECT @existing_status = status 
          FROM TblAttendance 
          WHERE emp_id = @emp_id AND date = @date;
          
          IF @existing_status IS NOT NULL
          BEGIN
              SELECT 
                  0 as success,
                  'Attendance already marked for ' + @employee_name + ' with status: ' + @existing_status as message,
                  @employee_name as employee_name;
              RETURN;
          END
          
          -- Mark attendance as Present
          INSERT INTO TblAttendance (emp_id, date, status, check_in, notes)
          VALUES (@emp_id, @date, 'Present', CONVERT(TIME, GETDATE()), 'Marked via barcode scan');
          
          SELECT 
              1 as success,
              'Attendance successfully marked for ' + @employee_name as message,
              @employee_name as employee_name;
      END
    `;

    // Create sp_GetEmployeeByBarcode procedure
    const getEmployeeByBarcodeProcedure = `
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetEmployeeByBarcode')
        DROP PROCEDURE sp_GetEmployeeByBarcode
      GO
      
      CREATE PROCEDURE sp_GetEmployeeByBarcode
          @barcode VARCHAR(100)
      AS
      BEGIN
          SET NOCOUNT ON;
          
          SELECT 
              e.emp_id,
              ed.emp_det_id,
              ed.name,
              ed.email,
              ed.barcode,
              e.status,
              d.name as department_name,
              s.name as section_name,
              des.title as designation_title
          FROM TblEmpS ed
          INNER JOIN TblEmpM e ON ed.emp_det_id = e.emp_det_id
          INNER JOIN TblSections s ON e.section_id = s.section_id
          INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
          INNER JOIN TblDesignations des ON e.desig_id = des.desig_id
          WHERE ed.barcode = @barcode;
      END
    `;

    // Create sp_GenerateEmployeeBarcode procedure (if not exists)
    const generateBarcodeProcedure = `
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GenerateEmployeeBarcode')
        DROP PROCEDURE sp_GenerateEmployeeBarcode
      GO
      
      CREATE PROCEDURE sp_GenerateEmployeeBarcode
          @emp_det_id INT
      AS
      BEGIN
          SET NOCOUNT ON;
          
          DECLARE @barcode VARCHAR(20);
          DECLARE @emp_id INT;
          DECLARE @employee_name VARCHAR(100);
          
          -- Get employee info
          SELECT TOP 1 
              @emp_id = e.emp_id,
              @employee_name = ed.name
          FROM TblEmpS ed
          INNER JOIN TblEmpM e ON ed.emp_det_id = e.emp_det_id
          WHERE ed.emp_det_id = @emp_det_id;
          
          IF @emp_id IS NULL
          BEGIN
              SELECT 
                  NULL as barcode,
                  'Employee not found' as message;
              RETURN;
          END
          
          -- Generate barcode: EMP + emp_id + random 4 digits
          DECLARE @random_suffix INT = ABS(CHECKSUM(NEWID())) % 10000;
          SET @barcode = 'EMP' + RIGHT('000' + CAST(@emp_id as VARCHAR), 3) + RIGHT('000' + CAST(@random_suffix as VARCHAR), 4);
          
          -- Check if barcode already exists, regenerate if needed
          WHILE EXISTS (SELECT 1 FROM TblEmpS WHERE barcode = @barcode)
          BEGIN
              SET @random_suffix = ABS(CHECKSUM(NEWID())) % 10000;
              SET @barcode = 'EMP' + RIGHT('000' + CAST(@emp_id as VARCHAR), 3) + RIGHT('000' + CAST(@random_suffix as VARCHAR), 4);
          END
          
          -- Update employee record with barcode
          UPDATE TblEmpS 
          SET barcode = @barcode
          WHERE emp_det_id = @emp_det_id;
          
          SELECT 
              @barcode as barcode,
              'Barcode generated successfully for ' + @employee_name as message;
      END
    `;

    // Create sp_UpdateEmployeeBarcode procedure
    const updateBarcodeProcedure = `
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_UpdateEmployeeBarcode')
        DROP PROCEDURE sp_UpdateEmployeeBarcode
      GO
      
      CREATE PROCEDURE sp_UpdateEmployeeBarcode
          @emp_det_id INT,
          @barcode VARCHAR(100)
      AS
      BEGIN
          SET NOCOUNT ON;
          
          -- Check if barcode is already assigned to another employee
          IF EXISTS (SELECT 1 FROM TblEmpS WHERE barcode = @barcode AND emp_det_id != @emp_det_id)
          BEGIN
              RAISERROR('This barcode is already assigned to another employee', 16, 1);
              RETURN;
          END
          
          -- Update employee barcode
          UPDATE TblEmpS 
          SET barcode = @barcode
          WHERE emp_det_id = @emp_det_id;
          
          IF @@ROWCOUNT > 0
              SELECT 'Barcode updated successfully' as message;
          ELSE
              SELECT 'Employee not found' as message;
      END
    `;

    // Execute each procedure creation
    const procedures = [
      { name: 'sp_MarkAttendanceByBarcode', sql: markAttendanceByBarcodeProcedure },
      { name: 'sp_GetEmployeeByBarcode', sql: getEmployeeByBarcodeProcedure },
      { name: 'sp_GenerateEmployeeBarcode', sql: generateBarcodeProcedure },
      { name: 'sp_UpdateEmployeeBarcode', sql: updateBarcodeProcedure }
    ];

    for (const procedure of procedures) {
      try {
        // Split by GO and execute each batch
        const batches = procedure.sql.split(/\s+GO\s+/i).filter(batch => batch.trim());
        
        for (const batch of batches) {
          if (batch.trim()) {
            await pool.request().query(batch.trim());
          }
        }
        
        console.log(`✓ ${procedure.name} created successfully`);
      } catch (error) {
        console.error(`✗ Error creating ${procedure.name}:`, error.message);
      }
    }

    console.log('Barcode stored procedures setup completed!');

  } catch (error) {
    console.error('Error setting up barcode procedures:', error);
    throw error;
  }
};

// Run the setup if this file is executed directly
if (require.main === module) {
  setupBarcodeProcedures()
    .then(() => {
      console.log('Barcode procedures setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Barcode procedures setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupBarcodeProcedures };
