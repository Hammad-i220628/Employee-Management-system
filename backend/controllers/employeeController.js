const { getConnection, sql } = require('../db/connection');

// Get all employees with related data (both assigned and unassigned)
const getAllEmployees = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT 
          COALESCE(e.emp_id, 0) as emp_id,
          ed.emp_det_id,
          ed.name,
          ed.cnic,
          ed.start_date,
          ed.email,
          COALESCE(e.type, 'unassigned') as type,
          COALESCE(e.status, 'Unassigned') as status,
          COALESCE(e.section_id, 0) as section_id,
          COALESCE(e.desig_id, 0) as desig_id,
          COALESCE(e.role_id, 0) as role_id,
          COALESCE(s.dept_id, 0) as dept_id,
          COALESCE(d.name, 'Not Assigned') as department_name,
          COALESCE(s.name, 'Not Assigned') as section_name,
          COALESCE(des.title, 'Not Assigned') as designation_title,
          COALESCE(r.name, 'Employee') as role_name
        FROM EmployeeDetails ed
        LEFT JOIN Employees e ON ed.emp_det_id = e.emp_det_id
        LEFT JOIN Sections s ON e.section_id = s.section_id
        LEFT JOIN Departments d ON s.dept_id = d.dept_id
        LEFT JOIN Designations des ON e.desig_id = des.desig_id
        LEFT JOIN Roles r ON e.role_id = r.role_id
        ORDER BY ed.emp_det_id
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

// Add new employee - creates EmployeeDetails record and user account
const addEmployee = async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    const { name, cnic, start_date, email, password } = req.body;

    console.log('Extracted fields:', { name, cnic, start_date, email });

    if (!name || !cnic || !start_date || !email || !password) {
      console.log('Validation failed - missing fields');
      return res.status(400).json({ message: 'Name, CNIC, starting date, email, and password are required' });
    }

    const pool = await getConnection();
    console.log('Database connection established');

    // Hash the password
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Start transaction
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Add employee details (name, cnic, start_date, email)
      console.log('Executing stored procedure with:', { name, cnic, start_date, email });
      const empDetailsResult = await transaction.request()
        .input('name', sql.VarChar(100), name)
        .input('cnic', sql.VarChar(15), cnic)
        .input('start_date', sql.Date, start_date)
        .input('email', sql.VarChar(100), email)
        .execute('sp_AddEmployeeDetails');

      console.log('Stored procedure result:', empDetailsResult);
      const emp_det_id = empDetailsResult.recordset[0].emp_det_id;
      
      // Create user account for employee
      await transaction.request()
        .input('emp_det_id', sql.Int, emp_det_id)
        .input('email', sql.VarChar(100), email)
        .input('password_hash', sql.VarChar(255), password_hash)
        .execute('sp_AddEmployeeUser');
      
      // Commit transaction
      await transaction.commit();

      res.status(201).json({ 
        message: 'Employee added successfully with login credentials. Assignment to department, role, and designation can be done later.',
        emp_det_id: emp_det_id
      });
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    if (error.number === 2627) {
      return res.status(400).json({ message: 'CNIC or Email already exists' });
    }
    console.error('Add employee error:', error);
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
        .query(`
          SELECT 
            COALESCE(e.emp_id, 0) as emp_id,
            ed.emp_det_id,
            ed.name,
            ed.email
          FROM EmployeeDetails ed
          LEFT JOIN Employees e ON ed.emp_det_id = e.emp_det_id
          WHERE ed.emp_det_id = @emp_det_id
        `);
      
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
        .query(`
          SELECT 
            e.emp_id,
            ed.emp_det_id,
            ed.name,
            ed.email
          FROM Employees e
          INNER JOIN EmployeeDetails ed ON e.emp_det_id = ed.emp_det_id
          WHERE e.emp_id = @emp_id
        `);
      
      if (employeeCheck.recordset.length === 0) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      employee = employeeCheck.recordset[0];
    }
    
    console.log('Found employee:', employee);
    
    // Start transaction for safe deletion
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // If employee has assignments (emp_id > 0), delete related records first
      if (employee.emp_id > 0) {
        // Delete from LeaveApplications table first (foreign key constraint)
        await transaction.request()
          .input('emp_id', sql.Int, employee.emp_id)
          .query('DELETE FROM LeaveApplications WHERE emp_id = @emp_id');
        console.log('Deleted related leave applications');
        
        // Delete from Employees table
        await transaction.request()
          .input('emp_id', sql.Int, employee.emp_id)
          .query('DELETE FROM Employees WHERE emp_id = @emp_id');
        console.log('Deleted from Employees table');
      }
      
      // Delete from EmployeeDetails table using emp_det_id
      await transaction.request()
        .input('emp_det_id', sql.Int, employee.emp_det_id)
        .query('DELETE FROM EmployeeDetails WHERE emp_det_id = @emp_det_id');
      console.log('Deleted from EmployeeDetails table');
      
      // Commit the transaction
      await transaction.commit();
      
      res.json({ message: 'Employee deleted successfully' });
    } catch (transactionError) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('Delete employee error:', error);
    if (error.number === 547) { // Foreign key constraint error
      res.status(400).json({ 
        message: 'Cannot delete employee due to existing dependencies. Please remove all related records first.' 
      });
    } else {
      res.status(500).json({ message: 'Server error: ' + error.message });
    }
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
