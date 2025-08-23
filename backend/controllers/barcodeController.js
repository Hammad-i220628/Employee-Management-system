const { getConnection, sql } = require('../db/connection');

// Generate barcode for employee
const generateEmployeeBarcode = async (req, res) => {
  try {
    const { emp_det_id } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('emp_det_id', sql.Int, emp_det_id)
      .execute('sp_GenerateEmployeeBarcode');

    if (result.recordset.length > 0) {
      res.json({
        success: true,
        barcode: result.recordset[0].barcode,
        message: result.recordset[0].message
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to generate barcode'
      });
    }
  } catch (error) {
    console.error('Error generating barcode:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate barcode: ' + error.message 
    });
  }
};

// Update employee barcode
const updateEmployeeBarcode = async (req, res) => {
  try {
    const { emp_det_id } = req.params;
    const { barcode } = req.body;
    const pool = await getConnection();

    const result = await pool.request()
      .input('emp_det_id', sql.Int, emp_det_id)
      .input('barcode', sql.VarChar, barcode)
      .execute('sp_UpdateEmployeeBarcode');

    res.json({
      success: true,
      message: result.recordset[0].message
    });
  } catch (error) {
    console.error('Error updating barcode:', error);
    
    if (error.message.includes('already exists')) {
      res.status(400).json({ 
        success: false,
        message: 'This barcode is already assigned to another employee' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        message: 'Failed to update barcode: ' + error.message 
      });
    }
  }
};

// Get all employees with their barcodes
const getEmployeeBarcodes = async (req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT 
        ed.emp_det_id,
        ed.name,
        ed.email,
        ed.barcode,
        e.emp_id,
        e.status,
        d.name as department_name,
        s.name as section_name,
        des.title as designation_title
      FROM TblEmpS ed
      INNER JOIN TblEmpM e ON ed.emp_det_id = e.emp_det_id
      INNER JOIN TblSections s ON e.section_id = s.section_id
      INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
      INNER JOIN TblDesignations des ON e.desig_id = des.desig_id
      WHERE e.status = 'Active'
      ORDER BY ed.name
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching employee barcodes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch employee barcodes: ' + error.message 
    });
  }
};

module.exports = {
  generateEmployeeBarcode,
  updateEmployeeBarcode,
  getEmployeeBarcodes
};
