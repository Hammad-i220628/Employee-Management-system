const { getConnection, sql } = require('../db/connection');

// Get employee dashboard data based on logged-in user
const getEmployeeDashboard = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const pool = await getConnection();
    
    // Get employee dashboard data
    const result = await pool.request()
      .input('email', sql.VarChar(100), userEmail)
      .query(`
        SELECT 
          e.emp_id,
          ed.emp_det_id,
          ed.name,
          ed.cnic,
          ed.start_date,
          ed.email,
          COALESCE(e.status, 'Unassigned') as status,
          COALESCE(CONVERT(varchar(8), e.work_start_time, 108), '09:00:00') as work_start_time,
          COALESCE(CONVERT(varchar(8), e.work_end_time, 108), '17:00:00') as work_end_time,
          COALESCE(d.name, 'Not Assigned') as department_name,
          COALESCE(s.name, 'Not Assigned') as section_name,
          COALESCE(des.title, 'Not Assigned') as designation_title,
          COALESCE(r.name, 'Employee') as role_name
        FROM TblEmpS ed
        LEFT JOIN TblEmpM e ON ed.emp_det_id = e.emp_det_id
        LEFT JOIN TblSections s ON e.section_id = s.section_id
        LEFT JOIN TblDepartments d ON s.dept_id = d.dept_id
        LEFT JOIN TblDesignations des ON e.desig_id = des.desig_id
        LEFT JOIN TblRoles r ON des.role_id = r.role_id
        WHERE ed.email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Employee data not found' });
    }

    const employeeData = result.recordset[0];
    
    // Format the response
    const dashboardData = {
      emp_id: employeeData.emp_id, // Add emp_id for leave applications
      emp_det_id: employeeData.emp_det_id,
      name: employeeData.name,
      cnic: employeeData.cnic,
      start_date: employeeData.start_date,
      status: employeeData.status,
      work_start_time: employeeData.work_start_time,
      work_end_time: employeeData.work_end_time,
      department_name: employeeData.department_name,
      section_name: employeeData.section_name,
      designation_title: employeeData.designation_title,
      role_name: employeeData.role_name,
      email: employeeData.email
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Get employee dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get admin dashboard stats
const getAdminDashboard = async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Get various statistics
    const [employeesCount, departmentsCount, sectionsCount, unassignedCount] = await Promise.all([
      pool.request().query('SELECT COUNT(*) as count FROM TblEmpM'),
      pool.request().query('SELECT COUNT(*) as count FROM TblDepartments'),
      pool.request().query('SELECT COUNT(*) as count FROM TblSections'),
      pool.request().query(`
        SELECT COUNT(*) as count 
        FROM TblEmpS ed 
        LEFT JOIN TblEmpM e ON e.emp_det_id = ed.emp_det_id 
        WHERE e.emp_det_id IS NULL
      `)
    ]);

    const stats = {
      totalEmployees: employeesCount.recordset[0].count,
      totalDepartments: departmentsCount.recordset[0].count,
      totalSections: sectionsCount.recordset[0].count,
      unassignedEmployees: unassignedCount.recordset[0].count
    };

    res.json(stats);
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getEmployeeDashboard,
  getAdminDashboard
};
