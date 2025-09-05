const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getOvertimePolicy,
    updateOvertimePolicy,
    getLeavePolicy,
    updateLeavePolicy,
    getTaxDeductionPolicy,
    updateTaxDeductionPolicy,
    getAllPolicies,
    getEmployeesWithOvertime,
    addEmployeeOvertime,
    updateOvertimeStatus
} = require('../controllers/managementPoliciesController');

// Middleware to ensure only admin can access these routes
const adminAuth = (req, res, next) => {
    if (req.user?.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
};

// Get all management policies
router.get('/', auth, adminAuth, getAllPolicies);

// Overtime Policy Routes
router.get('/overtime', auth, adminAuth, getOvertimePolicy);
router.put('/overtime', auth, adminAuth, updateOvertimePolicy);

// Leave Policy Routes
router.get('/leave', auth, adminAuth, getLeavePolicy);
router.put('/leave', auth, adminAuth, updateLeavePolicy);

// Tax Deduction Policy Routes
router.get('/tax', auth, adminAuth, getTaxDeductionPolicy);
router.put('/tax', auth, adminAuth, updateTaxDeductionPolicy);

// Employee Overtime Routes
router.get('/employees-overtime', auth, adminAuth, getEmployeesWithOvertime);
router.post('/employee-overtime', auth, adminAuth, addEmployeeOvertime);
router.put('/overtime-status', auth, adminAuth, updateOvertimeStatus);

module.exports = router;
