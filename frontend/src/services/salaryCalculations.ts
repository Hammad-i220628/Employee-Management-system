import { policiesAPI } from './api';

export interface PolicyData {
  overtimePolicy?: {
    overtime_allowed: boolean;
    bonus_enabled: boolean;
    bonus_rate: number;
    standard_work_hours: number;
    overtime_threshold_minutes: number;
  };
  leavePolicy?: {
    salary_deduction_enabled: boolean;
    max_allowed_leaves_per_month: number;
    max_allowed_leaves_per_year: number;
    deduction_rate: number;
  };
  taxPolicy?: {
    tax_enabled: boolean;
    tax_rate: number;
    tax_exemption_limit: number;
  };
}

export interface SalaryCalculationInput {
  baseSalary: number;
  workingDaysInMonth: number;
  actualWorkingDays: number;
  overtimeHours?: number;
  leavesTaken?: number;
  policies: PolicyData;
}

export interface SalaryBreakdown {
  baseSalary: number;
  dailySalary: number;
  overtimeAmount: number;
  leaveDeduction: number;
  taxDeduction: number;
  grossSalary: number;
  netSalary: number;
  deductions: {
    leaves: number;
    tax: number;
    total: number;
  };
  additions: {
    overtime: number;
    total: number;
  };
}

/**
 * Calculate comprehensive salary breakdown including policies
 */
export const calculateSalary = (input: SalaryCalculationInput): SalaryBreakdown => {
  const { baseSalary, workingDaysInMonth, actualWorkingDays, overtimeHours = 0, leavesTaken = 0, policies } = input;
  
  const dailySalary = baseSalary / workingDaysInMonth;
  
  // Calculate overtime amount
  let overtimeAmount = 0;
  if (policies.overtimePolicy?.overtime_allowed && policies.overtimePolicy?.bonus_enabled && overtimeHours > 0) {
    const hourlyRate = baseSalary / (workingDaysInMonth * policies.overtimePolicy.standard_work_hours);
    overtimeAmount = overtimeHours * hourlyRate * policies.overtimePolicy.bonus_rate;
  }
  
  // Calculate leave deduction
  let leaveDeduction = 0;
  if (policies.leavePolicy?.salary_deduction_enabled && leavesTaken > 0) {
    const maxAllowedLeaves = policies.leavePolicy.max_allowed_leaves_per_month;
    const excessLeaves = Math.max(0, leavesTaken - maxAllowedLeaves);
    leaveDeduction = excessLeaves * dailySalary * policies.leavePolicy.deduction_rate;
  }
  
  // Calculate gross salary (base + overtime - leave deductions)
  const grossSalary = baseSalary + overtimeAmount - leaveDeduction;
  
  // Calculate tax deduction
  let taxDeduction = 0;
  if (policies.taxPolicy?.tax_enabled) {
    const taxableSalary = Math.max(0, grossSalary - (policies.taxPolicy.tax_exemption_limit || 0));
    taxDeduction = (taxableSalary * policies.taxPolicy.tax_rate) / 100;
  }
  
  // Calculate net salary
  const netSalary = grossSalary - taxDeduction;
  
  return {
    baseSalary,
    dailySalary,
    overtimeAmount,
    leaveDeduction,
    taxDeduction,
    grossSalary,
    netSalary,
    deductions: {
      leaves: leaveDeduction,
      tax: taxDeduction,
      total: leaveDeduction + taxDeduction
    },
    additions: {
      overtime: overtimeAmount,
      total: overtimeAmount
    }
  };
};

/**
 * Get current policies for salary calculations
 */
export const getCurrentPolicies = async (): Promise<PolicyData> => {
  try {
    const allPolicies = await policiesAPI.getAll();
    return {
      overtimePolicy: allPolicies.overtimePolicy,
      leavePolicy: allPolicies.leavePolicy,
      taxPolicy: allPolicies.taxDeductionPolicy
    };
  } catch (error) {
    console.error('Error fetching policies for salary calculation:', error);
    // Return default policies if API fails
    return {
      overtimePolicy: {
        overtime_allowed: false,
        bonus_enabled: false,
        bonus_rate: 1.5,
        standard_work_hours: 8,
        overtime_threshold_minutes: 480
      },
      leavePolicy: {
        salary_deduction_enabled: false,
        max_allowed_leaves_per_month: 2,
        max_allowed_leaves_per_year: 24,
        deduction_rate: 1.0
      },
      taxPolicy: {
        tax_enabled: true,
        tax_rate: 5.0,
        tax_exemption_limit: 0
      }
    };
  }
};

/**
 * Validate if overtime is allowed based on policy
 */
export const isOvertimeAllowed = (policies: PolicyData): boolean => {
  return policies.overtimePolicy?.overtime_allowed || false;
};

/**
 * Calculate overtime bonus rate
 */
export const getOvertimeBonusRate = (policies: PolicyData): number => {
  if (!policies.overtimePolicy?.overtime_allowed || !policies.overtimePolicy?.bonus_enabled) {
    return 1.0; // Normal rate, no bonus
  }
  return policies.overtimePolicy.bonus_rate;
};

/**
 * Check if leave will result in salary deduction
 */
export const willLeaveResultInDeduction = (
  leavesThisMonth: number, 
  policies: PolicyData
): boolean => {
  if (!policies.leavePolicy?.salary_deduction_enabled) {
    return false;
  }
  return leavesThisMonth > (policies.leavePolicy.max_allowed_leaves_per_month || 0);
};

/**
 * Calculate tax for a given salary amount
 */
export const calculateTaxAmount = (salary: number, policies: PolicyData): number => {
  if (!policies.taxPolicy?.tax_enabled) {
    return 0;
  }
  
  const taxableSalary = Math.max(0, salary - (policies.taxPolicy.tax_exemption_limit || 0));
  return (taxableSalary * policies.taxPolicy.tax_rate) / 100;
};
