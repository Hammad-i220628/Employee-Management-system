const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const auth = require('../middleware/auth');

// All attendance routes require authentication
router.use(auth);

// GET /api/attendance/date/:date - Get all attendance records for a specific date
router.get('/date/:date', attendanceController.getAttendanceByDate);

// POST /api/attendance - Add or update attendance record
router.post('/', attendanceController.addOrUpdateAttendance);

// GET /api/attendance/stats/:date - Get attendance statistics for a specific date
router.get('/stats/:date', attendanceController.getAttendanceStats);

// DELETE /api/attendance/:attendance_id - Delete attendance record
router.delete('/:attendance_id', attendanceController.deleteAttendance);

// GET /api/attendance/employee/:emp_id - Get attendance report for a specific employee
router.get('/employee/:emp_id', attendanceController.getEmployeeAttendanceReport);

// POST /api/attendance/barcode - Mark attendance using barcode
router.post('/barcode', attendanceController.markAttendanceByBarcode);

// GET /api/attendance/employee/barcode/:barcode - Get employee by barcode
router.get('/employee/barcode/:barcode', attendanceController.getEmployeeByBarcode);

module.exports = router;
