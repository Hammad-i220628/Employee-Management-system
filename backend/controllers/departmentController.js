const { getConnection, sql } = require('../db/connection');

// DEPARTMENTS
const getAllDepartments = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query('SELECT * FROM Departments ORDER BY name');
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
      .query('INSERT INTO Departments (name) VALUES (@name)');

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
      .query('UPDATE Departments SET name = @name WHERE dept_id = @dept_id');

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
    
    const result = await pool.request()
      .input('dept_id', sql.Int, id)
      .query('DELETE FROM Departments WHERE dept_id = @dept_id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// SECTIONS
const getAllSections = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT s.*, d.name as department_name 
        FROM Sections s 
        JOIN Departments d ON s.dept_id = d.dept_id 
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
      .query('INSERT INTO Sections (name, dept_id) VALUES (@name, @dept_id)');

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
      .query('UPDATE Sections SET name = @name, dept_id = @dept_id WHERE section_id = @section_id');

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
    
    const result = await pool.request()
      .input('section_id', sql.Int, id)
      .query('DELETE FROM Sections WHERE section_id = @section_id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Section not found' });
    }

    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DESIGNATIONS
const getAllDesignations = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query(`
        SELECT d.*, r.name as role_name 
        FROM Designations d 
        LEFT JOIN Roles r ON d.role_id = r.role_id 
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
      .query('INSERT INTO Designations (title, role_id) VALUES (@title, @role_id)');

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
      .query('UPDATE Designations SET title = @title, role_id = @role_id WHERE desig_id = @desig_id');

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
    
    const result = await pool.request()
      .input('desig_id', sql.Int, id)
      .query('DELETE FROM Designations WHERE desig_id = @desig_id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    res.json({ message: 'Designation deleted successfully' });
  } catch (error) {
    console.error('Delete designation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ROLES
const getAllRoles = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .query('SELECT * FROM Roles ORDER BY name');
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
      .query('INSERT INTO Roles (name) VALUES (@name)');

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
      .query('UPDATE Roles SET name = @name WHERE role_id = @role_id');

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
    
    const result = await pool.request()
      .input('role_id', sql.Int, id)
      .query('DELETE FROM Roles WHERE role_id = @role_id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ message: 'Server error' });
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