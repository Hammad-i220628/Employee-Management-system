import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { User, Calendar, Building, Mail, Briefcase, Badge, LogOut, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface EmployeeData {
  name: string;
  cnic: string;
  start_date: string;
  status: string;
  work_start_time: string;
  work_end_time: string;
  department_name: string;
  section_name: string;
  designation_title: string;
  role_name: string;
  email: string;
}

export const EmployeeDashboard: React.FC = () => {
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/dashboard/employee', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load employee data');
      }

      const data = await response.json();
      setEmployeeData(data);
    } catch (error: any) {
      setError(error.message || 'Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 text-sm font-medium rounded-full";
    switch (status.toLowerCase()) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'changed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'unassigned':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const InfoItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-grow">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        {error}
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
        No employee data found. Please contact your administrator.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome, {employeeData.name}</h1>
              <p className="text-blue-100 text-lg">Here's your employee information</p>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="secondary"
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/40"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Employee Information Card */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Employee Details</h2>
            <span className={getStatusBadge(employeeData.status)}>
              {employeeData.status === 'Changed' ? 'Active' : employeeData.status}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem 
              icon={User} 
              label="Full Name" 
              value={employeeData.name} 
            />
            <InfoItem 
              icon={Badge} 
              label="CNIC" 
              value={employeeData.cnic} 
            />
            <InfoItem 
              icon={Calendar} 
              label="Start Date" 
              value={new Date(employeeData.start_date).toLocaleDateString()} 
            />
            <InfoItem 
              icon={Mail} 
              label="Email" 
              value={employeeData.email} 
            />
            <InfoItem 
              icon={Building} 
              label="Department" 
              value={employeeData.department_name} 
            />
            <InfoItem 
              icon={Building} 
              label="Section" 
              value={employeeData.section_name} 
            />
            <InfoItem 
              icon={Briefcase} 
              label="Designation" 
              value={employeeData.designation_title} 
            />
            <InfoItem 
              icon={User} 
              label="Role" 
              value={employeeData.role_name} 
            />
            <InfoItem 
              icon={Clock} 
              label="Work Hours" 
              value={(() => {
                try {
                  const startTime = new Date(`1970-01-01T${employeeData.work_start_time}`);
                  const endTime = new Date(`1970-01-01T${employeeData.work_end_time}`);
                  return `${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                } catch (error) {
                  return `${employeeData.work_start_time} - ${employeeData.work_end_time}`;
                }
              })()} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Employment Status</span>
                <span className="font-semibold text-blue-600">{employeeData.status === 'Changed' ? 'Active' : employeeData.status}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Days Since Joining</span>
                <span className="font-semibold text-green-600">
                  {Math.floor((new Date().getTime() - new Date(employeeData.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Daily Work Hours</span>
                <span className="font-semibold text-purple-600">
                  {(() => {
                    try {
                      const start = new Date(`1970-01-01T${employeeData.work_start_time}`);
                      const end = new Date(`1970-01-01T${employeeData.work_end_time}`);
                      const diffMs = end.getTime() - start.getTime();
                      const diffHrs = diffMs / (1000 * 60 * 60);
                      return `${diffHrs} hours`;
                    } catch (error) {
                      return 'N/A';
                    }
                  })()} 
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Organization Structure</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Building className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Department</p>
                <p className="font-semibold text-gray-900">{employeeData.department_name}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Briefcase className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Your Position</p>
                <p className="font-semibold text-blue-900">{employeeData.designation_title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
