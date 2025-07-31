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
        SELECT * FROM vw_EmployeeDashboard 
        WHERE email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Employee data not found' });
    }

    const employeeData = result.recordset[0];
    
    // Format the response
    const dashboardData = {
      name: employeeData.name,
      cnic: employeeData.cnic,
      start_date: employeeData.start_date,
      status: employeeData.status,
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
      pool.request().query('SELECT COUNT(*) as count FROM Employees'),
      pool.request().query('SELECT COUNT(*) as count FROM Departments'),
      pool.request().query('SELECT COUNT(*) as count FROM Sections'),
      pool.request().query(`
        SELECT COUNT(*) as count 
        FROM EmployeeDetails ed 
        LEFT JOIN Employees e ON e.emp_det_id = ed.emp_det_id 
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
