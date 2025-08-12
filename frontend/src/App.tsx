import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { EmployeeList } from './components/employees/EmployeeList';
import { DepartmentManagement } from './components/departments/DepartmentManagement';
import { Settings } from './components/settings/Settings';
import { EmployeeDashboard } from './components/dashboard/EmployeeDashboard';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();

  // Debug info - remove this in production
  console.log('App Debug:', {
    isAuthenticated,
    loading,
    user,
    token: localStorage.getItem('token'),
    savedUser: localStorage.getItem('user')
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Role-based dashboard
  if (user?.role === 'Admin') {
    return <MainLayout />; // Use MainLayout for admin
  }
  if (user?.role === 'Employee') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EmployeeDashboard />
        </div>
      </div>
    );
  }

  // Default fallback
  return <MainLayout />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;