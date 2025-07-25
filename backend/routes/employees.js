const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getAllEmployees,
  getEmployee,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getUnassignedEmployees,
  assignEmployee
} = require('../controllers/employeeController');

router.use(auth);
router.get('/', getAllEmployees);
router.get('/unassigned', getUnassignedEmployees); // Get unassigned employees
router.get('/:id', getEmployee);

router.post('/', addEmployee);
router.post('/assign/:emp_det_id', assignEmployee); // Assign employee
router.put('/:id', updateEmployee);
router.delete('/det/:emp_det_id', deleteEmployee); // Delete by emp_det_id
router.delete('/:id', deleteEmployee); // Delete by emp_id

module.exports = router; 