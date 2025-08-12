const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const auth = require('../middleware/auth');

// Apply for leave
router.post('/', auth, leaveController.applyLeave);

// Get all leave applications (Admin view)
router.get('/', auth, leaveController.getLeaveApplications);

// Get leave statistics
router.get('/stats', auth, leaveController.getLeaveStats);

// Get employee's leave history
router.get('/employee/:emp_id', auth, leaveController.getEmployeeLeaves);

// Get leave application by ID
router.get('/:leave_id', auth, leaveController.getLeaveById);

// Update leave status (Admin action)
router.put('/:leave_id/status', auth, leaveController.updateLeaveStatus);

// Delete leave application (Employee can delete pending applications)
router.delete('/:leave_id', auth, leaveController.deleteLeaveApplication);

module.exports = router;
