import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, Users, CheckCircle, XCircle, Search, Filter, Plus, AlertCircle, FileText } from 'lucide-react';

interface LeaveApplication {
  leave_id: number;
  emp_id: number;
  employee_name: string;
  department_name: string;
  designation_title: string;
  leave_type: 'short_leave' | 'holiday';
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'viewed';
  applied_date: string;
  approved_by?: number;
  approved_by_name?: string;
  approved_date?: string;
  comments?: string;
}

interface LeaveStats {
  total_applications: number;
  pending: number;
  approved: number;
  rejected: number;
  viewed: number;
  short_leaves: number;
  holidays: number;
}

export const LeaveManagement: React.FC = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    quickSelect: ''
  });

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);

  // Stats
  const [stats, setStats] = useState<LeaveStats>({
    total_applications: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    viewed: 0,
    short_leaves: 0,
    holidays: 0
  });

  // Form state for leave application
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'short_leave' as 'short_leave' | 'holiday',
    start_date: '',
    end_date: '',
    reason: ''
  });

  // Status update form
  const [statusForm, setStatusForm] = useState({
    status: 'viewed' as 'approved' | 'rejected' | 'viewed',
    comments: ''
  });

  useEffect(() => {
    loadLeaves();
    loadStats();
  }, [statusFilter, typeFilter]);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:5000/api/leaves';
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load leave applications');
      }
      
      const data = await response.json();
      setLeaves(data.data || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load leave applications');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/leaves/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load leave statistics');
      }
      
      const data = await response.json();
      setStats(data.data || stats);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!leaveForm.leave_type || !leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason.trim()) {
        setError('All fields are required');
        return;
      }

      // Get current user's emp_id from localStorage or context
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setError('User not found. Please login again.');
        return;
      }
      
      const user = JSON.parse(userStr);
      if (!user.emp_id) {
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
          emp_id: user.emp_id,
          ...leaveForm
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to apply for leave');
      }

      const data = await response.json();
      setSuccess(data.message || 'Leave application submitted successfully');
      setShowApplyModal(false);
      setLeaveForm({
        leave_type: 'short_leave',
        start_date: '',
        end_date: '',
        reason: ''
      });
      loadLeaves();
      loadStats();
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to apply for leave');
    }
  };

  const handleStatusUpdate = async (leaveId: number) => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setError('User not found. Please login again.');
        return;
      }
      
      const user = JSON.parse(userStr);
      if (!user.emp_id) {
        setError('Employee ID not found. Please contact administrator.');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/leaves/${leaveId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: statusForm.status,
          approved_by: user.emp_id,
          comments: statusForm.comments
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update leave status');
      }

      const data = await response.json();
      setSuccess(data.message || 'Leave status updated successfully');
      setShowDetailsModal(false);
      setSelectedLeave(null);
      loadLeaves();
      loadStats();
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to update leave status');
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
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFilter({
      startDate: '',
      endDate: '',
      quickSelect: ''
    });
  };

  const getStatusBadge = (status: string) => {
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

  const filteredLeaves = leaves.filter(leave => {
    const matchesSearch = leave.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         leave.department_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         leave.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
    const matchesType = typeFilter === 'all' || leave.leave_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
          <p className="text-gray-600 mt-1">
            {user?.role === 'Admin' 
              ? 'Manage and review employee leave applications' 
              : 'Apply for leave and track your applications'}
          </p>
        </div>
        {/* Apply for Leave button removed - only available in Employee Dashboard */}
      </div>

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

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_applications}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Range</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="e.g., Today, Tomorrow, Yesterday"
                value={dateFilter.quickSelect}
                onChange={(e) => setDateFilter(prev => ({ ...prev, quickSelect: e.target.value }))}
                className="flex-1"
              />
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            
            {/* Quick Select Buttons */}
            <div className="flex flex-wrap gap-2">
              {['Today', 'Tomorrow', 'Yesterday'].map((period) => (
                <Button
                  key={period}
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickDateSelect(period.toLowerCase())}
                  className={dateFilter.quickSelect === period.toLowerCase() ? 'bg-blue-50 border-blue-300' : ''}
                >
                  {period}
                </Button>
              ))}
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Date</label>
                <Input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value, quickSelect: '' }))}
                  placeholder="mm/dd/yyyy"
                />
              </div>
            </div>

            {/* Apply for Leave Button - Removed for Admin users */}

            {/* Clear Filter Button */}
            <Button onClick={clearFilters} variant="outline" className="w-full">
              Clear Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search employees, departments, or reasons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'viewed', label: 'Viewed' }
                ]}
              />
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'short_leave', label: 'Short Leave' },
                  { value: 'holiday', label: 'Holiday' }
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Applications */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Leave Applications</h3>
        </CardHeader>
        <CardContent>
          {filteredLeaves.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No leave applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Employee</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Dates</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Days</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map((leave) => (
                    <tr key={leave.leave_id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{leave.employee_name}</div>
                          <div className="text-sm text-gray-600">{leave.department_name}</div>
                        </div>
                      </td>
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
                          <span className={getStatusBadge(leave.status)}>
                            {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLeave(leave);
                            setShowDetailsModal(true);
                          }}
                        >
                          View Details
                        </Button>
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

      {/* Leave Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Leave Application Details - ${selectedLeave?.employee_name}`}
      >
        {selectedLeave && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee</label>
                <p className="text-gray-900">{selectedLeave.employee_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <p className="text-gray-900">{selectedLeave.department_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Leave Type</label>
                <p className="text-gray-900">{getLeaveTypeLabel(selectedLeave.leave_type)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Days Requested</label>
                <p className="text-gray-900">{selectedLeave.days_requested}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <p className="text-gray-900">{new Date(selectedLeave.start_date).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <p className="text-gray-900">{new Date(selectedLeave.end_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{selectedLeave.reason}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Current Status</label>
              <div className="flex items-center space-x-2">
                {getStatusIcon(selectedLeave.status)}
                <span className={getStatusBadge(selectedLeave.status)}>
                  {selectedLeave.status.charAt(0).toUpperCase() + selectedLeave.status.slice(1)}
                </span>
              </div>
            </div>

            {selectedLeave.approved_by_name && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Approved/Reviewed By</label>
                <p className="text-gray-900">{selectedLeave.approved_by_name}</p>
              </div>
            )}

            {selectedLeave.comments && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Admin Comments</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{selectedLeave.comments}</p>
              </div>
            )}

            {/* Admin Status Update Section */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Update Status (Admin Only)</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Status
                  </label>
                  <Select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm(prev => ({ ...prev, status: e.target.value as any }))}
                    options={[
                      { value: 'viewed', label: 'Viewed' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comments (Optional)
                  </label>
                  <textarea
                    value={statusForm.comments}
                    onChange={(e) => setStatusForm(prev => ({ ...prev, comments: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Add any comments for the employee..."
                  />
                </div>

                <Button
                  onClick={() => handleStatusUpdate(selectedLeave.leave_id)}
                  className="w-full"
                >
                  Update Status
                </Button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
