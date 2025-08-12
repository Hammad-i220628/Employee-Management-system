const sql = require('mssql');
const { poolPromise } = require('../db/connection');

const leaveController = {
  // Apply for leave
  applyLeave: async (req, res) => {
    try {
      const { emp_id, leave_type, start_date, end_date, reason } = req.body;
      
      // Validation
      if (!emp_id || !leave_type || !start_date || !end_date || !reason) {
        return res.status(400).json({ 
          message: 'All fields are required: emp_id, leave_type, start_date, end_date, reason' 
        });
      }

      if (!['short_leave', 'holiday'].includes(leave_type)) {
        return res.status(400).json({ 
          message: 'Invalid leave type. Must be either short_leave or holiday' 
        });
      }

      const pool = await poolPromise;
      const request = pool.request();
      
      request.input('emp_id', sql.Int, emp_id);
      request.input('leave_type', sql.VarChar(20), leave_type);
      request.input('start_date', sql.Date, start_date);
      request.input('end_date', sql.Date, end_date);
      request.input('reason', sql.NVarChar(500), reason);
      
      const result = await request.execute('sp_ApplyLeave');
      
      res.status(201).json({
        success: true,
        message: result.recordset[0].message,
        leave_id: result.recordset[0].leave_id
      });
      
    } catch (error) {
      console.error('Apply leave error:', error);
      res.status(500).json({ 
        message: error.message || 'Failed to apply for leave' 
      });
    }
  },

  // Get all leave applications (Admin view and Employee filtered view)
  getLeaveApplications: async (req, res) => {
    try {
      const { status, emp_id } = req.query;
      
      const pool = await poolPromise;
      const request = pool.request();
      
      // If emp_id is provided, use the employee-specific procedure instead
      if (emp_id) {
        request.input('emp_id', sql.Int, parseInt(emp_id));
        const result = await request.execute('sp_GetEmployeeLeaves');
        
        res.json({
          success: true,
          data: result.recordset
        });
        return;
      }
      
      // For admin - get all leave applications
      if (status) request.input('status', sql.VarChar(20), status);
      
      const result = await request.execute('sp_GetLeaveApplications');
      
      res.json({
        success: true,
        data: result.recordset
      });
      
    } catch (error) {
      console.error('Get leave applications error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch leave applications' 
      });
    }
  },

  // Update leave status (Admin action)
  updateLeaveStatus: async (req, res) => {
    try {
      const { leave_id } = req.params;
      const { status, approved_by, comments } = req.body;
      
      if (!status || !approved_by) {
        return res.status(400).json({ 
          message: 'Status and approved_by are required' 
        });
      }

      if (!['approved', 'rejected', 'viewed'].includes(status)) {
        return res.status(400).json({ 
          message: 'Invalid status. Must be approved, rejected, or viewed' 
        });
      }
      
      // Determine approver type based on JWT token
      const userRole = req.user.role; // This comes from the JWT middleware
      const approverType = userRole === 'Admin' ? 'admin' : 'employee';
      
      const pool = await poolPromise;
      
      try {
        // Try with the new 5-parameter version first (with approver_type)
        const request = pool.request();
        request.input('leave_id', sql.Int, parseInt(leave_id));
        request.input('status', sql.VarChar(20), status);
        request.input('approved_by', sql.Int, approved_by);
        request.input('comments', sql.NVarChar(500), comments);
        request.input('approver_type', sql.VarChar(10), approverType);
        
        const result = await request.execute('sp_UpdateLeaveStatus');
        
        res.json({
          success: true,
          message: result.recordset[0].message
        });
        
      } catch (procError) {
        // If the 5-parameter version fails, try the old 4-parameter version
        if (procError.message.includes('too many arguments')) {
          console.log('Falling back to old stored procedure version');
          
          const fallbackRequest = pool.request();
          fallbackRequest.input('leave_id', sql.Int, parseInt(leave_id));
          fallbackRequest.input('status', sql.VarChar(20), status);
          fallbackRequest.input('approved_by', sql.Int, approved_by);
          fallbackRequest.input('comments', sql.NVarChar(500), comments);
          
          const fallbackResult = await fallbackRequest.execute('sp_UpdateLeaveStatus');
          
          // For admin users, also update the approver_type manually
          if (approverType === 'admin') {
            const updateRequest = pool.request();
            updateRequest.input('leave_id', sql.Int, parseInt(leave_id));
            await updateRequest.query(`
              UPDATE TblLeaves 
              SET approver_type = 'admin'
              WHERE leave_id = @leave_id AND approver_type IS NULL
            `);
          }
          
          res.json({
            success: true,
            message: fallbackResult.recordset[0].message
          });
          
        } else {
          throw procError;
        }
      }
      
    } catch (error) {
      console.error('Update leave status error:', error);
      res.status(500).json({ 
        message: error.message || 'Failed to update leave status' 
      });
    }
  },

  // Get employee's leave history
  getEmployeeLeaves: async (req, res) => {
    try {
      const { emp_id } = req.params;
      
      const pool = await poolPromise;
      const request = pool.request();
      
      request.input('emp_id', sql.Int, parseInt(emp_id));
      
      const result = await request.execute('sp_GetEmployeeLeaves');
      
      res.json({
        success: true,
        data: result.recordset
      });
      
    } catch (error) {
      console.error('Get employee leaves error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch employee leaves' 
      });
    }
  },

  // Get leave statistics
  getLeaveStats: async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      
      const pool = await poolPromise;
      const request = pool.request();
      
      if (start_date) request.input('start_date', sql.Date, start_date);
      if (end_date) request.input('end_date', sql.Date, end_date);
      
      const result = await request.execute('sp_GetLeaveStats');
      
      res.json({
        success: true,
        data: result.recordset[0]
      });
      
    } catch (error) {
      console.error('Get leave stats error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch leave statistics' 
      });
    }
  },

  // Delete leave application (Employee can delete pending applications)
  deleteLeaveApplication: async (req, res) => {
    try {
      const { leave_id } = req.params;
      const { emp_id } = req.body;
      
      if (!emp_id) {
        return res.status(400).json({ 
          message: 'Employee ID is required' 
        });
      }
      
      const pool = await poolPromise;
      const request = pool.request();
      
      request.input('leave_id', sql.Int, parseInt(leave_id));
      request.input('emp_id', sql.Int, emp_id);
      
      const result = await request.execute('sp_DeleteLeaveApplication');
      
      res.json({
        success: true,
        message: result.recordset[0].message
      });
      
    } catch (error) {
      console.error('Delete leave application error:', error);
      res.status(500).json({ 
        message: error.message || 'Failed to delete leave application' 
      });
    }
  },

  // Get leave application by ID
  getLeaveById: async (req, res) => {
    try {
      const { leave_id } = req.params;
      
      const pool = await poolPromise;
      const request = pool.request();
      
      request.input('leave_id', sql.Int, parseInt(leave_id));
      
      const result = await request.query(`
        SELECT 
          l.leave_id,
          l.emp_id,
          ed.name as employee_name,
          d.name as department_name,
          des.title as designation_title,
          l.leave_type,
          l.start_date,
          l.end_date,
          l.days_requested,
          l.reason,
          l.status,
          l.applied_date,
          l.approved_by,
          COALESCE(approver.name, admin_user.username, 'Admin') as approved_by_name,
          l.approved_date,
          l.comments
        FROM TblLeaves l
        INNER JOIN TblEmpM e ON l.emp_id = e.emp_id
        INNER JOIN TblEmpS ed ON e.emp_det_id = ed.emp_det_id
        INNER JOIN TblSections s ON e.section_id = s.section_id
        INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
        INNER JOIN TblDesignations des ON e.desig_id = des.desig_id
        LEFT JOIN TblEmpM approver_emp ON l.approved_by = approver_emp.emp_id
        LEFT JOIN TblEmpS approver ON approver_emp.emp_det_id = approver.emp_det_id
        LEFT JOIN TblUsers admin_user ON l.approved_by = admin_user.user_id AND approver.name IS NULL
        WHERE l.leave_id = @leave_id
      `);
      
      if (result.recordset.length === 0) {
        return res.status(404).json({ 
          message: 'Leave application not found' 
        });
      }
      
      res.json({
        success: true,
        data: result.recordset[0]
      });
      
    } catch (error) {
      console.error('Get leave by ID error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch leave application' 
      });
    }
  }
};

module.exports = leaveController;
