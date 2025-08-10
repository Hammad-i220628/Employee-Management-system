const { getConnection, sql } = require('../db/connection');

const createAttendanceTable = async () => {
  try {
    const pool = await getConnection();
    
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='attendance' AND xtype='U')
      CREATE TABLE attendance (
        attendance_id INT IDENTITY(1,1) PRIMARY KEY,
        emp_id INT NOT NULL,
        date DATE NOT NULL,
        check_in TIME,
        check_out TIME,
        status VARCHAR(20) NOT NULL DEFAULT 'Present',
        hours_worked DECIMAL(4,2) DEFAULT 0,
        notes VARCHAR(500),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        UNIQUE(emp_id, date)
      )
    `;

    await pool.request().query(createTableQuery);
    console.log('Attendance table created successfully');

    // Add index for better performance
    const createIndexQuery = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_attendance_date_emp_id')
      CREATE INDEX IX_attendance_date_emp_id ON attendance(date, emp_id)
    `;

    await pool.request().query(createIndexQuery);
    console.log('Attendance table index created successfully');

  } catch (error) {
    console.error('Error creating attendance table:', error);
    throw error;
  }
};

// Run the migration if this file is executed directly
if (require.main === module) {
  createAttendanceTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createAttendanceTable };
