import React, { useState, useEffect } from 'react';
import { Employee, EmployeeFormData, Department, Section, Designation, Role } from '../../types';
import { departmentAPI, sectionAPI, designationAPI, roleAPI, employeeAPI } from '../../services/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface EmployeeFormProps {
  employee?: Employee | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    cnic: '',
    start_date: '',
    section_id: '',
    desig_id: '',
    role_id: '',
    type: 'editable'
  });
  
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [originalCnic, setOriginalCnic] = useState('');

  useEffect(() => {
    loadFormData();
  }, []);

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        cnic: employee.cnic,
        start_date: employee.start_date,
        section_id: String(employee.section_id),
        desig_id: String(employee.desig_id),
        role_id: String(employee.role_id),
        type: employee.type
      });
      setSelectedDepartment(String(employee.dept_id));
      setOriginalName(employee.name);
      setOriginalCnic(employee.cnic);
    }
  }, [employee]);

  const loadFormData = async () => {
    try {
      const [depts, sects, desigs, rols] = await Promise.all([
        departmentAPI.getAll(),
        sectionAPI.getAll(),
        designationAPI.getAll(),
        roleAPI.getAll()
      ]);

      setDepartments(depts);
      setSections(sects);
      setDesignations(desigs);
      setRoles(rols);
    } catch (error: any) {
      setError('Failed to load form data: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields based on whether adding new or editing existing employee
    if (!employee) {
      // For new employees, only validate name, cnic, and start_date
      if (!formData.name || !formData.cnic || !formData.start_date) {
        setError('Please fill in all fields.');
        setLoading(false);
        return;
      }
    } else {
      // For existing employees, validate editable fields
      if (!formData.section_id || !formData.desig_id || !formData.role_id) {
        setError('Please fill in all fields.');
        setLoading(false);
        return;
      }
    }

    // Prevent updating Name or CNIC
    if (employee && (formData.name !== originalName || formData.cnic !== originalCnic)) {
      setError("Name and CNIC can't be changed. Only Section, Designation, and Role can be updated.");
      setLoading(false);
      return;
    }

    try {
      if (employee) {
        const updatePayload = {
          section_id: Number(formData.section_id),
          desig_id: Number(formData.desig_id),
          role_id: Number(formData.role_id),
        };
        console.log('Updating employee payload:', updatePayload);
        
        // Check if employee is unassigned (emp_id = 0)
        if (employee.emp_id === 0) {
          // For unassigned employees, use the assign endpoint
          console.log('Assigning unassigned employee with emp_det_id:', employee.emp_det_id);
          const response = await fetch(`http://localhost:5000/api/employees/assign/${employee.emp_det_id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updatePayload)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to assign employee');
          }
        } else {
          // For assigned employees, use the regular update endpoint
          await employeeAPI.update(employee.emp_id, updatePayload);
        }
      } else {
        // For new employees, only send basic details
        const createPayload = {
          name: formData.name,
          cnic: formData.cnic,
          start_date: formData.start_date
        };
        console.log('Creating employee payload:', createPayload);
        await employeeAPI.create(createPayload);
      }
      onSubmit();
    } catch (error: any) {
      setError(error.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear designation when role changes
    if (name === 'role_id') {
      setFormData(prev => ({ ...prev, desig_id: '' }));
    }
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const departmentId = e.target.value;
    setSelectedDepartment(departmentId);
    // Clear section when department changes
    setFormData(prev => ({ ...prev, section_id: '' }));
  };

  // Filter sections based on selected department
  const getFilteredSections = () => {
    if (!selectedDepartment) return [];
    return sections.filter(section => section.dept_id === Number(selectedDepartment));
  };

  // Filter designations based on selected role
  const getFilteredDesignations = () => {
    if (!formData.role_id) return [];
    return designations.filter(designation => designation.role_id === Number(formData.role_id));
  };

  const isFixedEmployee = employee?.type === 'fixed';

  // Dynamic options based on API data
  const departmentOptions = departments.map(dept => ({ 
    value: dept.dept_id, 
    label: dept.name 
  }));

  const roleOptions = roles.map(role => ({ 
    value: role.role_id, 
    label: role.name 
  }));

  // Use filtered designations based on selected role
  const filteredDesignations = getFilteredDesignations();
  const designationOptions = filteredDesignations.map(designation => ({ 
    value: designation.desig_id, 
    label: designation.title 
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter employee name"
            readOnly={!!employee}
            disabled={!!employee}
          />
          {!!employee && (
            <p className="text-xs text-gray-500 mt-1">Name cannot be changed</p>
          )}
        </div>

        <div>
          <label htmlFor="cnic" className="block text-sm font-medium text-gray-700 mb-1">
            CNIC
          </label>
          <Input
            id="cnic"
            name="cnic"
            type="text"
            value={formData.cnic}
            onChange={handleChange}
            required
            placeholder="Enter CNIC"
            readOnly={!!employee}
            disabled={!!employee}
          />
          {!!employee && (
            <p className="text-xs text-gray-500 mt-1">CNIC cannot be changed</p>
          )}
        </div>

        <div className={!employee ? "md:col-span-2" : ""}>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
            Starting Date
          </label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            value={formData.start_date}
            onChange={handleChange}
            required={!employee}
            placeholder="Select starting date"
            readOnly={!!employee}
            disabled={!!employee}
          />
          {!!employee && (
            <p className="text-xs text-gray-500 mt-1">Starting date cannot be changed</p>
          )}
        </div>

        {/* Only show editable fields when editing an employee */}
        {employee && (
          <>
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <Select
                id="department"
                name="department"
                value={selectedDepartment}
                onChange={handleDepartmentChange}
                required
                options={departments.map(d => ({ value: d.dept_id, label: d.name }))}
              />
            </div>

            <div>
              <label htmlFor="section_id" className="block text-sm font-medium text-gray-700 mb-1">
                Section
              </label>
              <Select
                id="section_id"
                name="section_id"
                value={formData.section_id}
                onChange={handleChange}
                required
                disabled={!selectedDepartment}
                options={getFilteredSections().map(s => ({ value: s.section_id, label: s.name }))}
              />
            </div>

            <div>
              <label htmlFor="role_id" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <Select
                id="role_id"
                name="role_id"
                value={formData.role_id}
                onChange={handleChange}
                required
                options={roleOptions}
              />
            </div>
            
            <div>
              <label htmlFor="desig_id" className="block text-sm font-medium text-gray-700 mb-1">
                Designation
              </label>
              <Select
                id="desig_id"
                name="desig_id"
                value={formData.desig_id}
                onChange={handleChange}
                required
                disabled={!formData.role_id}
                options={designationOptions}
              />
              {!formData.role_id && (
                <p className="text-xs text-gray-500 mt-1">Please select a role first</p>
              )}
              {formData.role_id && filteredDesignations.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">No designations available for this role</p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Saving...' : (employee ? 'Update Employee' : 'Add Employee')}
        </Button>
      </div>
    </form>
  );
};