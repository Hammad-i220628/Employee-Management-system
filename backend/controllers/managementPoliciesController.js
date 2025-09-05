const { getConnection, sql } = require('../db/connection');

// Get Overtime Policy
const getOvertimePolicy = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('company_id', sql.Int, 1)
            .execute('sp_GetOvertimePolicy');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Overtime policy not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error getting overtime policy:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Overtime Policy
const updateOvertimePolicy = async (req, res) => {
    try {
        const { policyId, overtimeAllowed, bonusEnabled, bonusRate } = req.body;
        const userId = req.user?.user_id;

        if (typeof overtimeAllowed !== 'boolean' || typeof bonusEnabled !== 'boolean') {
            return res.status(400).json({ message: 'overtimeAllowed and bonusEnabled must be boolean values' });
        }

        if (bonusRate < 0 || bonusRate > 10) {
            return res.status(400).json({ message: 'Bonus rate must be between 0 and 10' });
        }

        const pool = await getConnection();
        const result = await pool.request()
            .input('policy_id', sql.Int, policyId)
            .input('overtime_allowed', sql.Bit, overtimeAllowed)
            .input('bonus_enabled', sql.Bit, bonusEnabled)
            .input('bonus_rate', sql.Decimal(5, 2), bonusRate)
            .input('updated_by', sql.Int, userId)
            .execute('sp_UpdateOvertimePolicy');
        
        res.json({ 
            message: result.recordset[0].message,
            data: {
                overtimeAllowed,
                bonusEnabled,
                bonusRate
            }
        });
    } catch (error) {
        console.error('Error updating overtime policy:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get Leave Policy
const getLeavePolicy = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('company_id', sql.Int, 1)
            .execute('sp_GetLeavePolicy');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Leave policy not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error getting leave policy:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Leave Policy
const updateLeavePolicy = async (req, res) => {
    try {
        const { 
            policyId, 
            salaryDeductionEnabled, 
            maxAllowedLeavesPerMonth, 
            maxAllowedLeavesPerYear, 
            deductionRate 
        } = req.body;
        const userId = req.user?.user_id;

        if (typeof salaryDeductionEnabled !== 'boolean') {
            return res.status(400).json({ message: 'salaryDeductionEnabled must be a boolean value' });
        }

        if (maxAllowedLeavesPerMonth < 0 || maxAllowedLeavesPerYear < 0) {
            return res.status(400).json({ message: 'Leave limits cannot be negative' });
        }

        if (deductionRate < 0 || deductionRate > 1) {
            return res.status(400).json({ message: 'Deduction rate must be between 0 and 1' });
        }

        const pool = await getConnection();
        const result = await pool.request()
            .input('policy_id', sql.Int, policyId)
            .input('salary_deduction_enabled', sql.Bit, salaryDeductionEnabled)
            .input('max_allowed_leaves_per_month', sql.Int, maxAllowedLeavesPerMonth)
            .input('max_allowed_leaves_per_year', sql.Int, maxAllowedLeavesPerYear)
            .input('deduction_rate', sql.Decimal(5, 2), deductionRate)
            .input('updated_by', sql.Int, userId)
            .execute('sp_UpdateLeavePolicy');
        
        res.json({ 
            message: result.recordset[0].message,
            data: {
                salaryDeductionEnabled,
                maxAllowedLeavesPerMonth,
                maxAllowedLeavesPerYear,
                deductionRate
            }
        });
    } catch (error) {
        console.error('Error updating leave policy:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get Tax Deduction Policy
const getTaxDeductionPolicy = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('company_id', sql.Int, 1)
            .execute('sp_GetTaxDeductionPolicy');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Tax deduction policy not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error getting tax deduction policy:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Tax Deduction Policy
const updateTaxDeductionPolicy = async (req, res) => {
    try {
        const { policyId, taxEnabled, taxRate, taxExemptionLimit } = req.body;
        const userId = req.user?.user_id;

        if (typeof taxEnabled !== 'boolean') {
            return res.status(400).json({ message: 'taxEnabled must be a boolean value' });
        }

        if (taxRate < 0 || taxRate > 100) {
            return res.status(400).json({ message: 'Tax rate must be between 0 and 100' });
        }

        if (taxExemptionLimit < 0) {
            return res.status(400).json({ message: 'Tax exemption limit cannot be negative' });
        }

        const pool = await getConnection();
        const result = await pool.request()
            .input('policy_id', sql.Int, policyId)
            .input('tax_enabled', sql.Bit, taxEnabled)
            .input('tax_rate', sql.Decimal(5, 2), taxRate)
            .input('tax_exemption_limit', sql.Decimal(10, 2), taxExemptionLimit)
            .input('updated_by', sql.Int, userId)
            .execute('sp_UpdateTaxDeductionPolicy');
        
        res.json({ 
            message: result.recordset[0].message,
            data: {
                taxEnabled,
                taxRate,
                taxExemptionLimit
            }
        });
    } catch (error) {
        console.error('Error updating tax deduction policy:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get All Management Policies
const getAllPolicies = async (req, res) => {
    try {
        const pool = await getConnection();
        
        const [overtimeResult, leaveResult, taxResult] = await Promise.all([
            pool.request().input('company_id', sql.Int, 1).execute('sp_GetOvertimePolicy'),
            pool.request().input('company_id', sql.Int, 1).execute('sp_GetLeavePolicy'),
            pool.request().input('company_id', sql.Int, 1).execute('sp_GetTaxDeductionPolicy')
        ]);
        
        res.json({
            overtimePolicy: overtimeResult.recordset[0] || null,
            leavePolicy: leaveResult.recordset[0] || null,
            taxDeductionPolicy: taxResult.recordset[0] || null
        });
    } catch (error) {
        console.error('Error getting all policies:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get Employees with Overtime Information
const getEmployeesWithOvertime = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const pool = await getConnection();
        const result = await pool.request()
            .input('start_date', sql.Date, startDate || null)
            .input('end_date', sql.Date, endDate || null)
            .execute('sp_GetEmployeesWithOvertime');
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Error getting employees with overtime:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Add Employee Overtime
const addEmployeeOvertime = async (req, res) => {
    try {
        const { empId, date, overtimeHours, notes } = req.body;

        if (!empId || !date || overtimeHours === undefined) {
            return res.status(400).json({ message: 'Employee ID, date, and overtime hours are required' });
        }

        if (overtimeHours < 0 || overtimeHours > 24) {
            return res.status(400).json({ message: 'Overtime hours must be between 0 and 24' });
        }

        const pool = await getConnection();
        const result = await pool.request()
            .input('emp_id', sql.Int, empId)
            .input('date', sql.Date, date)
            .input('overtime_hours', sql.Decimal(4, 2), overtimeHours)
            .input('notes', sql.NVarChar(500), notes || null)
            .execute('sp_AddEmployeeOvertime');
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error adding employee overtime:', error);
        res.status(500).json({ 
            message: error.message.includes('not allowed') ? error.message : 'Internal server error' 
        });
    }
};

// Update Overtime Status (Approve/Reject)
const updateOvertimeStatus = async (req, res) => {
    try {
        const { overtimeId, status, notes } = req.body;

        if (!overtimeId || !status) {
            return res.status(400).json({ message: 'Overtime ID and status are required' });
        }

        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be approved, rejected, or pending' });
        }

        const pool = await getConnection();
        const result = await pool.request()
            .input('overtime_id', sql.Int, overtimeId)
            .input('status', sql.VarChar(20), status)
            .input('notes', sql.NVarChar(500), notes || null)
            .execute('sp_UpdateOvertimeStatus');
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error updating overtime status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getOvertimePolicy,
    updateOvertimePolicy,
    getLeavePolicy,
    updateLeavePolicy,
    getTaxDeductionPolicy,
    updateTaxDeductionPolicy,
    getAllPolicies,
    getEmployeesWithOvertime,
    addEmployeeOvertime,
    updateOvertimeStatus
};
