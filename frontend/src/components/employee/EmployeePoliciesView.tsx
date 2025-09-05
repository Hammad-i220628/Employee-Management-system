import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Clock, FileText, Calculator, AlertCircle, DollarSign, Percent, Scissors } from 'lucide-react';
import api from '../../services/api';

interface OvertimePolicyData {
  policy_id: number;
  overtime_allowed: boolean;
  bonus_enabled: boolean;
  bonus_rate: number;
  standard_work_hours: number;
  overtime_threshold_minutes: number;
}

interface LeavePolicyData {
  policy_id: number;
  salary_deduction_enabled: boolean;
  max_allowed_leaves_per_month: number;
  max_allowed_leaves_per_year: number;
  deduction_rate: number;
  grace_period_days: number;
}

interface TaxPolicyData {
  policy_id: number;
  tax_enabled: boolean;
  tax_rate: number;
  tax_exemption_limit: number;
  effective_from: string;
}

export const EmployeePoliciesView: React.FC = () => {
  const [overtimePolicy, setOvertimePolicy] = useState<OvertimePolicyData | null>(null);
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicyData | null>(null);
  const [taxPolicy, setTaxPolicy] = useState<TaxPolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch all policies in parallel using employee-accessible routes
      const [overtimeResponse, leaveResponse, taxResponse] = await Promise.all([
        api.get('/policies/view/overtime'),
        api.get('/policies/view/leave'),
        api.get('/policies/view/tax')
      ]);

      setOvertimePolicy(overtimeResponse.data);
      setLeavePolicy(leaveResponse.data);
      setTaxPolicy(taxResponse.data);
    } catch (error: any) {
      console.error('Error fetching policies:', error);
      setError('Failed to load company policies');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Company Policies</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading policies...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Company Policies</h3>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 inline mr-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Company Policies</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Overtime Policy */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-800">Overtime Policy</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Overtime Work</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    overtimePolicy?.overtime_allowed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {overtimePolicy?.overtime_allowed ? 'Allowed' : 'Not Allowed'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {overtimePolicy?.overtime_allowed 
                    ? 'You can work beyond standard hours' 
                    : 'Work is restricted to standard hours only'
                  }
                </p>
              </div>

              {overtimePolicy?.overtime_allowed && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Overtime Bonus</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      overtimePolicy?.bonus_enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {overtimePolicy?.bonus_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {overtimePolicy?.bonus_enabled && (
                    <p className="text-xs text-gray-600 mt-1">
                      Bonus Rate: <strong>{overtimePolicy?.bonus_rate}x</strong> regular hourly rate
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Standard Work Hours:</strong> {overtimePolicy?.standard_work_hours || 8} hours per day
              </p>
            </div>
          </div>

          {/* Leave Policy */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <Scissors className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-gray-800">Leave Policy</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {leavePolicy?.max_allowed_leaves_per_month || 0}
                  </div>
                  <div className="text-sm text-gray-600">Days per month</div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {leavePolicy?.max_allowed_leaves_per_year || 0}
                  </div>
                  <div className="text-sm text-gray-600">Days per year</div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-center">
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                    overtimePolicy?.deduction_enabled
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {overtimePolicy?.deduction_enabled ? 'Deduction Enabled' : 'No Deduction'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">For excess overtime</div>
                </div>
              </div>
            </div>

            {leavePolicy?.salary_deduction_enabled && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Excess Leave Deduction:</strong> {(leavePolicy.deduction_rate * 100)}% of daily salary 
                  per day for leaves exceeding the allowed limit
                </p>
              </div>
            )}
          </div>

          {/* Tax Policy */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <Calculator className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-800">Tax Deduction Policy</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Tax Deduction</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    taxPolicy?.tax_enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {taxPolicy?.tax_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {taxPolicy?.tax_enabled && (
                  <p className="text-xs text-gray-600 mt-1">
                    Tax Rate: <strong>{taxPolicy?.tax_rate}%</strong> of salary
                  </p>
                )}
              </div>

              {taxPolicy?.tax_enabled && taxPolicy?.tax_exemption_limit > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Tax Exemption Limit</span>
                  <div className="text-lg font-bold text-green-600">
                    PKR {taxPolicy?.tax_exemption_limit.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500">No tax below this amount</p>
                </div>
              )}
            </div>

            {taxPolicy?.tax_enabled && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Tax Calculation:</strong> {taxPolicy?.tax_rate}% of your salary 
                  {taxPolicy?.tax_exemption_limit > 0 && (
                    <> above PKR {taxPolicy.tax_exemption_limit.toLocaleString()}</>
                  )} 
                  will be automatically deducted
                </p>
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
};
