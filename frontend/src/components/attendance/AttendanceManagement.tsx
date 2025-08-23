import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { FixedZXingScanner } from '../barcode/FixedZXingScanner';
import { Calendar, Clock, Users, CheckCircle, XCircle, Search, Filter, Scan } from 'lucide-react';

interface Employee {
  emp_id: number;
  name: string;
  department_name: string;
  designation_title: string;
  status: string;
}

interface AttendanceRecord {
  id: number;
  emp_id: number;
  employee_name: string;
  date: string;
  check_in: string;
  check_out: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  hours_worked: number;
  department_name: string;
}

export const AttendanceManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const [lastScannedEmployee, setLastScannedEmployee] = useState('');

  // Form state for adding/editing attendance
  const [attendanceForm, setAttendanceForm] = useState({
    emp_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Present' as 'Present' | 'Absent' | 'Late' | 'Half Day'
  });

  useEffect(() => {
    loadEmployees();
    loadAttendanceRecords();
  }, [selectedDate]);

  const loadEmployees = async () => {
    try {
      // Fetch only active employees (not unassigned)
      const response = await fetch('http://localhost:5000/api/employees', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load employees');
      }
      
      const data = await response.json();
      // Filter out unassigned employees and admin
      const activeEmployees = data.filter((emp: Employee) => 
        emp.status !== 'unassigned' && 
        emp.name.toLowerCase() !== 'admin'
      );
      setEmployees(activeEmployees);
    } catch (error: any) {
      setError(error.message || 'Failed to load employees');
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/attendance/date/${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load attendance records');
      }
      
      const data = await response.json();
      // Map the data to match our interface
      const mappedData = data.map((record: any) => ({
        id: record.attendance_id,
        emp_id: record.emp_id,
        employee_name: record.employee_name,
        date: record.date,
        check_in: record.check_in,
        check_out: record.check_out,
        status: record.status,
        hours_worked: record.hours_worked || 0,
        department_name: record.department_name
      }));
      
      setAttendanceRecords(mappedData);
    } catch (error: any) {
      setError(error.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttendance = (employee: Employee) => {
    setSelectedEmployee(employee);
    setAttendanceForm({
      emp_id: employee.emp_id.toString(),
      date: selectedDate,
      status: 'Present'
    });
    setShowModal(true);
  };

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          emp_id: parseInt(attendanceForm.emp_id),
          date: attendanceForm.date,
          status: attendanceForm.status
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save attendance');
      }

      // Reload attendance records to show the updated data
      await loadAttendanceRecords();
      setShowModal(false);
      setSelectedEmployee(null);
      setError(''); // Clear any previous errors
    } catch (error: any) {
      setError(error.message || 'Failed to save attendance');
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = async (barcode: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/attendance/barcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          barcode: barcode,
          date: selectedDate
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setScanResult(`✅ Attendance marked for ${data.employeeName}`);
        setLastScannedEmployee(data.employeeName);
        await loadAttendanceRecords(); // Refresh the records
        setError('');
      } else {
        setScanResult(`❌ ${data.message}`);
        if (data.employeeName) {
          setLastScannedEmployee(data.employeeName);
        }
      }
      
      // Clear scan result after 5 seconds
      setTimeout(() => {
        setScanResult('');
        setLastScannedEmployee('');
      }, 5000);
      
    } catch (error: any) {
      setScanResult(`❌ Error: ${error.message}`);
      setTimeout(() => setScanResult(''), 5000);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status.toLowerCase()) {
      case 'present':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'absent':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'late':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'half day':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'late':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = record.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.department_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const attendanceStats = {
    total: attendanceRecords.length,
    present: attendanceRecords.filter(r => r.status === 'Present').length,
    absent: attendanceRecords.filter(r => r.status === 'Absent').length,
    late: attendanceRecords.filter(r => r.status === 'Late').length
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
          <p className="text-gray-600 mt-1">Manage employee attendance and track working hours</p>
        </div>
        <div className="flex items-center space-x-4">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{attendanceStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{attendanceStats.present}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barcode Scanner Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowBarcodeScanner(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <Scan className="w-4 h-4" />
                <span>Scan Barcode</span>
              </Button>
              {scanResult && (
                <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  scanResult.includes('✅') 
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {scanResult}
                </div>
              )}
            </div>
            {lastScannedEmployee && (
              <div className="text-sm text-gray-600">
                Last scanned: <strong>{lastScannedEmployee}</strong>
              </div>
            )}
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
                  placeholder="Search employees or departments..."
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
                  { value: 'present', label: 'Present' },
                  { value: 'absent', label: 'Absent' },
                  { value: 'late', label: 'Late' },
                  { value: 'half day', label: 'Half Day' }
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List for Quick Attendance */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Quick Attendance Entry</h3>
          <p className="text-sm text-gray-600">Click on an employee to mark their attendance</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((employee) => (
              <div
                key={employee.emp_id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                onClick={() => handleAddAttendance(employee)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{employee.name}</h4>
                    <p className="text-sm text-gray-600">{employee.department_name}</p>
                    <p className="text-xs text-gray-500">{employee.designation_title}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Mark Attendance
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Attendance Records for {new Date(selectedDate).toLocaleDateString()}
          </h3>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No attendance records found for the selected date</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Employee</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Department</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {getStatusIcon(record.status)}
                          <span className="ml-3 font-medium text-gray-900">
                            {record.employee_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{record.department_name}</td>
                      <td className="py-3 px-4">
                        <span className={getStatusBadge(record.status)}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Attendance Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Mark Attendance - ${selectedEmployee?.name}`}
      >
        <form onSubmit={handleSubmitAttendance} className="space-y-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <Input
              id="date"
              type="date"
              value={attendanceForm.date}
              onChange={(e) => setAttendanceForm(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>


          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select
              id="status"
              value={attendanceForm.status}
              onChange={(e) => setAttendanceForm(prev => ({ ...prev, status: e.target.value as any }))}
              options={[
                { value: 'Present', label: 'Present' },
                { value: 'Absent', label: 'Absent' },
                { value: 'Late', label: 'Late' },
                { value: 'Half Day', label: 'Half Day' }
              ]}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Attendance
            </Button>
          </div>
        </form>
      </Modal>

      {/* Barcode Scanner Modal */}
      <FixedZXingScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScan}
        employeeName="Employee Card"
      />
    </div>
  );
};
