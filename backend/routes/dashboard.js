const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getEmployeeDashboard, getAdminDashboard } = require('../controllers/dashboardController');

// All routes require authentication
router.use(auth);

// Get employee dashboard data
router.get('/employee', getEmployeeDashboard);

// Get admin dashboard stats
router.get('/admin', getAdminDashboard);

module.exports = router;
