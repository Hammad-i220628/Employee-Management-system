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
    dept_id: '',
    section_id: '',
    desig_id: '',
    role_id: '',
    type: 'editable'
  });

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
        dept_id: String(employee.dept_id),
        section_id: String(employee.section_id),
        desig_id: String(employee.desig_id),
        role_id: String(employee.role_id),
        type: employee.type
      });
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

    // Validate all required fields
    if (
      !formData.name ||
      !formData.cnic ||
      !formData.dept_id ||
      !formData.section_id ||
      !formData.desig_id ||
      !formData.role_id
    ) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    // Prevent updating Name or CNIC
    if (employee && (formData.name !== originalName || formData.cnic !== originalCnic)) {
      setError("Name and CNIC can't be changed. Only Department, Section, Designation, and Role can be updated.");
      setLoading(false);
      return;
    }

    // Convert string IDs to numbers for backend
    const payload = {
      ...formData,
      dept_id: Number(formData.dept_id),
      section_id: Number(formData.section_id),
      desig_id: Number(formData.desig_id),
      role_id: Number(formData.role_id),
    };

    console.log('Submitting employee payload:', payload);

    try {
      if (employee) {
        await employeeAPI.update(employee.emp_id, payload);
      } else {
        await employeeAPI.create({ ...payload, type: 'editable' }); // Always send type
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
    setFormData(prev => {
      if (name === 'dept_id') {
        // When department changes, reset section_id
        return { ...prev, dept_id: value, section_id: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  const isFixedEmployee = employee?.type === 'fixed';

  // Remove API-based loading for departments, sections, roles, and designations
  // Add hardcoded options for departments, sections, roles, and designations

  // Use IDs as values for all dropdowns
  const departmentOptions = [
    { value: '1', label: 'HR (Human Resources)' },
    { value: '2', label: 'IT (Information Technology)' },
    { value: '3', label: 'Finance' },
  ];

  const sectionOptions: Record<string, { value: string; label: string }[]> = {
    '1': [ // HR
      { value: '1', label: 'Recruitment' },
      { value: '2', label: 'Employee Relations' },
    ],
    '2': [ // IT
      { value: '3', label: 'Software Development' },
      { value: '4', label: 'IT Support' },
    ],
    '3': [ // Finance
      { value: '5', label: 'Accounts Payable' },
      { value: '6', label: 'Budgeting & Planning' },
    ],
  };

  const roleOptions = [
    { value: '1', label: 'Employee' },
    { value: '2', label: 'HR' },
  ];

  const designationOptions: Record<string, { value: string; label: string }[]> = {
    '1': [
      { value: '1', label: 'Software Engineer' },
      { value: '2', label: 'Accounts Executive' },
    ],
    '2': [
      { value: '3', label: 'HR Manager' },
      { value: '4', label: 'Recruitment Officer' },
    ],
  };

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
          {isFixedEmployee && (
            <p className="text-xs text-gray-500 mt-1">Name cannot be changed for fixed employees</p>
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
          {isFixedEmployee && (
            <p className="text-xs text-gray-500 mt-1">CNIC cannot be changed for fixed employees</p>
          )}
        </div>

        <div>
          <label htmlFor="dept_id" className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <Select
            id="dept_id"
            name="dept_id"
            value={formData.dept_id}
            onChange={handleChange}
            required
            options={[
              { value: '', label: 'Select an option' },
              ...departmentOptions.map(opt => ({ value: opt.value, label: opt.label }))
            ]}
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
            disabled={!formData.dept_id}
            options={sectionOptions[formData.dept_id] || []}
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
            options={designationOptions[formData.role_id] || []}
          />
        </div>
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