const { getConnection, sql } = require('./db/connection');

const setupAttendanceProcedures = async () => {
  try {
    const pool = await getConnection();
    
    console.log('Setting up attendance stored procedures...');
    
    // Create sp_AddOrUpdateAttendance procedure
    const addOrUpdateProcedure = `
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_AddOrUpdateAttendance')
        DROP PROCEDURE sp_AddOrUpdateAttendance
      GO
      
      CREATE PROCEDURE sp_AddOrUpdateAttendance
          @emp_id INT,
          @date DATE,
          @check_in TIME = NULL,
          @check_out TIME = NULL,
          @status VARCHAR(20) = 'Present',
          @notes VARCHAR(500) = NULL
      AS
      BEGIN
          SET NOCOUNT ON;
          
          DECLARE @hours_worked DECIMAL(4,2) = 0;
          
          -- Calculate hours worked if both check_in and check_out are provided
          IF @check_in IS NOT NULL AND @check_out IS NOT NULL
          BEGIN
              SET @hours_worked = DATEDIFF(MINUTE, @check_in, @check_out) / 60.0;
          END
          
          -- Check if record exists
          IF EXISTS (SELECT 1 FROM TblAttendance WHERE emp_id = @emp_id AND date = @date)
          BEGIN
              -- Update existing record
              UPDATE TblAttendance 
              SET check_in = @check_in,
                  check_out = @check_out,
                  status = @status,
                  hours_worked = @hours_worked,
                  notes = @notes,
                  updated_at = GETDATE()
              WHERE emp_id = @emp_id AND date = @date;
              
              SELECT 'Attendance updated successfully' as message;
          END
          ELSE
          BEGIN
              -- Insert new record
              INSERT INTO TblAttendance (emp_id, date, check_in, check_out, status, hours_worked, notes)
              VALUES (@emp_id, @date, @check_in, @check_out, @status, @hours_worked, @notes);
              
              SELECT 'Attendance added successfully' as message;
          END
      END
    `;

    // Create sp_GetAttendanceByDate procedure
    const getByDateProcedure = `
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetAttendanceByDate')
        DROP PROCEDURE sp_GetAttendanceByDate
      GO
      
      CREATE PROCEDURE sp_GetAttendanceByDate
          @date DATE
      AS
      BEGIN
          SET NOCOUNT ON;
          
          SELECT 
              a.attendance_id,
              a.emp_id,
              a.date,
              a.check_in,
              a.check_out,
              a.status,
              a.hours_worked,
              a.notes,
              ed.name as employee_name,
              d.name as department_name,
              des.title as designation_title
          FROM TblAttendance a
          INNER JOIN TblEmpM e ON a.emp_id = e.emp_id
          INNER JOIN TblEmpS ed ON e.emp_det_id = ed.emp_det_id
          INNER JOIN TblSections s ON e.section_id = s.section_id
          INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
          INNER JOIN TblDesignations des ON e.desig_id = des.desig_id
          WHERE a.date = @date
          ORDER BY ed.name;
      END
    `;

    // Create sp_GetAttendanceStats procedure
    const getStatsProcedure = `
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetAttendanceStats')
        DROP PROCEDURE sp_GetAttendanceStats
      GO
      
      CREATE PROCEDURE sp_GetAttendanceStats
          @date DATE
      AS
      BEGIN
          SET NOCOUNT ON;
          
          SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
              SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent,
              SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late,
              SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) as half_day
          FROM TblAttendance 
          WHERE date = @date;
      END
    `;

    // Create sp_DeleteAttendance procedure
    const deleteProcedure = `
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_DeleteAttendance')
        DROP PROCEDURE sp_DeleteAttendance
      GO
      
      CREATE PROCEDURE sp_DeleteAttendance
          @attendance_id INT
      AS
      BEGIN
          SET NOCOUNT ON;
          
          DELETE FROM TblAttendance WHERE attendance_id = @attendance_id;
          
          SELECT 'Attendance record deleted successfully' as message;
      END
    `;

    // Create sp_GetEmployeeAttendanceReport procedure
    const getReportProcedure = `
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetEmployeeAttendanceReport')
        DROP PROCEDURE sp_GetEmployeeAttendanceReport
      GO
      
      CREATE PROCEDURE sp_GetEmployeeAttendanceReport
          @emp_id INT,
          @start_date DATE = NULL,
          @end_date DATE = NULL
      AS
      BEGIN
          SET NOCOUNT ON;
          
          SELECT 
              a.attendance_id,
              a.date,
              a.check_in,
              a.check_out,
              a.status,
              a.hours_worked,
              a.notes,
              ed.name as employee_name,
              d.name as department_name
          FROM TblAttendance a
          INNER JOIN TblEmpM e ON a.emp_id = e.emp_id
          INNER JOIN TblEmpS ed ON e.emp_det_id = ed.emp_det_id
          INNER JOIN TblSections s ON e.section_id = s.section_id
          INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
          WHERE a.emp_id = @emp_id
          AND (@start_date IS NULL OR a.date >= @start_date)
          AND (@end_date IS NULL OR a.date <= @end_date)
          ORDER BY a.date DESC;
      END
    `;

    // Execute each procedure creation
    const procedures = [
      { name: 'sp_AddOrUpdateAttendance', sql: addOrUpdateProcedure },
      { name: 'sp_GetAttendanceByDate', sql: getByDateProcedure },
      { name: 'sp_GetAttendanceStats', sql: getStatsProcedure },
      { name: 'sp_DeleteAttendance', sql: deleteProcedure },
      { name: 'sp_GetEmployeeAttendanceReport', sql: getReportProcedure }
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

    console.log('Attendance stored procedures setup completed!');

  } catch (error) {
    console.error('Error setting up attendance procedures:', error);
    throw error;
  }
};

// Run the setup if this file is executed directly
if (require.main === module) {
  setupAttendanceProcedures()
    .then(() => {
      console.log('Procedures setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Procedures setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupAttendanceProcedures };
