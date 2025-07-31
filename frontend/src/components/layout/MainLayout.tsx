import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Dashboard } from '../dashboard/Dashboard';
import { EmployeeDashboard } from '../dashboard/EmployeeDashboard';
import { EmployeeList } from '../employees/EmployeeList';
import { DepartmentManagement } from '../departments/DepartmentManagement';
import { RoleManagement } from '../roles/RoleManagement';
import { Settings } from '../settings/Settings';
import { useAuth } from '../../contexts/AuthContext';

export const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user } = useAuth();

  const handleManageEmployees = () => {
    setActiveTab('employees');
  };

  const renderContent = () => {
    // For employees, show only the employee dashboard
    if (user?.role === 'Employee') {
      return <EmployeeDashboard />;
    }

    // For admins, show full functionality
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onManageEmployees={handleManageEmployees} />;
      case 'employees':
        return <EmployeeList />;
      case 'departments':
        return <DepartmentManagement />;
      case 'settings':
        return <RoleManagement />;
      case 'roles':
        return <RoleManagement />;
      default:
        return <Dashboard onManageEmployees={handleManageEmployees} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};