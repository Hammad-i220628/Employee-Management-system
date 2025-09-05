import React from 'react';
import { Users, Building, Settings, BarChart3, Award, User, Clock, FileText, QrCode, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  
  // Define different menu items based on user role
  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'departments', label: 'Department & Sections', icon: Building },
    { id: 'settings', label: 'Roles & Designation', icon: Award },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'barcodes', label: 'Barcode Management', icon: QrCode },
    { id: 'leaves', label: 'Leave Management', icon: FileText },
    { id: 'policies', label: 'Management Policies', icon: Shield }
  ];
  
  const employeeMenuItems = [
    { id: 'dashboard', label: 'My Profile', icon: User }
  ];
  
  const menuItems = user?.role === 'Employee' ? employeeMenuItems : adminMenuItems;

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 h-full">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Navigation</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};