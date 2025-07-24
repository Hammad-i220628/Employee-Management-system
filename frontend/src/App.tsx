import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { EmployeeList } from './components/employees/EmployeeList';
import { DepartmentManagement } from './components/departments/DepartmentManagement';
import { Settings } from './components/settings/Settings';

// Placeholder EmployeeDashboard (can be replaced with a real one)
const EmployeeDashboard: React.FC = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold mb-4">Employee Dashboard</h2>
    <p>Welcome! You can view and update your own data here.</p>
  </div>
);

const AppContent: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();

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
    return <EmployeeDashboard />;
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