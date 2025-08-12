-- =============================================
-- LEAVES TABLE AND PROCEDURES FOR LEAVE MANAGEMENT
-- =============================================

USE EmployeeManagementSystem;
GO

-- Create TblLeaves Table for Leave Management
CREATE TABLE TblLeaves (
    leave_id INT PRIMARY KEY IDENTITY(1,1),
    emp_id INT NOT NULL FOREIGN KEY REFERENCES TblEmpM(emp_id) ON DELETE CASCADE,
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('short_leave', 'holiday')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INT NOT NULL,
    reason NVARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'viewed')),
    applied_date DATETIME DEFAULT GETDATE(),
    approved_by INT NULL FOREIGN KEY REFERENCES TblEmpM(emp_id) ON DELETE SET NULL,
    approved_date DATETIME NULL,
    comments NVARCHAR(500) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- Create indexes for better performance
CREATE INDEX IX_Leaves_EmpId ON TblLeaves(emp_id);
CREATE INDEX IX_Leaves_Status ON TblLeaves(status);
CREATE INDEX IX_Leaves_Dates ON TblLeaves(start_date, end_date);
GO

-- Stored Procedure: Apply for Leave
CREATE PROCEDURE sp_ApplyLeave
    @emp_id INT,
    @leave_type VARCHAR(20),
    @start_date DATE,
    @end_date DATE,
    @reason NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @days_requested INT;
    SET @days_requested = DATEDIFF(day, @start_date, @end_date) + 1;
    
    -- Validate dates
    IF @start_date > @end_date
    BEGIN
        RAISERROR('Start date cannot be after end date.', 16, 1);
        RETURN;
    END
    
    IF @start_date < CAST(GETDATE() AS DATE)
    BEGIN
        RAISERROR('Cannot apply for leave on past dates.', 16, 1);
        RETURN;
    END
    
    -- Check for overlapping leave requests
    IF EXISTS (
        SELECT 1 FROM TblLeaves 
        WHERE emp_id = @emp_id 
        AND status IN ('pending', 'approved')
        AND (
            (@start_date BETWEEN start_date AND end_date) OR
            (@end_date BETWEEN start_date AND end_date) OR
            (start_date BETWEEN @start_date AND @end_date)
        )
    )
    BEGIN
        RAISERROR('You already have a pending or approved leave for the selected dates.', 16, 1);
        RETURN;
    END
    
    INSERT INTO TblLeaves (emp_id, leave_type, start_date, end_date, days_requested, reason)
    VALUES (@emp_id, @leave_type, @start_date, @end_date, @days_requested, @reason);
    
    SELECT 'Leave application submitted successfully' as message, SCOPE_IDENTITY() as leave_id;
END;
GO

-- Stored Procedure: Get Leave Applications (Admin view)
CREATE PROCEDURE sp_GetLeaveApplications
    @status VARCHAR(20) = NULL,
    @emp_id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        l.leave_id,
        l.emp_id,
        ed.name as employee_name,
        d.name as department_name,
        des.title as designation_title,
        l.leave_type,
        l.start_date,
        l.end_date,
        l.days_requested,
        l.reason,
        l.status,
        l.applied_date,
        l.approved_by,
        approver.name as approved_by_name,
        l.approved_date,
        l.comments
    FROM TblLeaves l
    INNER JOIN TblEmpM e ON l.emp_id = e.emp_id
    INNER JOIN TblEmpS ed ON e.emp_det_id = ed.emp_det_id
    INNER JOIN TblSections s ON e.section_id = s.section_id
    INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
    INNER JOIN TblDesignations des ON e.desig_id = des.desig_id
    LEFT JOIN TblEmpM approver_emp ON l.approved_by = approver_emp.emp_id
    LEFT JOIN TblEmpS approver ON approver_emp.emp_det_id = approver.emp_det_id
    WHERE (@status IS NULL OR l.status = @status)
    AND (@emp_id IS NULL OR l.emp_id = @emp_id)
    ORDER BY l.applied_date DESC;
END;
GO

-- Stored Procedure: Update Leave Status (Admin action)
CREATE PROCEDURE sp_UpdateLeaveStatus
    @leave_id INT,
    @status VARCHAR(20),
    @approved_by INT,
    @comments NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @status NOT IN ('approved', 'rejected', 'viewed')
    BEGIN
        RAISERROR('Invalid status. Must be approved, rejected, or viewed.', 16, 1);
        RETURN;
    END
    
    UPDATE TblLeaves 
    SET status = @status,
        approved_by = @approved_by,
        approved_date = GETDATE(),
        comments = @comments,
        updated_at = GETDATE()
    WHERE leave_id = @leave_id;
    
    SELECT 'Leave status updated successfully' as message;
END;
GO

-- Stored Procedure: Get Employee's Leave History
CREATE PROCEDURE sp_GetEmployeeLeaves
    @emp_id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        l.leave_id,
        l.leave_type,
        l.start_date,
        l.end_date,
        l.days_requested,
        l.reason,
        l.status,
        l.applied_date,
        approver.name as approved_by_name,
        l.approved_date,
        l.comments
    FROM TblLeaves l
    LEFT JOIN TblEmpM approver_emp ON l.approved_by = approver_emp.emp_id
    LEFT JOIN TblEmpS approver ON approver_emp.emp_det_id = approver.emp_det_id
    WHERE l.emp_id = @emp_id
    ORDER BY l.applied_date DESC;
END;
GO

-- Stored Procedure: Get Leave Statistics
CREATE PROCEDURE sp_GetLeaveStats
    @start_date DATE = NULL,
    @end_date DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'viewed' THEN 1 ELSE 0 END) as viewed,
        SUM(CASE WHEN leave_type = 'short_leave' THEN 1 ELSE 0 END) as short_leaves,
        SUM(CASE WHEN leave_type = 'holiday' THEN 1 ELSE 0 END) as holidays
    FROM TblLeaves
    WHERE (@start_date IS NULL OR applied_date >= @start_date)
    AND (@end_date IS NULL OR applied_date <= @end_date);
END;
GO

-- Stored Procedure: Delete Leave Application (Employee can delete pending applications)
CREATE PROCEDURE sp_DeleteLeaveApplication
    @leave_id INT,
    @emp_id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if leave belongs to employee and is still pending
    IF NOT EXISTS (
        SELECT 1 FROM TblLeaves 
        WHERE leave_id = @leave_id 
        AND emp_id = @emp_id 
        AND status = 'pending'
    )
    BEGIN
        RAISERROR('Cannot delete this leave application. It may not exist, belong to another employee, or already be processed.', 16, 1);
        RETURN;
    END
    
    DELETE FROM TblLeaves WHERE leave_id = @leave_id;
    
    SELECT 'Leave application deleted successfully' as message;
END;
GO

-- Create a trigger to automatically update the updated_at field
CREATE TRIGGER trg_UpdateLeaveTimestamp
ON TblLeaves
AFTER UPDATE
AS
BEGIN
    UPDATE l
    SET updated_at = GETDATE()
    FROM TblLeaves l
    INNER JOIN inserted i ON l.leave_id = i.leave_id;
END;
GO

PRINT 'Leaves table and stored procedures created successfully!';
PRINT 'You can now use the leave management functionality.';

-- Test queries (Optional - for verification)
-- SELECT * FROM TblLeaves;
-- EXEC sp_GetLeaveStats;
-- EXEC sp_GetLeaveApplications;
