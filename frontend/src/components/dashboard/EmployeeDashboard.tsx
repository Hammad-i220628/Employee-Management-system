import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { User, Calendar, Building, Mail, Briefcase, Badge, LogOut, Clock, Plus, FileText, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface EmployeeData {
  emp_id?: number; // Add emp_id for leave applications
  emp_det_id?: number;
  name: string;
  cnic: string;
  start_date: string;
  status: string;
  work_start_time: string;
  work_end_time: string;
  salary?: number;
  bonus?: number;
  department_name: string;
  section_name: string;
  designation_title: string;
  role_name: string;
  email: string;
}

interface LeaveApplication {
  leave_id: number;
  leave_type: 'short_leave' | 'holiday';
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'viewed';
  applied_date: string;
  approved_by_name?: string;
  approved_date?: string;
  comments?: string;
}

export const EmployeeDashboard: React.FC = () => {
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, logout } = useAuth();

  // Leave application states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [myLeaves, setMyLeaves] = useState<LeaveApplication[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  
  // Leave form state
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'short_leave' as 'short_leave' | 'holiday',
    start_date: '',
    end_date: '',
    reason: ''
  });

  // Date filter state (similar to your image)
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    quickSelect: ''
  });

  useEffect(() => {
    loadEmployeeData();
    loadMyLeaves();
  }, []);

  // Clear messages after some time
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const loadEmployeeData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        logout(); // Force logout if no token
        return;
      }

      const response = await fetch('http://localhost:5000/api/dashboard/employee', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        // Token is invalid, force logout
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load employee data');
      }

      const data = await response.json();
      setEmployeeData(data);
    } catch (error: any) {
      console.error('Employee data error:', error);
      setError(error.message || 'Failed to load employee data');
      // If it's an authentication error, logout
      if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Unauthorized')) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMyLeaves = async () => {
    try {
      setLoadingLeaves(true);
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      
      const userData = JSON.parse(userStr);
      if (!userData.emp_id) return;

      const response = await fetch(`http://localhost:5000/api/leaves?emp_id=${userData.emp_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMyLeaves(data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load leaves:', error);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!leaveForm.leave_type || !leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason.trim()) {
        setError('All fields are required');
        return;
      }

      // First try to get emp_id from dashboard data, then fallback to localStorage
      let empId = employeeData?.emp_id;
      
      if (!empId) {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          setError('User not found. Please login again.');
          return;
        }
        
        const userData = JSON.parse(userStr);
        empId = userData.emp_id;
      }
      
      if (!empId) {
        setError('Employee ID not found. Please contact administrator.');
        return;
      }

      const response = await fetch('http://localhost:5000/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          emp_id: empId,
          ...leaveForm
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to apply for leave');
      }

      const data = await response.json();
      setSuccess('Leave application submitted successfully! It will be reviewed by the admin.');
      setShowApplyModal(false);
      setLeaveForm({
        leave_type: 'short_leave',
        start_date: '',
        end_date: '',
        reason: ''
      });
      loadMyLeaves();
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to apply for leave');
    }
  };

  const handleQuickDateSelect = (period: string) => {
    const today = new Date();
    let startDate = '';
    let endDate = '';

    switch (period) {
      case 'today':
        startDate = endDate = today.toISOString().split('T')[0];
        break;
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        startDate = endDate = tomorrow.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = endDate = yesterday.toISOString().split('T')[0];
        break;
    }

    setDateFilter({
      startDate,
      endDate,
      quickSelect: period
    });
  };

  const clearFilters = () => {
    setDateFilter({
      startDate: '',
      endDate: '',
      quickSelect: ''
    });
  };

  const getLeaveStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status.toLowerCase()) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'viewed':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'viewed':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'short_leave':
        return 'Short Leave';
      case 'holiday':
        return 'Holiday';
      default:
        return type;
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
            {(employeeData.salary && employeeData.salary > 0) || (employeeData.bonus && employeeData.bonus > 0) ? (
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-medium text-gray-600 mb-2">Compensation</p>
                  <div className="space-y-1">
                    {employeeData.salary && employeeData.salary > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Salary:</span>
                        <span className="ml-2 text-lg font-semibold text-gray-900">
                          PKR {Number(employeeData.salary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {employeeData.bonus && employeeData.bonus > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Bonus:</span>
                        <span className="ml-2 text-lg font-semibold text-green-600">
                          +PKR {Number(employeeData.bonus).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Success/Error Messages */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Apply for Leave Button - Simple and Direct */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <Button 
            onClick={() => setShowApplyModal(true)} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 py-4 text-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Apply for Leave</span>
          </Button>
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

      {/* My Leave Applications */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">My Leave Applications</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span>{myLeaves.length} application(s)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLeaves ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading your leave applications...</span>
            </div>
          ) : myLeaves.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No leave applications found</p>
              <p className="text-sm text-gray-400 mt-1">Click "Apply for Leave" to submit your first request</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Dates</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Days</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeaves.map((leave) => (
                    <tr key={leave.leave_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {getLeaveTypeLabel(leave.leave_type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        <div className="text-sm">
                          {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{leave.days_requested}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(leave.status)}
                          <span className={getLeaveStatusBadge(leave.status)}>
                            {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(leave.applied_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Apply for Leave"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4">
          <div>
            <label htmlFor="leave_type" className="block text-sm font-medium text-gray-700 mb-1">
              Leave Type *
            </label>
            <Select
              id="leave_type"
              value={leaveForm.leave_type}
              onChange={(e) => setLeaveForm(prev => ({ ...prev, leave_type: e.target.value as any }))}
              options={[
                { value: 'short_leave', label: 'Short Leave' },
                { value: 'holiday', label: 'Holiday' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <Input
                id="start_date"
                type="date"
                value={leaveForm.start_date}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <Input
                id="end_date"
                type="date"
                value={leaveForm.end_date}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, end_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Leave * (Mandatory)
            </label>
            <textarea
              id="reason"
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Please provide the reason for your leave request..."
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowApplyModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
