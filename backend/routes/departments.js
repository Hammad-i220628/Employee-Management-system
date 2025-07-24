const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getAllDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  getAllSections,
  addSection,
  updateSection,
  deleteSection,
  getAllDesignations,
  addDesignation,
  updateDesignation,
  deleteDesignation,
  getAllRoles,
  addRole,
  updateRole,
  deleteRole
} = require('../controllers/departmentController');

// All routes require authentication
router.use(auth);

// DEPARTMENTS
router.get('/', getAllDepartments);
router.post('/', addDepartment);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

// SECTIONS
router.get('/sections', getAllSections);
router.post('/sections', addSection);
router.put('/sections/:id', updateSection);
router.delete('/sections/:id', deleteSection);

// DESIGNATIONS
router.get('/designations', getAllDesignations);
router.post('/designations', addDesignation);
router.put('/designations/:id', updateDesignation);
router.delete('/designations/:id', deleteDesignation);

// ROLES
router.get('/roles', getAllRoles);
router.post('/roles', addRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

module.exports = router; 