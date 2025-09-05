import React, { useState, useEffect } from 'react';
import { Calculator, Percent, Save, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import api from '../../services/api';

interface TaxPolicyData {
  policy_id: number;
  tax_enabled: boolean;
  tax_rate: number;
  tax_exemption_limit: number;
  effective_from: string;
}

export const TaxDeductionPolicy: React.FC = () => {
  const [policy, setPolicy] = useState<TaxPolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    taxEnabled: true,
    taxRate: 5.0,
    taxExemptionLimit: 0
  });

  useEffect(() => {
    fetchTaxPolicy();
  }, []);

  const fetchTaxPolicy = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/policies/tax');
      setPolicy(response.data);
      setFormData({
        taxEnabled: response.data.tax_enabled,
        taxRate: response.data.tax_rate,
        taxExemptionLimit: response.data.tax_exemption_limit
      });
    } catch (error) {
      console.error('Error fetching tax policy:', error);
      setMessage('Failed to load tax deduction policy');
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
      const response = await api.put('/policies/tax', {
        policyId: policy?.policy_id,
        taxEnabled: formData.taxEnabled,
        taxRate: formData.taxRate,
        taxExemptionLimit: formData.taxExemptionLimit
      });

      setMessage(response.data.message);
      await fetchTaxPolicy(); // Refresh data
    } catch (error: any) {
      console.error('Error updating tax policy:', error);
      setMessage(error.response?.data?.message || 'Failed to update tax deduction policy');
    } finally {
      setSaving(false);
    }
  };

  const calculateTaxExample = (salary: number) => {
    if (!formData.taxEnabled || salary <= formData.taxExemptionLimit) {
      return 0;
    }
    const taxableSalary = salary - formData.taxExemptionLimit;
    return (taxableSalary * formData.taxRate) / 100;
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
        <Calculator className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Tax Deduction Policy Configuration</h2>
      </div>


      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tax Enabled */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Tax Deduction Status
          </label>
          <div className="flex items-center space-x-3">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="taxEnabled"
                checked={formData.taxEnabled === true}
                onChange={() => setFormData(prev => ({ ...prev, taxEnabled: true }))}
                className="form-radio text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">Enabled</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="taxEnabled"
                checked={formData.taxEnabled === false}
                onChange={() => setFormData(prev => ({ ...prev, taxEnabled: false }))}
                className="form-radio text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">Disabled</span>
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Enable or disable automatic tax deduction from employee salaries
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tax Rate */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Percent className="w-4 h-4 inline mr-1" />
              Tax Rate (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.taxRate}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                taxRate: parseFloat(e.target.value) || 5.0 
              }))}
              disabled={!formData.taxEnabled}
              className="w-full"
              placeholder="5.0"
            />
            <p className="text-xs text-gray-500">
              Percentage of salary to be deducted as tax (default: 5%)
            </p>
          </div>

          {/* Tax Exemption Limit */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Tax Exemption Limit (PKR)
            </label>
            <Input
              type="number"
              min="0"
              step="1000"
              value={formData.taxExemptionLimit}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                taxExemptionLimit: parseFloat(e.target.value) || 0 
              }))}
              disabled={!formData.taxEnabled}
              className="w-full"
              placeholder="0"
            />
            <p className="text-xs text-gray-500">
              Minimum salary below which no tax will be deducted
            </p>
          </div>
        </div>

        {/* Tax Calculation Examples */}
        {formData.taxEnabled && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-3">Tax Calculation Examples</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {[50000, 75000, 100000].map((salary) => (
                <div key={salary} className="bg-white p-3 rounded border">
                  <div className="text-gray-600">Salary: PKR {salary.toLocaleString()}</div>
                  <div className="text-blue-600 font-medium">
                    Tax: PKR {calculateTaxExample(salary).toLocaleString()}
                  </div>
                  <div className="text-green-600 text-xs">
                    Net: PKR {(salary - calculateTaxExample(salary)).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Policy Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">Current Policy Summary</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              • Tax deduction: <strong>
                {formData.taxEnabled ? 'Enabled' : 'Disabled'}
              </strong>
            </p>
            {formData.taxEnabled && (
              <>
                <p>• Tax rate: <strong>{formData.taxRate}%</strong></p>
                <p>
                  • Exemption limit: <strong>
                    {formData.taxExemptionLimit > 0 
                      ? `PKR ${formData.taxExemptionLimit.toLocaleString()}` 
                      : 'No exemption'
                    }
                  </strong>
                </p>
              </>
            )}
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
