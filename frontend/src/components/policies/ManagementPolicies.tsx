import React, { useState } from 'react';
import { Shield, Clock, FileText, Calculator } from 'lucide-react';
import { Card } from '../ui/Card';
import { OvertimePolicy } from './OvertimePolicy';
import { LeavePolicySettings } from './LeavePolicySettings';
import { TaxDeductionPolicy } from './TaxDeductionPolicy';

export const ManagementPolicies: React.FC = () => {
  const [activePolicy, setActivePolicy] = useState('overtime');

  const policyTabs = [
    { id: 'overtime', label: 'Overtime Policy', icon: Clock },
    { id: 'leave', label: 'Leave Policy', icon: FileText },
    { id: 'tax', label: 'Tax Deduction Policy', icon: Calculator }
  ];

  const renderPolicyContent = () => {
    switch (activePolicy) {
      case 'overtime':
        return <OvertimePolicy />;
      case 'leave':
        return <LeavePolicySettings />;
      case 'tax':
        return <TaxDeductionPolicy />;
      default:
        return <OvertimePolicy />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">Management Policies</h1>
      </div>

      <Card>
        <div className="p-6">
          {/* Policy Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex space-x-8">
              {policyTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActivePolicy(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activePolicy === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Policy Content */}
          <div className="min-h-96">
            {renderPolicyContent()}
          </div>
        </div>
      </Card>
    </div>
  );
};
