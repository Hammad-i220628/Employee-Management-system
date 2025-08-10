import React, { useState, useEffect } from 'react';
import { Employee } from '../../types';
import { employeeAPI } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { EmployeeForm } from './EmployeeForm';

export const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeAPI.getAll();
      setEmployees(data);
    } catch (error: any) {
      setError(error.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    try {
      // For unassigned employees (emp_id = 0), use emp_det_id
      // For assigned employees (emp_id > 0), use emp_id
      const deleteId = employee.emp_id === 0 ? `det/${employee.emp_det_id}` : employee.emp_id;
      await employeeAPI.delete(deleteId);
      await loadEmployees();
    } catch (error: any) {
      setError(error.message || 'Failed to delete employee');
    }
  };

  const handleFormSubmit = async () => {
    await loadEmployees();
    setShowModal(false);
    setEditingEmployee(null);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status.toLowerCase()) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'changed':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getTypeBadge = (type: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (type.toLowerCase()) {
      case 'fixed':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'editable':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'unassigned':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading employees...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
        <Button onClick={handleAddEmployee} className="bg-blue-600 hover:bg-blue-700">
          Add Employee
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee) => (
          <Card key={employee.emp_id === 0 ? `unassigned-${employee.emp_det_id}` : employee.emp_id} className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
                    {(employee.email === 'admin@gmail.com' || employee.cnic === '00000-0000000-0' || employee.type === 'fixed') && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">CNIC: {employee.cnic}</p>
                  <p className="text-sm text-gray-600">Email: {employee.email}</p>
                  <p className="text-sm text-gray-600">Started: {new Date(employee.start_date).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={getStatusBadge(employee.status)}>
                    {employee.status === 'changed' ? 'active' : employee.status}
                  </span>
                  {employee.type !== 'editable' && (
                    <span className={getTypeBadge(employee.type)}>
                      {employee.type}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Department:</span>
                  <span className="ml-2 text-gray-600">{employee.department_name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Section:</span>
                  <span className="ml-2 text-gray-600">{employee.section_name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Designation:</span>
                  <span className="ml-2 text-gray-600">{employee.designation_title}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Role:</span>
                  <span className="ml-2 text-gray-600">{employee.role_name}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleEditEmployee(employee)}
                  variant="outline"
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  onClick={() => handleDeleteEmployee(employee)}
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {employees.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No employees found</p>
          <p className="text-gray-400 mt-2">Add your first employee to get started</p>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
      >
        <EmployeeForm
          employee={editingEmployee}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};