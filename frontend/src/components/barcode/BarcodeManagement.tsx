import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { FixedZXingScanner } from './FixedZXingScanner';
import { QrCode, Download, RefreshCw, Users, Search, Scan } from 'lucide-react';

interface Employee {
  emp_det_id: number;
  emp_id: number;
  name: string;
  email: string;
  barcode: string | null;
  status: string;
  department_name: string;
  section_name: string;
  designation_title: string;
}

export const BarcodeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [customBarcode, setCustomBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/barcode/employees', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load employees');
      }

      const data = await response.json();
      setEmployees(data);
    } catch (error: any) {
      setError(error.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  // Open camera scanner to scan barcode from card
  const openBarcodeScanner = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowBarcodeScanner(true);
  };

  // Handle barcode scan result
  const handleBarcodeScan = async (scannedBarcode: string) => {
    if (!selectedEmployee) return;

    try {
      const response = await fetch(`http://localhost:5000/api/barcode/update/${selectedEmployee.emp_det_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ barcode: scannedBarcode })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadEmployees(); // Refresh the list
        setError('');
        setSelectedEmployee(null);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to save barcode');
    }
  };

  const updateBarcode = async () => {
    if (!selectedEmployee || !customBarcode.trim()) {
      setError('Please enter a valid barcode');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/barcode/update/${selectedEmployee.emp_det_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ barcode: customBarcode.trim() })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadEmployees(); // Refresh the list
        setShowGenerateModal(false);
        setSelectedEmployee(null);
        setCustomBarcode('');
        setError('');
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update barcode');
    }
  };

  const downloadBarcode = (employee: Employee) => {
    if (!employee.barcode) return;

    // Create a simple Code 128 barcode representation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 150;
    
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Simple barcode representation (vertical lines)
    ctx.fillStyle = 'black';
    const barWidth = 2;
    const startX = 20;
    
    // Generate pattern based on barcode string
    for (let i = 0; i < employee.barcode.length; i++) {
      const charCode = employee.barcode.charCodeAt(i);
      const pattern = charCode % 8; // Simple pattern
      
      for (let j = 0; j < pattern; j++) {
        ctx.fillRect(startX + (i * 20) + (j * 3), 20, barWidth, 80);
      }
    }
    
    // Add text
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(employee.barcode, canvas.width / 2, 120);
    ctx.fillText(employee.name, canvas.width / 2, 140);
    
    // Download
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${employee.name}_barcode.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const openCustomBarcodeModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setCustomBarcode(employee.barcode || '');
    setShowGenerateModal(true);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.barcode && emp.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    total: employees.length,
    withBarcode: employees.filter(emp => emp.barcode).length,
    withoutBarcode: employees.filter(emp => !emp.barcode).length
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
          <h2 className="text-2xl font-bold text-gray-900">Barcode Management</h2>
          <p className="text-gray-600 mt-1">Generate and manage employee barcodes for attendance</p>
        </div>
        <Button onClick={loadEmployees} className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <QrCode className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">With Barcode</p>
                <p className="text-2xl font-bold text-green-600">{stats.withBarcode}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <QrCode className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Without Barcode</p>
                <p className="text-2xl font-bold text-orange-600">{stats.withoutBarcode}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search employees by name, department, email, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Employee Barcodes</h3>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No employees found matching your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Employee</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Department</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Barcode</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.emp_det_id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{employee.name}</p>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                          <p className="text-xs text-gray-500">{employee.designation_title}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm text-gray-900">{employee.department_name}</p>
                          <p className="text-xs text-gray-600">{employee.section_name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {employee.barcode ? (
                          <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {employee.barcode}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not generated</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          employee.barcode 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {employee.barcode ? 'Ready' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          {employee.barcode ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadBarcode(employee)}
                                className="flex items-center space-x-1"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCustomBarcodeModal(employee)}
                              >
                                Edit
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => openBarcodeScanner(employee)}
                              className="flex items-center space-x-1"
                            >
                              <Scan className="w-3 h-3" />
                              <span>Scan Card</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Barcode Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          setSelectedEmployee(null);
          setCustomBarcode('');
        }}
        title={`${selectedEmployee?.barcode ? 'Edit' : 'Generate'} Barcode - ${selectedEmployee?.name}`}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="customBarcode" className="block text-sm font-medium text-gray-700 mb-1">
              Barcode Value
            </label>
            <Input
              id="customBarcode"
              value={customBarcode}
              onChange={(e) => setCustomBarcode(e.target.value)}
              placeholder="Enter custom barcode or leave empty for auto-generation"
            />
            <p className="text-xs text-gray-600 mt-1">
              Leave empty to auto-generate, or enter a custom barcode value
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowGenerateModal(false);
                setSelectedEmployee(null);
                setCustomBarcode('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={updateBarcode}>
              {selectedEmployee?.barcode ? 'Update' : 'Generate'} Barcode
            </Button>
          </div>
        </div>
      </Modal>

      {/* Barcode Scanner Modal */}
      <FixedZXingScanner
        isOpen={showBarcodeScanner}
        onClose={() => {
          setShowBarcodeScanner(false);
          setSelectedEmployee(null);
        }}
        onScan={handleBarcodeScan}
        employeeName={selectedEmployee?.name}
      />
    </div>
  );
};
