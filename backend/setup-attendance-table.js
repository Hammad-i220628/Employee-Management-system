const { getConnection, sql } = require('./db/connection');

const setupAttendanceTable = async () => {
  try {
    const pool = await getConnection();
    
    console.log('Setting up TblAttendance table...');
    
    // Create TblAttendance table if it doesn't exist
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TblAttendance' AND xtype='U')
      BEGIN
        CREATE TABLE TblAttendance (
          attendance_id INT PRIMARY KEY IDENTITY(1,1),
          emp_id INT NOT NULL,
          date DATE NOT NULL,
          check_in TIME,
          check_out TIME,
          status VARCHAR(20) NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Late', 'Half Day')),
          hours_worked DECIMAL(4,2) DEFAULT 0,
          notes VARCHAR(500),
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE(),
          CONSTRAINT UQ_EmpAttendance_Date UNIQUE(emp_id, date)
        );
        PRINT 'TblAttendance table created successfully';
      END
      ELSE
      BEGIN
        PRINT 'TblAttendance table already exists';
      END
    `;

    await pool.request().query(createTableQuery);

    // Create indexes for better performance
    const createIndexQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Attendance_Date_EmpId' AND object_id = OBJECT_ID('TblAttendance'))
      BEGIN
        CREATE INDEX IX_Attendance_Date_EmpId ON TblAttendance(date, emp_id);
        PRINT 'Index IX_Attendance_Date_EmpId created successfully';
      END
      ELSE
      BEGIN
        PRINT 'Index IX_Attendance_Date_EmpId already exists';
      END
    `;

    await pool.request().query(createIndexQuery);

    const createStatusIndexQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Attendance_Status' AND object_id = OBJECT_ID('TblAttendance'))
      BEGIN
        CREATE INDEX IX_Attendance_Status ON TblAttendance(status);
        PRINT 'Index IX_Attendance_Status created successfully';
      END
      ELSE
      BEGIN
        PRINT 'Index IX_Attendance_Status already exists';
      END
    `;

    await pool.request().query(createStatusIndexQuery);

    // Verify foreign key constraint with TblEmpM
    const checkForeignKeyQuery = `
      IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TblAttendance_TblEmpM')
      AND EXISTS (SELECT * FROM sysobjects WHERE name='TblEmpM' AND xtype='U')
      BEGIN
        ALTER TABLE TblAttendance
        ADD CONSTRAINT FK_TblAttendance_TblEmpM
        FOREIGN KEY (emp_id) REFERENCES TblEmpM(emp_id);
        PRINT 'Foreign key constraint added successfully';
      END
      ELSE
      BEGIN
        PRINT 'Foreign key constraint already exists or TblEmpM table not found';
      END
    `;

    await pool.request().query(checkForeignKeyQuery);

    console.log('Attendance table setup completed successfully');
    
    // Test the table by checking its structure
    const testQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TblAttendance'
      ORDER BY ORDINAL_POSITION
    `;
    
    const result = await pool.request().query(testQuery);
    console.log('TblAttendance table structure:');
    console.table(result.recordset);

  } catch (error) {
    console.error('Error setting up attendance table:', error);
    throw error;
  }
};

// Run the setup if this file is executed directly
if (require.main === module) {
  setupAttendanceTable()
    .then(() => {
      console.log('Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupAttendanceTable };
