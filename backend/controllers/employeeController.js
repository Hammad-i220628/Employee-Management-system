const { getConnection, sql } = require('../db/connection');

// Helper function to convert time string to proper format for SQL Server TIME parameter
const parseTimeToDate = (timeString, defaultHour = 9, defaultMinute = 0) => {
  if (!timeString) {
    // Create a specific date object at midnight UTC + time offset
    const date = new Date(2000, 0, 1);
    date.setUTCHours(defaultHour, defaultMinute, 0, 0);
    return date;
  }
  
  // Remove any whitespace
  timeString = timeString.trim();
  
  // Parse different time formats
  let hours = defaultHour;
  let minutes = defaultMinute;
  
  // Parse HH:MM:SS format
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeString)) {
    const parts = timeString.split(':');
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
  } else {
    console.warn(`Invalid time format received: ${timeString}, using default: ${defaultHour}:${String(defaultMinute).padStart(2, '0')}`);
  }
  
  // Create Date object using UTC methods to avoid timezone issues
  const date = new Date(2000, 0, 1);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
};

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
          COALESCE(des.role_id, 0) as role_id,
          COALESCE(s.dept_id, 0) as dept_id,
          COALESCE(CONVERT(varchar(8), e.work_start_time, 108), '09:00:00') as work_start_time,
          COALESCE(CONVERT(varchar(8), e.work_end_time, 108), '17:00:00') as work_end_time,
          COALESCE(e.salary, 50000.00) as salary,
          COALESCE(e.bonus, 0.00) as bonus,
          COALESCE(d.name, 'Not Assigned') as department_name,
          COALESCE(s.name, 'Not Assigned') as section_name,
          COALESCE(des.title, 'Not Assigned') as designation_title,
          COALESCE(r.name, 'Not Assigned') as role_name
        FROM TblEmpS ed
        LEFT JOIN TblEmpM e ON ed.emp_det_id = e.emp_det_id
        LEFT JOIN TblSections s ON e.section_id = s.section_id
        LEFT JOIN TblDepartments d ON s.dept_id = d.dept_id
        LEFT JOIN TblDesignations des ON e.desig_id = des.desig_id
        LEFT JOIN TblRoles r ON des.role_id = r.role_id
        WHERE ed.email != 'admin@gmail.com' AND ed.cnic != '00000-0000000-0'
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

