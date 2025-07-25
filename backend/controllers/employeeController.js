const { getConnection, sql } = require('../db/connection');

// Get all employees with related data
const getAllEmployees = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT * FROM vw_EmployeeDetails
        ORDER BY emp_id
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
        SELECT * FROM vw_EmployeeDetails
        WHERE emp_id = @emp_id
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

// Add new employee - only creates EmployeeDetails record
const addEmployee = async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    const { name, cnic, start_date } = req.body;

    console.log('Extracted fields:', { name, cnic, start_date });

    if (!name || !cnic || !start_date) {
      console.log('Validation failed - missing fields');
      return res.status(400).json({ message: 'Name, CNIC, and starting date are required' });
    }

    const pool = await getConnection();
    console.log('Database connection established');

    // Only add employee details (name, cnic, start_date)
    console.log('Executing stored procedure with:', { name, cnic, start_date });
    const empDetailsResult = await pool.request()
      .input('name', sql.VarChar(100), name)
      .input('cnic', sql.VarChar(15), cnic)
      .input('start_date', sql.Date, start_date)
      .execute('sp_AddEmployeeDetails');

    console.log('Stored procedure result:', empDetailsResult);
    const emp_det_id = empDetailsResult.recordset[0].emp_det_id;

    res.status(201).json({ 
      message: 'Employee details added successfully. Assignment to department, role, and designation can be done later.',
      emp_det_id: emp_det_id
    });
  } catch (error) {
    if (error.number === 2627) {
      return res.status(400).json({ message: 'CNIC already exists' });
    }
    console.error('Add employee error:', error);
    console.error('Error details:', {
      message: error.message,
      number: error.number,
      state: error.state,
      class: error.class,
      serverName: error.serverName,
      procName: error.procName,
      lineNumber: error.lineNumber
    });
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { section_id, desig_id, role_id } = req.body;

    console.log('Update employee request:', { id, section_id, desig_id, role_id });

    if (!section_id || !desig_id || !role_id) {
      return res.status(400).json({ message: 'Section, designation, and role are required' });
    }

    // Cannot update employee with emp_id = 0 (unassigned employees)
    if (id === '0') {
      return res.status(400).json({ message: 'Cannot update unassigned employee. Use assign endpoint instead.' });
    }

    const pool = await getConnection();
    
    // Check if employee exists
    const empCheck = await pool.request()
      .input('emp_id', sql.Int, id)
      .query('SELECT emp_id FROM Employees WHERE emp_id = @emp_id');
    
    if (!empCheck.recordset.length) {
      return res.status(404).json({ message: 'Employee assignment not found' });
    }

    // Validate section exists
    const sectionCheck = await pool.request()
      .input('section_id', sql.Int, section_id)
      .query('SELECT section_id FROM Sections WHERE section_id = @section_id');
    if (!sectionCheck.recordset.length) {
      return res.status(400).json({ message: 'Invalid section selected.' });
    }

    await pool.request()
      .input('user_email', sql.VarChar(100), req.user.email)
      .input('emp_id', sql.Int, id)
      .input('section_id', sql.Int, section_id)
      .input('desig_id', sql.Int, desig_id)
      .input('role_id', sql.Int, role_id)
      .execute('sp_UpdateEmployee');

    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Delete employee
const deleteEmployee = async (req, res) => {
  try {
    const { id, emp_det_id } = req.params;
    const pool = await getConnection();
    
    console.log('Attempting to delete employee with ID:', id, 'or emp_det_id:', emp_det_id);
    
    let employee;
    
    // If emp_det_id is provided (from /det/:emp_det_id route)
    if (emp_det_id) {
      const employeeCheck = await pool.request()
        .input('emp_det_id', sql.Int, emp_det_id)
        .query('SELECT * FROM vw_EmployeeDetails WHERE emp_det_id = @emp_det_id');
      
      if (employeeCheck.recordset.length === 0) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      employee = employeeCheck.recordset[0];
    } else {
      // Regular deletion by emp_id
      if (id === '0') {
        return res.status(400).json({ message: 'Cannot delete unassigned employee using emp_id 0. Use emp_det_id instead.' });
      }
      
      const employeeCheck = await pool.request()
        .input('emp_id', sql.Int, id)
        .query('SELECT * FROM vw_EmployeeDetails WHERE emp_id = @emp_id');
      
      if (employeeCheck.recordset.length === 0) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      employee = employeeCheck.recordset[0];
    }
    
    console.log('Found employee:', employee);
    
    let deletedRows = 0;
    
    // If employee has assignments (emp_id > 0), delete from Employees table first
    if (employee.emp_id > 0) {
      const empResult = await pool.request()
        .input('emp_id', sql.Int, employee.emp_id)
        .query('DELETE FROM Employees WHERE emp_id = @emp_id');
      deletedRows += empResult.rowsAffected[0];
      console.log('Deleted from Employees table:', empResult.rowsAffected[0]);
    }
    
    // Always delete from EmployeeDetails table using emp_det_id
    const empDetResult = await pool.request()
      .input('emp_det_id', sql.Int, employee.emp_det_id)
      .query('DELETE FROM EmployeeDetails WHERE emp_det_id = @emp_det_id');
    deletedRows += empDetResult.rowsAffected[0];
    console.log('Deleted from EmployeeDetails table:', empDetResult.rowsAffected[0]);

    if (deletedRows === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Get unassigned employees (only EmployeeDetails without assignments)
const getUnassignedEmployees = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT ed.emp_det_id, ed.name, ed.cnic, ed.start_date
        FROM EmployeeDetails ed
        LEFT JOIN Employees e ON e.emp_det_id = ed.emp_det_id
        WHERE e.emp_det_id IS NULL
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Get unassigned employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Assign employee to department, section, role, and designation
const assignEmployee = async (req, res) => {
  try {
    const { emp_det_id } = req.params;
    const { section_id, desig_id, role_id, type = 'editable' } = req.body;

    if (!section_id || !desig_id || !role_id) {
      return res.status(400).json({ message: 'Section, designation, and role are required' });
    }

    const pool = await getConnection();
    
    // Check if employee details exist
    const empDetailsCheck = await pool.request()
      .input('emp_det_id', sql.Int, emp_det_id)
      .query('SELECT emp_det_id FROM EmployeeDetails WHERE emp_det_id = @emp_det_id');
    
    if (!empDetailsCheck.recordset.length) {
      return res.status(404).json({ message: 'Employee details not found' });
    }

    // Check if already assigned
    const assignedCheck = await pool.request()
      .input('emp_det_id', sql.Int, emp_det_id)
      .query('SELECT emp_id FROM Employees WHERE emp_det_id = @emp_det_id');
    
    if (assignedCheck.recordset.length > 0) {
      return res.status(400).json({ message: 'Employee is already assigned' });
    }

    // Validate section exists
    const sectionCheck = await pool.request()
      .input('section_id', sql.Int, section_id)
      .query('SELECT section_id FROM Sections WHERE section_id = @section_id');
    
    if (!sectionCheck.recordset.length) {
      return res.status(400).json({ message: 'Invalid section selected.' });
    }

    // Assign employee
    await pool.request()
      .input('emp_det_id', sql.Int, emp_det_id)
      .input('section_id', sql.Int, section_id)
      .input('desig_id', sql.Int, desig_id)
      .input('role_id', sql.Int, role_id)
      .input('type', sql.VarChar(10), type)
      .execute('sp_AddEmployee');

    res.json({ message: 'Employee assigned successfully' });
  } catch (error) {
    console.error('Assign employee error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = {
  getAllEmployees,
  getEmployee,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getUnassignedEmployees,
  assignEmployee
};
