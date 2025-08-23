const express = require('express');
const router = express.Router();
const barcodeController = require('../controllers/barcodeController');
const auth = require('../middleware/auth');

// All barcode routes require authentication
router.use(auth);

// GET /api/barcode/employees - Get all employees with their barcodes
router.get('/employees', barcodeController.getEmployeeBarcodes);

// POST /api/barcode/generate/:emp_det_id - Generate barcode for employee
router.post('/generate/:emp_det_id', barcodeController.generateEmployeeBarcode);

// PUT /api/barcode/update/:emp_det_id - Update employee barcode
router.put('/update/:emp_det_id', barcodeController.updateEmployeeBarcode);

module.exports = router;
