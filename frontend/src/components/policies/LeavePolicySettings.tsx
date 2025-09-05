import React, { useState, useEffect } from 'react';
import { FileText, Scissors, Save, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import api from '../../services/api';

interface LeavePolicyData {
  policy_id: number;
  salary_deduction_enabled: boolean;
  max_allowed_leaves_per_month: number;
  max_allowed_leaves_per_year: number;
  deduction_rate: number;
  grace_period_days: number;
}

export const LeavePolicySettings: React.FC = () => {
  const [policy, setPolicy] = useState<LeavePolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    salaryDeductionEnabled: false,
    maxAllowedLeavesPerMonth: 2,
    maxAllowedLeavesPerYear: 24,
    deductionRate: 1.0
  });

  useEffect(() => {
    fetchLeavePolicy();
  }, []);

  const fetchLeavePolicy = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/policies/leave');
      setPolicy(response.data);
      setFormData({
        salaryDeductionEnabled: response.data.salary_deduction_enabled,
        maxAllowedLeavesPerMonth: response.data.max_allowed_leaves_per_month,
        maxAllowedLeavesPerYear: response.data.max_allowed_leaves_per_year,
        deductionRate: response.data.deduction_rate
      });
    } catch (error) {
      console.error('Error fetching leave policy:', error);
      setMessage('Failed to load leave policy');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await api.put('/policies/leave', {
        policyId: policy?.policy_id,
        salaryDeductionEnabled: formData.salaryDeductionEnabled,
        maxAllowedLeavesPerMonth: formData.maxAllowedLeavesPerMonth,
        maxAllowedLeavesPerYear: formData.maxAllowedLeavesPerYear,
        deductionRate: formData.deductionRate
      });

      setMessage(response.data.message);
      await fetchLeavePolicy(); // Refresh data
    } catch (error: any) {
      console.error('Error updating leave policy:', error);
      setMessage(error.response?.data?.message || 'Failed to update leave policy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Leave Policy Configuration</h2>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">About Leave Policy</h3>
            <p className="text-blue-700 text-sm mt-1">
              Configure leave limits and salary deduction settings for employees who exceed 
              their allowed leave quota. This helps maintain attendance discipline.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Salary Deduction Enabled */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Scissors className="w-4 h-4 inline mr-1" />
              Salary Deduction for Excess Leaves
            </label>
            <div className="flex items-center space-x-3">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="salaryDeductionEnabled"
                  checked={formData.salaryDeductionEnabled === true}
                  onChange={() => setFormData(prev => ({ ...prev, salaryDeductionEnabled: true }))}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">Enabled</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="salaryDeductionEnabled"
                  checked={formData.salaryDeductionEnabled === false}
                  onChange={() => setFormData(prev => ({ ...prev, salaryDeductionEnabled: false }))}
                  className="form-radio text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">Disabled</span>
              </label>
            </div>
            <p className="text-xs text-gray-500">
              Automatically deduct salary for leaves exceeding the allowed limit
            </p>
          </div>

          {/* Deduction Rate */}
          {formData.salaryDeductionEnabled && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Deduction Rate (Per Day)
              </label>
              <Input
                type="number"
                min="0.1"
                max="1"
                step="0.1"
                value={formData.deductionRate}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  deductionRate: parseFloat(e.target.value) || 1.0 
                }))}
                className="w-full"
                placeholder="1.0"
              />
              <p className="text-xs text-gray-500">
                1.0 = Full day salary deduction, 0.5 = Half day salary deduction
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Max Leaves Per Month */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Maximum Leaves Per Month
            </label>
            <Input
              type="number"
              min="0"
              max="31"
              value={formData.maxAllowedLeavesPerMonth}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                maxAllowedLeavesPerMonth: parseInt(e.target.value) || 2 
              }))}
              className="w-full"
              placeholder="2"
            />
            <p className="text-xs text-gray-500">
              Number of leaves allowed per month without deduction
            </p>
          </div>

          {/* Max Leaves Per Year */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Maximum Leaves Per Year
            </label>
            <Input
              type="number"
              min="0"
              max="365"
              value={formData.maxAllowedLeavesPerYear}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                maxAllowedLeavesPerYear: parseInt(e.target.value) || 24 
              }))}
              className="w-full"
              placeholder="24"
            />
            <p className="text-xs text-gray-500">
              Total leaves allowed per year without deduction
            </p>
          </div>
        </div>

        {/* Policy Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">Policy Summary</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• Monthly leave limit: <strong>{formData.maxAllowedLeavesPerMonth} days</strong></p>
            <p>• Annual leave limit: <strong>{formData.maxAllowedLeavesPerYear} days</strong></p>
            <p>
              • Salary deduction: <strong>
                {formData.salaryDeductionEnabled 
                  ? `${(formData.deductionRate * 100)}% of daily salary for each excess day`
                  : 'Disabled'
                }
              </strong>
            </p>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg ${
            message.includes('success') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Policy'}
          </Button>
        </div>
      </form>
    </div>
  );
};