// Add new employee - creates employee details and optionally user account
const addEmployee = async (req, res) => {
  let transaction = null;
  try {
    console.log('Received request body:', req.body);
    const { name, cnic, start_date, email, password, section_id, desig_id, type, salary, bonus } = req.body;

      console.log('Extracted fields:', { name, cnic, start_date, email, section_id, desig_id, type, salary, bonus });

    if (!name || !cnic || !start_date || !email) {
      console.log('Validation failed - missing required fields');
      return res.status(400).json({ message: 'Name, CNIC, start date, and email are required' });
    }

    const pool = await getConnection();
    console.log('Database connection established');
    
    // Ensure pool is connected
    if (!pool.connected) {
      throw new Error('Database connection not available');
    }

    // Start transaction
    transaction = new sql.Transaction(pool);
    
    try {
      console.log('Starting transaction...');
      await transaction.begin();
      console.log('Transaction started successfully');
      
      // Add employee details (name, cnic, start_date, email)
      console.log('Adding employee details with:', { name, cnic, start_date, email });
      const empDetailsResult = await transaction.request()
        .input('name', sql.VarChar(100), name)
        .input('cnic', sql.VarChar(15), cnic)
        .input('start_date', sql.Date, start_date)
        .input('email', sql.VarChar(100), email)
        .query(`
          INSERT INTO TblEmpS (name, cnic, start_date, email)
          VALUES (@name, @cnic, @start_date, @email);
          SELECT SCOPE_IDENTITY() AS emp_det_id;
        `);

      console.log('Employee details added:', empDetailsResult);
      const emp_det_id = empDetailsResult.recordset[0].emp_det_id;
      
      // If section_id and desig_id are provided, create assignment in TblEmpM
      let emp_id = null;
      if (section_id && desig_id) {
        const assignmentResult = await transaction.request()
          .input('emp_det_id', sql.Int, emp_det_id)
          .input('section_id', sql.Int, section_id)
          .input('desig_id', sql.Int, desig_id)
          .input('type', sql.VarChar(10), type || 'editable')
          .input('salary', sql.Decimal(10, 2), salary || 50000.00)
          .input('bonus', sql.Decimal(10, 2), bonus || 0.00)
          .query(`
            INSERT INTO TblEmpM (emp_det_id, section_id, desig_id, type, status, salary, bonus)
            VALUES (@emp_det_id, @section_id, @desig_id, @type, 'Active', @salary, @bonus);
            SELECT SCOPE_IDENTITY() AS emp_id;
          `);
        
        emp_id = assignmentResult.recordset[0].emp_id;
        console.log('Employee assignment created with emp_id:', emp_id);
      }
      
      // Create user account if password is provided
      if (password) {
        const bcrypt = require('bcrypt');
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        
        // Generate username from email (part before @)
        const username = email.split('@')[0];
        
        await transaction.request()
          .input('username', sql.VarChar(50), username)
          .input('email', sql.VarChar(100), email)
          .input('password_hash', sql.VarChar(255), password_hash)
          .input('role', sql.VarChar(20), 'Employee')
          .query(`
            INSERT INTO TblUsers (username, email, password_hash, role)
            VALUES (@username, @email, @password_hash, @role)
          `);
        
        console.log('User account created for:', email);
      }
      
      // Commit transaction
      await transaction.commit();

      res.status(201).json({ 
        message: password 
          ? 'Employee added successfully with login credentials' 
          : 'Employee added successfully. Assignment and login credentials can be set up later.',
        emp_det_id: emp_det_id,
        emp_id: emp_id
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

// Update employee - handles both personal info and assignment updates
const updateEmployee = async (req, res) => {
  let transaction = null;
  try {
    const { id } = req.params;
    const { name, email, section_id, desig_id, type, work_start_time, work_end_time, salary, bonus } = req.body;

    console.log('Update employee request:', { id, name, email, section_id, desig_id, type, work_start_time, work_end_time, salary, bonus });

    const pool = await getConnection();
    
    // Ensure pool is connected
    if (!pool.connected) {
      throw new Error('Database connection not available');
    }
    
    transaction = new sql.Transaction(pool);
    
    try {
      console.log('Starting transaction...');
      await transaction.begin();
      console.log('Transaction started successfully');
      
      // Determine if this is updating by emp_id (assignment) or emp_det_id (personal info)
      let emp_det_id;
      let emp_id;
      
      // If id is emp_id (assignment update)
      if (section_id || desig_id) {
        // Check if employee assignment exists
        const empCheck = await transaction.request()
          .input('emp_id', sql.Int, id)
          .query('SELECT emp_det_id, emp_id FROM TblEmpM WHERE emp_id = @emp_id');
        
        if (!empCheck.recordset.length) {
          return res.status(404).json({ message: 'Employee assignment not found' });
        }
        
        emp_det_id = empCheck.recordset[0].emp_det_id;
        emp_id = empCheck.recordset[0].emp_id;
        
        // Update assignment in TblEmpM
        if (section_id && desig_id) {
          // Validate section exists
          const sectionCheck = await transaction.request()
            .input('section_id', sql.Int, section_id)
            .query('SELECT section_id FROM TblSections WHERE section_id = @section_id');
          if (!sectionCheck.recordset.length) {
            return res.status(400).json({ message: 'Invalid section selected.' });
          }
          
          // Validate designation exists
          const desigCheck = await transaction.request()
            .input('desig_id', sql.Int, desig_id)
            .query('SELECT desig_id FROM TblDesignations WHERE desig_id = @desig_id');
          if (!desigCheck.recordset.length) {
            return res.status(400).json({ message: 'Invalid designation selected.' });
          }
          
          let updateQuery = 'UPDATE TblEmpM SET section_id = @section_id, desig_id = @desig_id, type = @type';
          const request = transaction.request()
            .input('emp_id', sql.Int, emp_id)
            .input('section_id', sql.Int, section_id)
            .input('desig_id', sql.Int, desig_id)
            .input('type', sql.VarChar(10), type || 'editable');
          
          // Only update work hours if explicitly provided
          if (work_start_time !== undefined && work_start_time !== null) {
            updateQuery += ', work_start_time = @work_start_time';
            const startTime = parseTimeToDate(work_start_time, 9, 0);
            console.log('Updating start time:', work_start_time, '->', startTime);
            request.input('work_start_time', sql.Time, startTime);
          }
          
          if (work_end_time !== undefined && work_end_time !== null) {
            updateQuery += ', work_end_time = @work_end_time';
            const endTime = parseTimeToDate(work_end_time, 17, 0);
            console.log('Updating end time:', work_end_time, '->', endTime);
            request.input('work_end_time', sql.Time, endTime);
          }
          
          // Only update salary if explicitly provided
          if (salary !== undefined && salary !== null) {
            updateQuery += ', salary = @salary';
            console.log('Updating salary:', salary);
            request.input('salary', sql.Decimal(10, 2), parseFloat(salary));
          }
          
          // Only update bonus if explicitly provided
          if (bonus !== undefined && bonus !== null) {
            updateQuery += ', bonus = @bonus';
            console.log('Updating bonus:', bonus);
            request.input('bonus', sql.Decimal(10, 2), parseFloat(bonus));
          }
          
          updateQuery += ' WHERE emp_id = @emp_id';
          
          await request.query(updateQuery);
          
          // Force status to remain 'Active' after the update (overrides trigger)
          await transaction.request()
            .input('emp_id', sql.Int, emp_id)
            .query(`
              UPDATE TblEmpM 
              SET status = 'Active'
              WHERE emp_id = @emp_id
            `);
        }
      } else {
        // This is updating personal info by emp_det_id
        emp_det_id = id;
        
        // Check if employee details exist
        const empDetailsCheck = await transaction.request()
          .input('emp_det_id', sql.Int, emp_det_id)
          .query('SELECT emp_det_id FROM TblEmpS WHERE emp_det_id = @emp_det_id');
        
        if (!empDetailsCheck.recordset.length) {
          return res.status(404).json({ message: 'Employee not found' });
        }
      }
      
      // Update personal information in TblEmpS if provided
      if (name || email) {
        let updateQuery = 'UPDATE TblEmpS SET ';
        const updateFields = [];
        const request = transaction.request().input('emp_det_id', sql.Int, emp_det_id);
        
        if (name) {
          updateFields.push('name = @name');
          request.input('name', sql.VarChar(100), name);
        }
        
        if (email) {
          updateFields.push('email = @email');
          request.input('email', sql.VarChar(100), email);
        }
        
        updateQuery += updateFields.join(', ') + ' WHERE emp_det_id = @emp_det_id';
        
        await request.query(updateQuery);
      }
      
      await transaction.commit();
      res.json({ message: 'Employee updated successfully' });
      
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Delete employee
const deleteEmployee = async (req, res) => {
  let transaction = null;
  try {
    const { id, emp_det_id } = req.params;
    const { forceDelete } = req.body; // Optional flag to force admin deletion
    const pool = await getConnection();
    
    // Ensure pool is connected
    if (!pool.connected) {
      throw new Error('Database connection not available');
    }
    
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
            ed.email,
            ed.cnic,
            COALESCE(e.type, 'unassigned') as type
          FROM TblEmpS ed
          LEFT JOIN TblEmpM e ON ed.emp_det_id = e.emp_det_id
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
            ed.email,
            ed.cnic,
            e.type
          FROM TblEmpM e
          INNER JOIN TblEmpS ed ON e.emp_det_id = ed.emp_det_id
          WHERE e.emp_id = @emp_id
        `);
      
      if (employeeCheck.recordset.length === 0) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      employee = employeeCheck.recordset[0];
    }
    
    // Admin protection removed - admin can be deleted like any other employee
    
    console.log('Found employee:', employee);
    
    // Start transaction for safe deletion
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      console.log('Transaction started for employee deletion');
      
      // Delete in the correct order to avoid foreign key constraints
      
      // 1. Delete from TblUsers table first (user login)
      await transaction.request()
        .input('email', sql.VarChar(100), employee.email)
        .query('DELETE FROM TblUsers WHERE email = @email');
      console.log('Deleted from TblUsers table');
      
      // 2. Delete from TblEmpM table if employee has assignments
      if (employee.emp_id > 0) {
        await transaction.request()
          .input('emp_id', sql.Int, employee.emp_id)
          .query('DELETE FROM TblEmpM WHERE emp_id = @emp_id');
        console.log('Deleted from TblEmpM table');
      }
      
      // 3. Finally delete from TblEmpS table (employee details)
      await transaction.request()
        .input('emp_det_id', sql.Int, employee.emp_det_id)
        .query('DELETE FROM TblEmpS WHERE emp_det_id = @emp_det_id');
      console.log('Deleted from TblEmpS table');
      
      // Commit the transaction
      await transaction.commit();
      console.log('Transaction committed successfully');
      
      res.json({ message: 'Employee deleted successfully' });
    } catch (transactionError) {
      console.error('Transaction error during deletion:', transactionError);
      try {
        await transaction.rollback();
        console.log('Transaction rolled back');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
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
        FROM TblEmpS ed
        LEFT JOIN TblEmpM e ON e.emp_det_id = ed.emp_det_id
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
  let transaction = null;
  try {
    const { emp_det_id } = req.params;
    const { section_id, desig_id, role_id, type = 'editable', work_start_time, work_end_time, salary, bonus } = req.body;
    console.log('Assign employee request:', { emp_det_id, section_id, desig_id, role_id, type, work_start_time, work_end_time, salary, bonus });

    if (!section_id || !desig_id || !role_id) {
      return res.status(400).json({ message: 'Section, designation, and role are required' });
    }

    const pool = await getConnection();
    
    // Ensure pool is connected
    if (!pool.connected) {
      throw new Error('Database connection not available');
    }
    
    // Check if employee details exist
    const empDetailsCheck = await pool.request()
      .input('emp_det_id', sql.Int, emp_det_id)
      .query('SELECT emp_det_id FROM TblEmpS WHERE emp_det_id = @emp_det_id');
    
    if (!empDetailsCheck.recordset.length) {
      return res.status(404).json({ message: 'Employee details not found' });
    }

    // Check if already assigned
    const assignedCheck = await pool.request()
      .input('emp_det_id', sql.Int, emp_det_id)
      .query('SELECT emp_id FROM TblEmpM WHERE emp_det_id = @emp_det_id');
    
    if (assignedCheck.recordset.length > 0) {
      return res.status(400).json({ message: 'Employee is already assigned' });
    }

    // Validate section exists
    const sectionCheck = await pool.request()
      .input('section_id', sql.Int, section_id)
      .query('SELECT section_id FROM TblSections WHERE section_id = @section_id');
    
    if (!sectionCheck.recordset.length) {
      return res.status(400).json({ message: 'Invalid section selected.' });
    }

    transaction = new sql.Transaction(pool);
    
    try {
      console.log('Starting transaction...');
      await transaction.begin();
      console.log('Transaction started successfully');
      
      // Assign employee
      let insertQuery = 'INSERT INTO TblEmpM (emp_det_id, section_id, desig_id, type, status';
      let valuesQuery = 'VALUES (@emp_det_id, @section_id, @desig_id, @type, \'Active\'';
      
      const request = transaction.request()
        .input('emp_det_id', sql.Int, emp_det_id)
        .input('section_id', sql.Int, section_id)
        .input('desig_id', sql.Int, desig_id)
        .input('type', sql.VarChar(10), type);
      
      // Always include work hours - they are NOT NULL in database
      insertQuery += ', work_start_time';
      valuesQuery += ', @work_start_time';
      const startTime = parseTimeToDate(work_start_time, 9, 0);
      console.log('Parsed start time for assignment:', work_start_time, '->', startTime);
      request.input('work_start_time', sql.Time, startTime);
      
      insertQuery += ', work_end_time';
      valuesQuery += ', @work_end_time';
      const endTime = parseTimeToDate(work_end_time, 17, 0);
      console.log('Parsed end time for assignment:', work_end_time, '->', endTime);
      request.input('work_end_time', sql.Time, endTime);
      
      // Always include salary and bonus - salary is NOT NULL in database
      insertQuery += ', salary';
      valuesQuery += ', @salary';
      const employeeSalary = salary || 50000.00;
      console.log('Parsed salary for assignment:', salary, '->', employeeSalary);
      request.input('salary', sql.Decimal(10, 2), employeeSalary);
      
      insertQuery += ', bonus';
      valuesQuery += ', @bonus';
      const employeeBonus = bonus || 0.00;
      console.log('Parsed bonus for assignment:', bonus, '->', employeeBonus);
      request.input('bonus', sql.Decimal(10, 2), employeeBonus);
      
      insertQuery += ') ' + valuesQuery + '); SELECT SCOPE_IDENTITY() AS emp_id;';
      
      const result = await request.query(insertQuery);
      
      const emp_id = result.recordset[0].emp_id;
      
      // Ensure status is 'Active' after assignment
      await transaction.request()
        .input('emp_id', sql.Int, emp_id)
        .query(`
          UPDATE TblEmpM 
          SET status = 'Active'
          WHERE emp_id = @emp_id
        `);
      
      await transaction.commit();
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

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
