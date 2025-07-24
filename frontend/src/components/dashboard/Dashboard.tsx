import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Users, Building, TrendingUp, AlertCircle, Shield } from 'lucide-react';
import { employeeAPI, departmentAPI } from '../../services/api';
import { Employee, Department } from '../../types';

// Add prop for switching to Employee List
interface DashboardProps {
  onManageEmployees?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onManageEmployees }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeeData, departmentData] = await Promise.all([
        employeeAPI.getAll(),
        departmentAPI.getAll()
      ]);

      setEmployees(employeeData);
      setDepartments(departmentData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter out admin employees
  const nonAdminEmployees = employees.filter(emp => emp.role_name !== 'Admin');

  const stats = {
    totalEmployees: nonAdminEmployees.length,
    totalDepartments: departments.length,
    activeEmployees: nonAdminEmployees.filter(emp => emp.status === 'Active').length,
    changedEmployees: nonAdminEmployees.filter(emp => emp.status === 'Changed').length
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }: any) => (
    <Card className="shadow-lg border-0">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`p-4 rounded-full bg-${color}-100 flex items-center justify-center`}>
          <Icon className={`w-8 h-8 text-${color}-600`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Modern Admin Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl p-8 shadow-xl mb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white mb-1 flex items-center gap-2">
            <Shield className="w-8 h-8 text-white" />
            Welcome, Admin
          </h2>
          <p className="text-blue-100 text-lg mb-4">Here’s an overview of your organization’s activity.</p>
          <button
            className="mt-2 px-6 py-2 bg-white text-blue-700 font-semibold rounded-lg shadow hover:bg-blue-50 transition"
            onClick={onManageEmployees}
          >
            Manage Employees
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
            <Shield className="w-10 h-10 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Departments"
          value={stats.totalDepartments}
          icon={Building}
          color="green"
        />
        <StatCard
          title="Active Employees"
          value={stats.activeEmployees}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Changed Status"
          value={stats.changedEmployees}
          icon={AlertCircle}
          color="orange"
        />
      </div>

      {/* Recent Employees & Department Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Recent Employees</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nonAdminEmployees.slice(0, 5).map((employee) => (
                <div key={employee.emp_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{employee.name}</p>
                    <p className="text-sm text-gray-500">{employee.designation_title}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    employee.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {employee.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};