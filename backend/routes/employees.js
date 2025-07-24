const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getAllEmployees,
  getEmployee,
  addEmployee,
  updateEmployee,
  deleteEmployee
} = require('../controllers/employeeController');

router.use(auth);
router.get('/', getAllEmployees);
router.get('/:id', getEmployee);

router.post('/', addEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router; 