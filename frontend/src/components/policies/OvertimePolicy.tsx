import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, Save, AlertCircle, Users, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import api from '../../services/api';

interface OvertimePolicyData {
  policy_id: number;
  overtime_allowed: boolean;
  bonus_enabled: boolean;
  bonus_rate: number;
  standard_work_hours: number;
  overtime_threshold_minutes: number;
}

interface EmployeeOvertimeData {
  emp_id: number;
  employee_name: string;
  email: string;
  salary: number;
  department_name: string;
  section_name: string;
  designation_title: string;
  hourly_rate: number;
  total_overtime_hours: number;
  total_bonus_amount: number;
  approved_overtime_hours: number;
  approved_bonus_amount: number;
  has_overtime: boolean;
}

export const OvertimePolicy: React.FC = () => {
  const [policy, setPolicy] = useState<OvertimePolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [employees, setEmployees] = useState<EmployeeOvertimeData[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [showEmployeeTable, setShowEmployeeTable] = useState(false);
  const [formData, setFormData] = useState({
    overtimeAllowed: false,
    bonusEnabled: false,
    bonusRate: 1.5
  });

  useEffect(() => {
    fetchOvertimePolicy();
  }, []);

  const fetchOvertimePolicy = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/policies/overtime');
      setPolicy(response.data);
      setFormData({
        overtimeAllowed: response.data.overtime_allowed,
        bonusEnabled: response.data.bonus_enabled,
        bonusRate: response.data.bonus_rate
      });
    } catch (error) {
      console.error('Error fetching overtime policy:', error);
      setMessage('Failed to load overtime policy');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesWithOvertime = async () => {
    if (!formData.overtimeAllowed) return;
    
    setEmployeesLoading(true);
    try {
      const response = await api.get('/policies/employees-overtime');
      setEmployees(response.data);
      setShowEmployeeTable(true);
    } catch (error) {
      console.error('Error fetching employees with overtime:', error);
      setMessage('Failed to load employee overtime data');
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await api.put('/policies/overtime', {
        policyId: policy?.policy_id,
        overtimeAllowed: formData.overtimeAllowed,
        bonusEnabled: formData.bonusEnabled,
        bonusRate: formData.bonusRate
      });

      setMessage(response.data.message);
      await fetchOvertimePolicy(); // Refresh data
    } catch (error: any) {
      console.error('Error updating overtime policy:', error);
      setMessage(error.response?.data?.message || 'Failed to update overtime policy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Overtime Policy Configuration</h2>
      </div>


      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overtime Allowed */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Allow Overtime Work
            </label>
            <div className="flex items-center space-x-3">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="overtimeAllowed"
                  checked={formData.overtimeAllowed === true}
                  onChange={() => setFormData(prev => ({ ...prev, overtimeAllowed: true }))}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">Yes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="overtimeAllowed"
                  checked={formData.overtimeAllowed === false}
                  onChange={() => setFormData(prev => ({ ...prev, overtimeAllowed: false }))}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">No</span>
              </label>
            </div>
            <p className="text-xs text-gray-500">
              Allow employees to work beyond standard 9 AM - 5 PM hours
            </p>
          </div>

          {/* Bonus Enabled */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Overtime Bonus
            </label>
            <div className="flex items-center space-x-3">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="bonusEnabled"
                  checked={formData.bonusEnabled === true}
                  onChange={() => setFormData(prev => ({ ...prev, bonusEnabled: true }))}
                  disabled={!formData.overtimeAllowed}
                  className="form-radio text-blue-600 disabled:opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Enabled</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="bonusEnabled"
                  checked={formData.bonusEnabled === false}
                  onChange={() => setFormData(prev => ({ ...prev, bonusEnabled: false }))}
                  disabled={!formData.overtimeAllowed}
                  className="form-radio text-blue-600 disabled:opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Disabled</span>
              </label>
            </div>
            <p className="text-xs text-gray-500">
              Provide bonus compensation for overtime work
            </p>
          </div>
        </div>

        {/* Bonus Rate */}
        {formData.overtimeAllowed && formData.bonusEnabled && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Bonus Rate (Multiplier)
            </label>
            <Input
              type="number"
              min="1"
              max="10"
              step="0.1"
              value={formData.bonusRate}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                bonusRate: parseFloat(e.target.value) || 1.5 
              }))}
              className="w-full"
              placeholder="1.5"
            />
            <p className="text-xs text-gray-500">
              Multiplier for overtime pay (e.g., 1.5 means 1.5x regular hourly rate)
            </p>
          </div>
        )}

        {message && (
          <div className={`p-3 rounded-lg ${
            message.includes('success') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="flex justify-end gap-3">
          {formData.overtimeAllowed && (
            <Button
              type="button"
              onClick={fetchEmployeesWithOvertime}
              disabled={employeesLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              {employeesLoading ? 'Loading...' : 'View Employee Overtime'}
            </Button>
          )}
          <Button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Policy'}
          </Button>
        </div>
      </form>

      {/* Employee Overtime Table */}
      {showEmployeeTable && formData.overtimeAllowed && (
        <Card className="mt-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Employee Overtime Summary
                </h3>
              </div>
              <Button
                onClick={fetchEmployeesWithOvertime}
                disabled={employeesLoading}
                size="sm"
                variant="outline"
              >
                Refresh
              </Button>
            </div>

            {employees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Base Salary
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hourly Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total OT Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bonus Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((employee) => (
                      <tr key={employee.emp_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {employee.employee_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {employee.designation_title}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{employee.department_name}</div>
                          <div className="text-sm text-gray-500">{employee.section_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          PKR {employee.salary.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          PKR {employee.hourly_rate.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {employee.total_overtime_hours.toFixed(2)} hrs
                          </div>
                          {employee.approved_overtime_hours > 0 && (
                            <div className="text-xs text-green-600">
                              {employee.approved_overtime_hours.toFixed(2)} hrs approved
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            PKR {employee.total_bonus_amount.toLocaleString()}
                          </div>
                          {employee.approved_bonus_amount > 0 && (
                            <div className="text-xs text-green-600">
                              PKR {employee.approved_bonus_amount.toLocaleString()} approved
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            employee.has_overtime
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {employee.has_overtime ? 'Has Overtime' : 'No Overtime'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No employee overtime data</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No employees have recorded overtime hours for the current period.
                </p>
              </div>
            )}

            {/* Summary Statistics */}
            {employees.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Total Employees</div>
                  <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-900">With Overtime</div>
                  <div className="text-2xl font-bold text-green-600">
                    {employees.filter(emp => emp.has_overtime).length}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-yellow-900">Total OT Hours</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {employees.reduce((sum, emp) => sum + emp.total_overtime_hours, 0).toFixed(1)}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-purple-900">Total Bonus</div>
                  <div className="text-2xl font-bold text-purple-600">
                    PKR {employees.reduce((sum, emp) => sum + emp.total_bonus_amount, 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
