const { getConnection, sql } = require('../db/connection');

// Get attendance records for a specific date
const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const pool = await getConnection();

    // Try stored procedure first, if it fails, use direct query
    try {
      const result = await pool.request()
        .input('date', sql.Date, date)
        .execute('sp_GetAttendanceByDate');
      
      res.json(result.recordset);
    } catch (procError) {
      console.log('Stored procedure not found, using direct query:', procError.message);
      
      // Fallback to direct query using correct table names from SQL file
      const result = await pool.request()
        .input('date', sql.Date, date)
        .query(`
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
          ORDER BY ed.name
        `);
      
      res.json(result.recordset);
    }
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ message: 'Failed to fetch attendance records' });
  }
};

// Add or update attendance record
const addOrUpdateAttendance = async (req, res) => {
  try {
    const { emp_id, date, status, notes } = req.body;
    const pool = await getConnection();

    console.log('Attendance data:', { emp_id, date, status });

    // Try stored procedure first, if it fails, use direct query
    try {
      const result = await pool.request()
        .input('emp_id', sql.Int, emp_id)
        .input('date', sql.Date, date)
        .input('check_in', sql.Time, null)
        .input('check_out', sql.Time, null)
        .input('status', sql.VarChar, status)
        .input('notes', sql.VarChar, notes || null)
        .execute('sp_AddOrUpdateAttendance');

      console.log('Procedure result:', result.recordset);
      res.json({ message: result.recordset[0]?.message || 'Attendance saved successfully' });
    } catch (procError) {
      console.log('Stored procedure not found, using direct query:', procError.message);
      
      // No hours calculation needed since we're not tracking time
      const hours_worked = 0;
      
      // Check if record exists
      const existsResult = await pool.request()
        .input('emp_id', sql.Int, emp_id)
        .input('date', sql.Date, date)
        .query('SELECT COUNT(*) as count FROM TblAttendance WHERE emp_id = @emp_id AND date = @date');
      
      const recordExists = existsResult.recordset[0].count > 0;
      
      if (recordExists) {
        // Update existing record
        await pool.request()
          .input('emp_id', sql.Int, emp_id)
          .input('date', sql.Date, date)
          .input('status', sql.VarChar, status)
          .input('notes', sql.VarChar, notes || null)
          .query(`
            UPDATE TblAttendance 
            SET status = @status,
                notes = @notes,
                updated_at = GETDATE()
            WHERE emp_id = @emp_id AND date = @date
          `);
        
        res.json({ message: 'Attendance updated successfully' });
      } else {
        // Insert new record
        await pool.request()
          .input('emp_id', sql.Int, emp_id)
          .input('date', sql.Date, date)
          .input('status', sql.VarChar, status)
          .input('notes', sql.VarChar, notes || null)
          .query(`
            INSERT INTO TblAttendance (emp_id, date, status, notes)
            VALUES (@emp_id, @date, @status, @notes)
          `);
        
        res.json({ message: 'Attendance added successfully' });
      }
    }
  } catch (error) {
    console.error('Error adding/updating attendance:', error);
    console.error('Error details:', error.message, error.number, error.state, error.procedure);
    
    if (error.number === 2627) { // Unique constraint violation
      res.status(400).json({ message: 'Attendance record already exists for this employee on this date' });
    } else if (error.number === 547) { // Foreign key constraint violation
      res.status(400).json({ message: 'Invalid employee ID. Employee not found in system.' });
    } else if (error.number === 8152) { // String or binary data truncation
      res.status(400).json({ message: 'Invalid data provided. Check field lengths.' });
    } else {
      res.status(500).json({ message: 'Failed to save attendance record: ' + error.message });
    }
  }
};

// Get attendance statistics for a specific date
const getAttendanceStats = async (req, res) => {
  try {
    const { date } = req.params;
    const pool = await getConnection();

    // Try stored procedure first, if it fails, use direct query
    try {
      const result = await pool.request()
        .input('date', sql.Date, date)
        .execute('sp_GetAttendanceStats');

      res.json(result.recordset[0]);
    } catch (procError) {
      console.log('Stored procedure not found, using direct query:', procError.message);
      
      // Fallback to direct query using correct table names from SQL file
      const result = await pool.request()
        .input('date', sql.Date, date)
        .query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late,
            SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) as half_day
          FROM TblAttendance 
          WHERE date = @date
        `);
      
      res.json(result.recordset[0] || { total: 0, present: 0, absent: 0, late: 0, half_day: 0 });
    }
  } catch (error) {
    console.error('Error fetching attendance statistics:', error);
    res.status(500).json({ message: 'Failed to fetch attendance statistics' });
  }
};

// Delete attendance record
const deleteAttendance = async (req, res) => {
  try {
    const { attendance_id } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('attendance_id', sql.Int, attendance_id)
      .execute('sp_DeleteAttendance');

    res.json({ message: result.recordset[0]?.message || 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({ message: 'Failed to delete attendance record' });
  }
};

// Get attendance report for an employee
const getEmployeeAttendanceReport = async (req, res) => {
  try {
    const { emp_id } = req.params;
    const { start_date, end_date } = req.query;
    const pool = await getConnection();

    const request = pool.request()
      .input('emp_id', sql.Int, emp_id);
    
    if (start_date) {
      request.input('start_date', sql.Date, start_date);
    }
    
    if (end_date) {
      request.input('end_date', sql.Date, end_date);
    }

    const result = await request.execute('sp_GetEmployeeAttendanceReport');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching employee attendance report:', error);
    res.status(500).json({ message: 'Failed to fetch attendance report' });
  }
};

module.exports = {
  getAttendanceByDate,
  addOrUpdateAttendance,
  getAttendanceStats,
  deleteAttendance,
  getEmployeeAttendanceReport
};
