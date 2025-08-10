const { getConnection, sql } = require('../db/connection');

// DEPARTMENTS
const getAllDepartments = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query('SELECT * FROM TblDepartments ORDER BY name');
    res.json(result.recordset);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const pool = await getConnection();
    await pool.request()
      .input('name', sql.VarChar(100), name)
      .query('INSERT INTO TblDepartments (name) VALUES (@name)');

    res.status(201).json({ message: 'Department added successfully' });
  } catch (error) {
    console.error('Add department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('dept_id', sql.Int, id)
      .input('name', sql.VarChar(100), name)
      .query('UPDATE TblDepartments SET name = @name WHERE dept_id = @dept_id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json({ message: 'Department updated successfully' });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Check if department exists
    const deptCheck = await pool.request()
      .input('dept_id', sql.Int, id)
      .query('SELECT dept_id FROM TblDepartments WHERE dept_id = @dept_id');
    
    if (deptCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    // Start transaction for safe deletion
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Get all sections in this department
      const sectionsResult = await transaction.request()
        .input('dept_id', sql.Int, id)
        .query('SELECT section_id FROM TblSections WHERE dept_id = @dept_id');
      
      // For each section, delete employees and their related records
      for (const section of sectionsResult.recordset) {
        // Get all employees in this section
        const employeesResult = await transaction.request()
          .input('section_id', sql.Int, section.section_id)
          .query('SELECT emp_id, emp_det_id FROM TblEmpM WHERE section_id = @section_id');
        
        // Delete employees and their related records
        for (const employee of employeesResult.recordset) {
          // Delete from TblAttendance first (if exists)
          await transaction.request()
            .input('emp_id', sql.Int, employee.emp_id)
            .query('DELETE FROM TblAttendance WHERE emp_id = @emp_id');
          
          // Delete from TblEmpM table
          await transaction.request()
            .input('emp_id', sql.Int, employee.emp_id)
            .query('DELETE FROM TblEmpM WHERE emp_id = @emp_id');
          
          // Delete from TblEmpS table
          await transaction.request()
            .input('emp_det_id', sql.Int, employee.emp_det_id)
            .query('DELETE FROM TblEmpS WHERE emp_det_id = @emp_det_id');
        }
        
        // Delete the section
        await transaction.request()
          .input('section_id', sql.Int, section.section_id)
          .query('DELETE FROM TblSections WHERE section_id = @section_id');
      }
      
      // Finally delete the department
      const result = await transaction.request()
        .input('dept_id', sql.Int, id)
        .query('DELETE FROM TblDepartments WHERE dept_id = @dept_id');
      
      // Commit the transaction
      await transaction.commit();
      
      res.json({ message: 'Department and all related records deleted successfully' });
    } catch (transactionError) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('Delete department error:', error);
    if (error.number === 547) { // Foreign key constraint error
      res.status(400).json({ message: 'Cannot delete department due to existing dependencies' });
    } else {
      res.status(500).json({ message: 'Server error: ' + error.message });
    }
  }
};

// SECTIONS
const getAllSections = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT s.*, d.name as department_name 
        FROM TblSections s 
        JOIN TblDepartments d ON s.dept_id = d.dept_id 
        ORDER BY s.name
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addSection = async (req, res) => {
  try {
    const { name, dept_id } = req.body;
    if (!name || !dept_id) {
      return res.status(400).json({ message: 'Section name and department are required' });
    }

    const pool = await getConnection();
    await pool.request()
      .input('name', sql.VarChar(100), name)
      .input('dept_id', sql.Int, dept_id)
      .query('INSERT INTO TblSections (name, dept_id) VALUES (@name, @dept_id)');

    res.status(201).json({ message: 'Section added successfully' });
  } catch (error) {
    console.error('Add section error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dept_id } = req.body;
    
    if (!name || !dept_id) {
      return res.status(400).json({ message: 'Section name and department are required' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('section_id', sql.Int, id)
      .input('name', sql.VarChar(100), name)
      .input('dept_id', sql.Int, dept_id)
      .query('UPDATE TblSections SET name = @name, dept_id = @dept_id WHERE section_id = @section_id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Section not found' });
    }

    res.json({ message: 'Section updated successfully' });
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Check if section exists
    const sectionCheck = await pool.request()
      .input('section_id', sql.Int, id)
      .query('SELECT section_id FROM TblSections WHERE section_id = @section_id');
    
    if (sectionCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Section not found' });
    }
    
    // Start transaction for safe deletion
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Get all employees in this section
      const employeesResult = await transaction.request()
        .input('section_id', sql.Int, id)
        .query('SELECT emp_id, emp_det_id FROM TblEmpM WHERE section_id = @section_id');
      
      // Delete employees and their related records
      for (const employee of employeesResult.recordset) {
        // Delete from TblAttendance first (if exists)
        await transaction.request()
          .input('emp_id', sql.Int, employee.emp_id)
          .query('DELETE FROM TblAttendance WHERE emp_id = @emp_id');
        
        // Delete from TblEmpM table
        await transaction.request()
          .input('emp_id', sql.Int, employee.emp_id)
          .query('DELETE FROM TblEmpM WHERE emp_id = @emp_id');
        
        // Delete from TblEmpS table
        await transaction.request()
          .input('emp_det_id', sql.Int, employee.emp_det_id)
          .query('DELETE FROM TblEmpS WHERE emp_det_id = @emp_det_id');
      }
      
      // Delete the section
      const result = await transaction.request()
        .input('section_id', sql.Int, id)
        .query('DELETE FROM TblSections WHERE section_id = @section_id');
      
      // Commit the transaction
      await transaction.commit();
      
      res.json({ message: 'Section and all related employees deleted successfully' });
    } catch (transactionError) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('Delete section error:', error);
    if (error.number === 547) { // Foreign key constraint error
      res.status(400).json({ message: 'Cannot delete section due to existing dependencies' });
    } else {
      res.status(500).json({ message: 'Server error: ' + error.message });
    }
  }
};

// DESIGNATIONS
const getAllDesignations = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT d.*, r.name as role_name 
        FROM TblDesignations d 
        LEFT JOIN TblRoles r ON d.role_id = r.role_id 
        ORDER BY d.title
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Get designations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addDesignation = async (req, res) => {
  try {
    const { title, role_id } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Designation title is required' });
    }

    const pool = await getConnection();
    await pool.request()
      .input('title', sql.VarChar(100), title)
      .input('role_id', sql.Int, role_id || null)
      .query('INSERT INTO TblDesignations (title, role_id) VALUES (@title, @role_id)');

    res.status(201).json({ message: 'Designation added successfully' });
  } catch (error) {
    console.error('Add designation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, role_id } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Designation title is required' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('desig_id', sql.Int, id)
      .input('title', sql.VarChar(100), title)
      .input('role_id', sql.Int, role_id || null)
      .query('UPDATE TblDesignations SET title = @title, role_id = @role_id WHERE desig_id = @desig_id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    res.json({ message: 'Designation updated successfully' });
  } catch (error) {
    console.error('Update designation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Check if designation exists
    const designationCheck = await pool.request()
      .input('desig_id', sql.Int, id)
      .query('SELECT desig_id FROM TblDesignations WHERE desig_id = @desig_id');
    
    if (designationCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Designation not found' });
    }
    
    // Start transaction for safe deletion
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Get all employees with this designation
      const employeesResult = await transaction.request()
        .input('desig_id', sql.Int, id)
        .query('SELECT emp_id, emp_det_id FROM TblEmpM WHERE desig_id = @desig_id');
      
      // Delete employees and their related records
      for (const employee of employeesResult.recordset) {
        // Delete from TblAttendance first (if exists)
        await transaction.request()
          .input('emp_id', sql.Int, employee.emp_id)
          .query('DELETE FROM TblAttendance WHERE emp_id = @emp_id');
        
        // Delete from TblEmpM table
        await transaction.request()
          .input('emp_id', sql.Int, employee.emp_id)
          .query('DELETE FROM TblEmpM WHERE emp_id = @emp_id');
        
        // Delete from TblEmpS table
        await transaction.request()
          .input('emp_det_id', sql.Int, employee.emp_det_id)
          .query('DELETE FROM TblEmpS WHERE emp_det_id = @emp_det_id');
      }
      
      // Delete the designation
      const result = await transaction.request()
        .input('desig_id', sql.Int, id)
        .query('DELETE FROM TblDesignations WHERE desig_id = @desig_id');
      
      // Commit the transaction
      await transaction.commit();
      
      res.json({ message: 'Designation and all related employees deleted successfully' });
    } catch (transactionError) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('Delete designation error:', error);
    if (error.number === 547) { // Foreign key constraint error
      res.status(400).json({ message: 'Cannot delete designation due to existing dependencies' });
    } else {
      res.status(500).json({ message: 'Server error: ' + error.message });
    }
  }
};

// ROLES
const getAllRoles = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query('SELECT * FROM TblRoles ORDER BY name');
    res.json(result.recordset);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addRole = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    const pool = await getConnection();
    await pool.request()
      .input('name', sql.VarChar(100), name)
      .query('INSERT INTO TblRoles (name) VALUES (@name)');

    res.status(201).json({ message: 'Role added successfully' });
  } catch (error) {
    console.error('Add role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('role_id', sql.Int, id)
      .input('name', sql.VarChar(100), name)
      .query('UPDATE TblRoles SET name = @name WHERE role_id = @role_id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // Check if role exists
    const roleCheck = await pool.request()
      .input('role_id', sql.Int, id)
      .query('SELECT role_id FROM TblRoles WHERE role_id = @role_id');
    
    if (roleCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Start transaction for safe deletion
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Get all designations that use this role
      const designationsResult = await transaction.request()
        .input('role_id', sql.Int, id)
        .query('SELECT desig_id FROM TblDesignations WHERE role_id = @role_id');
      
      // For each designation, delete employees and their related records
      for (const designation of designationsResult.recordset) {
        // Get all employees with this designation
        const employeesResult = await transaction.request()
          .input('desig_id', sql.Int, designation.desig_id)
          .query('SELECT emp_id, emp_det_id FROM TblEmpM WHERE desig_id = @desig_id');
        
        // Delete employees and their related records
        for (const employee of employeesResult.recordset) {
          // Delete from TblAttendance first (if exists)
          await transaction.request()
            .input('emp_id', sql.Int, employee.emp_id)
            .query('DELETE FROM TblAttendance WHERE emp_id = @emp_id');
          
          // Delete from TblEmpM table
          await transaction.request()
            .input('emp_id', sql.Int, employee.emp_id)
            .query('DELETE FROM TblEmpM WHERE emp_id = @emp_id');
          
          // Delete from TblEmpS table
          await transaction.request()
            .input('emp_det_id', sql.Int, employee.emp_det_id)
            .query('DELETE FROM TblEmpS WHERE emp_det_id = @emp_det_id');
        }
        
        // Delete the designation
        await transaction.request()
          .input('desig_id', sql.Int, designation.desig_id)
          .query('DELETE FROM TblDesignations WHERE desig_id = @desig_id');
      }
      
      // Finally delete the role
      const result = await transaction.request()
        .input('role_id', sql.Int, id)
        .query('DELETE FROM TblRoles WHERE role_id = @role_id');
      
      // Commit the transaction
      await transaction.commit();
      
      res.json({ message: 'Role and all related records deleted successfully' });
    } catch (transactionError) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('Delete role error:', error);
    if (error.number === 547) { // Foreign key constraint error
      res.status(400).json({ message: 'Cannot delete role due to existing dependencies' });
    } else {
      res.status(500).json({ message: 'Server error: ' + error.message });
    }
  }
};

module.exports = {
  // Departments
  getAllDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  
  // Sections
  getAllSections,
  addSection,
  updateSection,
  deleteSection,
  
  // Designations
  getAllDesignations,
  addDesignation,
  updateDesignation,
  deleteDesignation,
  
  // Roles
  getAllRoles,
  addRole,
  updateRole,
  deleteRole
}; 