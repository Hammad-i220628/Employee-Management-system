const { getConnection, sql } = require('../db/connection');

// Get all employees with related data
const getAllEmployees = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT 
          e.emp_id, e.name, e.cnic, e.type, e.status,
          d.name as department_name,
          s.name as section_name,
          des.title as designation_title,
          r.name as role_name
        FROM Employees e
        JOIN Departments d ON e.dept_id = d.dept_id
        JOIN Sections s ON e.section_id = s.section_id
        JOIN Designations des ON e.desig_id = des.desig_id
        JOIN Roles r ON e.role_id = r.role_id
        ORDER BY e.emp_id
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single employee
const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('emp_id', sql.Int, id)
      .query(`
        SELECT 
          e.emp_id, e.name, e.cnic, e.type, e.status,
          e.dept_id, e.section_id, e.desig_id, e.role_id,
          d.name as department_name,
          s.name as section_name,
          des.title as designation_title,
          r.name as role_name
        FROM Employees e
        JOIN Departments d ON e.dept_id = d.dept_id
        JOIN Sections s ON e.section_id = s.section_id
        JOIN Designations des ON e.desig_id = des.desig_id
        JOIN Roles r ON e.role_id = r.role_id
        WHERE e.emp_id = @emp_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add new employee
const addEmployee = async (req, res) => {
  try {
    const { name, cnic, dept_id, section_id, desig_id, role_id, type } = req.body;

    if (!name || !cnic || !dept_id || !section_id || !desig_id || !role_id || !type) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['fixed', 'editable'].includes(type)) {
      return res.status(400).json({ message: 'Type must be either "fixed" or "editable"' });
    }

    const pool = await getConnection();
    // Validate section belongs to department
    const sectionCheck = await pool.request()
      .input('section_id', sql.Int, section_id)
      .query('SELECT dept_id FROM Sections WHERE section_id = @section_id');
    console.log('dept_id:', dept_id, typeof dept_id);
    console.log('section_id:', section_id, typeof section_id);
    console.log('sectionCheck:', sectionCheck.recordset);
    if (!sectionCheck.recordset.length || Number(sectionCheck.recordset[0].dept_id) !== Number(dept_id)) {
      return res.status(400).json({ message: 'Section does not belong to the selected department.' });
    }

    await pool.request()
      .input('name', sql.VarChar(100), name)
      .input('cnic', sql.VarChar(15), cnic)
      .input('dept_id', sql.Int, dept_id)
      .input('section_id', sql.Int, section_id)
      .input('desig_id', sql.Int, desig_id)
      .input('role_id', sql.Int, role_id)
      .input('type', sql.VarChar(10), type)
      .execute('sp_AddEmployee');

    res.status(201).json({ message: 'Employee added successfully' });
  } catch (error) {
    if (error.number === 2627) {
      return res.status(400).json({ message: 'CNIC already exists' });
    }
    console.error('Add employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, cnic, dept_id, section_id, desig_id, role_id } = req.body;

    if (!name || !cnic || !dept_id || !section_id || !desig_id || !role_id) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const pool = await getConnection();
    // Validate section belongs to department
    const sectionCheck = await pool.request()
      .input('section_id', sql.Int, section_id)
      .query('SELECT dept_id FROM Sections WHERE section_id = @section_id');
    if (!sectionCheck.recordset.length || sectionCheck.recordset[0].dept_id !== dept_id) {
      return res.status(400).json({ message: 'Section does not belong to the selected department.' });
    }

    await pool.request()
      .input('user_email', sql.VarChar(100), req.user.email)
      .input('emp_id', sql.Int, id)
      .input('name', sql.VarChar(100), name)
      .input('cnic', sql.VarChar(15), cnic)
      .input('dept_id', sql.Int, dept_id)
      .input('section_id', sql.Int, section_id)
      .input('desig_id', sql.Int, desig_id)
      .input('role_id', sql.Int, role_id)
      .execute('sp_UpdateEmployee');

    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    if (error.message && error.message.includes('Fixed employee name and CNIC cannot be changed')) {
      return res.status(400).json({ message: error.message });
    }
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete employee
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('emp_id', sql.Int, id)
      .query('DELETE FROM Employees WHERE emp_id = @emp_id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllEmployees,
  getEmployee,
  addEmployee,
  updateEmployee,
  deleteEmployee
}; 