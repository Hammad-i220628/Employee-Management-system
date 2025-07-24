import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Dashboard } from '../dashboard/Dashboard';
import { EmployeeList } from '../employees/EmployeeList';
import { DepartmentManagement } from '../departments/DepartmentManagement';
import { Settings } from '../settings/Settings';

export const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleManageEmployees = () => {
    setActiveTab('employees');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onManageEmployees={handleManageEmployees} />;
      case 'employees':
        return <EmployeeList />;
      case 'departments':
        return <DepartmentManagement />;
      case 'settings':
        return <Settings />;
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