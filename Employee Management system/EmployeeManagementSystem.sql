-- Create Database
CREATE DATABASE EmployeeManagementSystem;
GO

USE EmployeeManagementSystem;
GO

-- TblUsers Table (renamed from Users)
CREATE TABLE TblUsers (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'Employee'
);
GO

-- Enforce only one Admin user
CREATE UNIQUE INDEX UX_SingleAdminUser ON TblUsers(role)
WHERE role = 'Admin';
GO

-- TblDepartments Table (renamed from Departments)
CREATE TABLE TblDepartments (
    dept_id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(100) NOT NULL
);
GO

-- TblSections Table (renamed from Sections)
CREATE TABLE TblSections (
    section_id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(100) NOT NULL,
    dept_id INT NOT NULL FOREIGN KEY REFERENCES TblDepartments(dept_id)
);
GO

-- TblRoles Table (renamed from Roles)
CREATE TABLE TblRoles (
    role_id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(100) NOT NULL
);
GO

-- TblDesignations Table (renamed from Designations)
CREATE TABLE TblDesignations (
    desig_id INT PRIMARY KEY IDENTITY(1,1),
    title VARCHAR(100) NOT NULL,
    role_id INT NOT NULL FOREIGN KEY REFERENCES TblRoles(role_id)
);
GO

-- TblEmpS Table (renamed from EmployeeDetails - Fixed information)
CREATE TABLE TblEmpS (
    emp_det_id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(100) NOT NULL,
    cnic VARCHAR(15) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NULL -- Code 128 barcode for attendance
);
GO

-- TblEmpM Table (renamed from Employees - Editable information)
CREATE TABLE TblEmpM (
    emp_id INT PRIMARY KEY IDENTITY(1,1),
    emp_det_id INT NOT NULL FOREIGN KEY REFERENCES TblEmpS(emp_det_id),
    section_id INT NOT NULL FOREIGN KEY REFERENCES TblSections(section_id),
    desig_id INT NOT NULL FOREIGN KEY REFERENCES TblDesignations(desig_id),
    type VARCHAR(10) CHECK (type IN ('fixed', 'editable')) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    work_start_time TIME DEFAULT '09:00:00' NOT NULL,
    work_end_time TIME DEFAULT '17:00:00' NOT NULL,
    salary DECIMAL(10, 2) DEFAULT 50000.00 NOT NULL,
    bonus DECIMAL(10, 2) DEFAULT 0.00
);
GO

-- TblAttendance Table - Employee Attendance Management
CREATE TABLE TblAttendance (
    attendance_id INT PRIMARY KEY IDENTITY(1,1),
    emp_id INT NOT NULL FOREIGN KEY REFERENCES TblEmpM(emp_id),
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Late', 'Half Day')),
    notes VARCHAR(500),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_EmpAttendance_Date UNIQUE(emp_id, date)
);
GO

-- Create index on attendance table for better performance
CREATE INDEX IX_Attendance_Date_EmpId ON TblAttendance(date, emp_id);
CREATE INDEX IX_Attendance_Status ON TblAttendance(status);
GO

-- Stored Procedure: Register User
CREATE PROCEDURE sp_RegisterUser
    @username VARCHAR(50),
    @email VARCHAR(100),
    @password_hash VARCHAR(255),
    @role VARCHAR(20)
AS
BEGIN
    INSERT INTO TblUsers (username, email, password_hash, role)
    VALUES (@username, @email, @password_hash, @role);
END;
GO

-- Stored Procedure: Login User
CREATE PROCEDURE sp_LoginUser
    @username VARCHAR(50),
    @password_hash VARCHAR(255)
AS
BEGIN
    SELECT * FROM TblUsers
    WHERE username = @username AND password_hash = @password_hash;
END;
GO

-- Stored Procedure: Add EmployeeDetails (Fixed information)
CREATE PROCEDURE sp_AddEmployeeDetails
    @name VARCHAR(100),
    @cnic VARCHAR(15),
    @start_date DATE,
    @email VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO TblEmpS (name, cnic, start_date, email)
    VALUES (@name, @cnic, @start_date, @email);

    SELECT SCOPE_IDENTITY() AS emp_det_id;
END;
GO

-- Stored Procedure: Add Employee (Editable information)
CREATE PROCEDURE sp_AddEmployee
    @emp_det_id INT,
    @section_id INT,
    @desig_id INT,
    @type VARCHAR(10),
    @work_start_time TIME = '09:00:00',
    @work_end_time TIME = '17:00:00',
    @salary DECIMAL(10, 2) = 50000.00,
    @bonus DECIMAL(10, 2) = 0.00
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO TblEmpM (emp_det_id, section_id, desig_id, type, work_start_time, work_end_time, salary, bonus)
    VALUES (@emp_det_id, @section_id, @desig_id, @type, @work_start_time, @work_end_time, @salary, @bonus);
    
    SELECT SCOPE_IDENTITY() AS emp_id;
END;
GO

-- Stored Procedure: Update Employee (Only editable fields)
CREATE PROCEDURE sp_UpdateEmployee
    @user_email VARCHAR(100),
    @emp_id INT,
    @section_id INT,
    @desig_id INT,
    @work_start_time TIME = NULL,
    @work_end_time TIME = NULL,
    @salary DECIMAL(10, 2) = NULL,
    @bonus DECIMAL(10, 2) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @user_role VARCHAR(20);

    SELECT @user_role = role FROM TblUsers WHERE email = @user_email;

    IF @user_role <> 'Admin'
    BEGIN
        RAISERROR('Only admin is allowed to update employee data.', 16, 1);
        RETURN;
    END

    UPDATE TblEmpM
    SET section_id = @section_id,
        desig_id = @desig_id,
        work_start_time = COALESCE(@work_start_time, work_start_time),
        work_end_time = COALESCE(@work_end_time, work_end_time),
        salary = COALESCE(@salary, salary),
        bonus = COALESCE(@bonus, bonus)
    WHERE emp_id = @emp_id;
END;
GO

-- Trigger: Update Status on Role Change
CREATE TRIGGER trg_UpdateStatus
ON TblEmpM
AFTER UPDATE
AS
BEGIN
    UPDATE e
    SET status = 'Changed'
    FROM TblEmpM e
    INNER JOIN inserted i ON e.emp_id = i.emp_id
    INNER JOIN deleted d ON e.emp_id = d.emp_id
    WHERE (
        i.section_id <> d.section_id OR
        i.desig_id <> d.desig_id
    );
END;
GO

-- Stored Procedure: Add or Update Attendance
CREATE PROCEDURE sp_AddOrUpdateAttendance
    @emp_id INT,
    @date DATE,
    @check_in TIME = NULL,
    @check_out TIME = NULL,
    @status VARCHAR(20) = 'Present',
    @notes VARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if record exists
    IF EXISTS (SELECT 1 FROM TblAttendance WHERE emp_id = @emp_id AND date = @date)
    BEGIN
        -- Update existing record
        UPDATE TblAttendance 
        SET status = @status,
            notes = @notes,
            updated_at = GETDATE()
        WHERE emp_id = @emp_id AND date = @date;
        
        SELECT 'Attendance updated successfully' as message;
    END
    ELSE
    BEGIN
        -- Insert new record
        INSERT INTO TblAttendance (emp_id, date, status, notes)
        VALUES (@emp_id, @date, @status, @notes);
        
        SELECT 'Attendance added successfully' as message;
    END
END;
GO

-- Stored Procedure: Get Attendance by Date
CREATE PROCEDURE sp_GetAttendanceByDate
    @date DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        a.attendance_id,
        a.emp_id,
        a.date,
        a.status,
        a.notes,
        ed.name as employee_name,
        d.name as department_name,
        des.title as designation_title
    FROM TblAttendance a
    INNER JOIN TblEmpM e ON a.emp_id = e.emp_id
    INNER JOIN TblEmpS ed ON e.emp_det_id = ed.emp_det_id
    INNER JOIN TblSections s ON e.section_id = s.section_id
    INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
    INNER JOIN TblDesignations des ON e.desig_id = des.desig_id
    WHERE a.date = @date
    ORDER BY ed.name;
END;
GO

-- Stored Procedure: Get Attendance Statistics
CREATE PROCEDURE sp_GetAttendanceStats
    @date DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) as half_day
    FROM TblAttendance 
    WHERE date = @date;
END;
GO

-- Stored Procedure: Delete Attendance
CREATE PROCEDURE sp_DeleteAttendance
    @attendance_id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DELETE FROM TblAttendance WHERE attendance_id = @attendance_id;
    
    SELECT 'Attendance record deleted successfully' as message;
END;
GO

-- Stored Procedure: Get Employee Attendance Report
CREATE PROCEDURE sp_GetEmployeeAttendanceReport
    @emp_id INT,
    @start_date DATE = NULL,
    @end_date DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        a.attendance_id,
        a.date,
        a.status,
        a.notes,
        ed.name as employee_name,
        d.name as department_name
    FROM TblAttendance a
    INNER JOIN TblEmpM e ON a.emp_id = e.emp_id
    INNER JOIN TblEmpS ed ON e.emp_det_id = ed.emp_det_id
    INNER JOIN TblSections s ON e.section_id = s.section_id
    INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
    WHERE a.emp_id = @emp_id
    AND (@start_date IS NULL OR a.date >= @start_date)
    AND (@end_date IS NULL OR a.date <= @end_date)
    ORDER BY a.date DESC;
END;
GO

-- =============================================
-- BARCODE MANAGEMENT PROCEDURES
-- =============================================

-- Stored Procedure: Generate Barcode for Employee
CREATE PROCEDURE sp_GenerateEmployeeBarcode
    @emp_det_id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @barcode VARCHAR(100);
    DECLARE @emp_id_str VARCHAR(10);
    DECLARE @random_suffix VARCHAR(10);
    
    -- Generate barcode using employee ID and random suffix
    SET @emp_id_str = RIGHT('0000' + CAST(@emp_det_id AS VARCHAR(10)), 4);
    SET @random_suffix = RIGHT('000000' + CAST(ABS(CHECKSUM(NEWID())) % 1000000 AS VARCHAR(6)), 6);
    SET @barcode = 'EMP' + @emp_id_str + @random_suffix;
    
    -- Update employee with barcode
    UPDATE TblEmpS 
    SET barcode = @barcode 
    WHERE emp_det_id = @emp_det_id;
    
    SELECT @barcode as barcode, 'Barcode generated successfully' as message;
END;
GO

-- Stored Procedure: Update Employee Barcode
CREATE PROCEDURE sp_UpdateEmployeeBarcode
    @emp_det_id INT,
    @barcode VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if barcode already exists for another employee
    IF EXISTS (SELECT 1 FROM TblEmpS WHERE barcode = @barcode AND emp_det_id <> @emp_det_id)
    BEGIN
        RAISERROR('Barcode already exists for another employee.', 16, 1);
        RETURN;
    END
    
    -- Update employee barcode
    UPDATE TblEmpS 
    SET barcode = @barcode 
    WHERE emp_det_id = @emp_det_id;
    
    SELECT 'Barcode updated successfully' as message;
END;
GO

-- Stored Procedure: Verify Barcode and Mark Attendance
CREATE PROCEDURE sp_MarkAttendanceByBarcode
    @barcode VARCHAR(100),
    @date DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @emp_id INT;
    DECLARE @employee_name VARCHAR(100);
    
    -- Set default date to today if not provided
    IF @date IS NULL
        SET @date = CAST(GETDATE() AS DATE);
    
    -- Find employee by barcode
    SELECT @emp_id = e.emp_id, @employee_name = ed.name
    FROM TblEmpS ed
    INNER JOIN TblEmpM e ON ed.emp_det_id = e.emp_det_id
    WHERE ed.barcode = @barcode AND e.status = 'Active';
    
    -- Check if employee found
    IF @emp_id IS NULL
    BEGIN
        SELECT 'Invalid barcode or employee not found' as message, 0 as success;
        RETURN;
    END
    
    -- Check if attendance already marked for today
    IF EXISTS (SELECT 1 FROM TblAttendance WHERE emp_id = @emp_id AND date = @date)
    BEGIN
        SELECT 'Attendance already marked for today' as message, 0 as success, @employee_name as employee_name;
        RETURN;
    END
    
    -- Mark attendance as Present
    INSERT INTO TblAttendance (emp_id, date, status, notes)
    VALUES (@emp_id, @date, 'Present', 'Marked via barcode scan');
    
    SELECT 'Attendance marked successfully' as message, 1 as success, @employee_name as employee_name;
END;
GO

-- Stored Procedure: Get Employee by Barcode
CREATE PROCEDURE sp_GetEmployeeByBarcode
    @barcode VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        e.emp_id,
        ed.emp_det_id,
        ed.name,
        ed.email,
        ed.barcode,
        e.status,
        d.name as department_name,
        s.name as section_name,
        des.title as designation_title
    FROM TblEmpS ed
    INNER JOIN TblEmpM e ON ed.emp_det_id = e.emp_det_id
    INNER JOIN TblSections s ON e.section_id = s.section_id
    INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
    INNER JOIN TblDesignations des ON e.desig_id = des.desig_id
    WHERE ed.barcode = @barcode;
END;
GO

-- Departments
INSERT INTO TblDepartments (name) VALUES 
('HR'), 
('IT'), 
('Finance');
GO

-- Sections
INSERT INTO TblSections (name, dept_id) VALUES 
('Recruitment', 1), 
('Employee Relations', 1),
('Software Development', 2), 
('IT Support', 2),
('Accounts Payable', 3), 
('Budgeting & Planning', 3);
GO

-- Roles
INSERT INTO TblRoles (name) VALUES 
('Employee'),   -- 1
('HR');         -- 2
GO

-- Designations
INSERT INTO TblDesignations (title, role_id) VALUES 
('Software Engineer', 1),      -- 1
('Accounts Executive', 1),     -- 2
('HR Manager', 2),             -- 3
('Recruitment Officer', 2);    -- 4
GO

-- Add Admin User and Employee (if not exists)
IF NOT EXISTS (SELECT 1 FROM TblUsers WHERE email = 'admin@gmail.com')
BEGIN
    INSERT INTO TblUsers (username, email, password_hash, role)
    VALUES ('admin', 'admin@gmail.com', '$2b$10$IctalKBt74Nny6Ysz.wUT.SFoLIWX0J4rJx9Shz5fEJ8CXvCqVJAq', 'Admin');
END
GO

-- Add Admin Employee Details and Employee
IF NOT EXISTS (SELECT 1 FROM TblEmpS WHERE cnic = '00000-0000000-0')
BEGIN
    DECLARE @admin_emp_det_id INT;
    EXEC sp_AddEmployeeDetails 'admin', '00000-0000000-0', '2024-01-01', 'admin@gmail.com';
    SELECT @admin_emp_det_id = SCOPE_IDENTITY();
    
    EXEC sp_AddEmployee @admin_emp_det_id, 1, 1, 'fixed', '09:00:00', '17:00:00', 50000.00, 0.00;
END
GO

-- View to get complete employee information (updated with new table names)
CREATE VIEW vw_EmployeeDetails AS
SELECT 
    e.emp_id,
    ed.emp_det_id,
    ed.name,
    ed.cnic,
    ed.start_date,
    ed.email,
    e.type,
    e.status,
    e.section_id,
    e.desig_id,
    des.role_id,
    s.dept_id,
    e.work_start_time,
    e.work_end_time,
    e.salary,
    e.bonus,
    d.name as department_name,
    s.name as section_name,
    des.title as designation_title,
    r.name as role_name
FROM TblEmpM e
INNER JOIN TblEmpS ed ON e.emp_det_id = ed.emp_det_id
INNER JOIN TblSections s ON e.section_id = s.section_id
INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
INNER JOIN TblDesignations des ON e.desig_id = des.desig_id
INNER JOIN TblRoles r ON des.role_id = r.role_id;
GO

-- =============================================
-- LEAVES TABLE AND PROCEDURES FOR LEAVE MANAGEMENT
-- =============================================

-- Create TblLeaves Table for Leave Management
CREATE TABLE TblLeaves (
    leave_id INT PRIMARY KEY IDENTITY(1,1),
    emp_id INT NOT NULL,
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('short_leave', 'holiday')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INT NOT NULL,
    reason NVARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'viewed')),
    applied_date DATETIME DEFAULT GETDATE(),
    approved_by INT NULL,
    approver_type VARCHAR(10) DEFAULT 'employee' CHECK (approver_type IN ('employee', 'admin')),
    approved_date DATETIME NULL,
    comments NVARCHAR(500) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    -- Foreign key constraints with proper names (removed FK_TblLeaves_ApprovedBy to allow admin approvals)
    CONSTRAINT FK_TblLeaves_EmpId FOREIGN KEY (emp_id) REFERENCES TblEmpM(emp_id) ON DELETE CASCADE
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
        l.approver_type,
        CASE 
            WHEN l.approver_type = 'admin' THEN COALESCE(admin_user.username, 'Admin')
            ELSE COALESCE(approver.name, 'Unknown')
        END as approved_by_name,
        l.approved_date,
        l.comments
    FROM TblLeaves l
    INNER JOIN TblEmpM e ON l.emp_id = e.emp_id
    INNER JOIN TblEmpS ed ON e.emp_det_id = ed.emp_det_id
    INNER JOIN TblSections s ON e.section_id = s.section_id
    INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
    INNER JOIN TblDesignations des ON e.desig_id = des.desig_id
    LEFT JOIN TblEmpM approver_emp ON l.approved_by = approver_emp.emp_id AND l.approver_type = 'employee'
    LEFT JOIN TblEmpS approver ON approver_emp.emp_det_id = approver.emp_det_id
    LEFT JOIN TblUsers admin_user ON l.approved_by = admin_user.user_id AND l.approver_type = 'admin'
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
    @comments NVARCHAR(500) = NULL,
    @approver_type VARCHAR(10) = 'employee'
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validate status
    IF @status NOT IN ('approved', 'rejected', 'viewed')
    BEGIN
        RAISERROR('Invalid status. Must be approved, rejected, or viewed.', 16, 1);
        RETURN;
    END
    
    -- Validate approver type
    IF @approver_type NOT IN ('employee', 'admin')
    BEGIN
        RAISERROR('Invalid approver type. Must be employee or admin.', 16, 1);
        RETURN;
    END
    
    -- For employee approvers, validate that emp_id exists
    IF @approver_type = 'employee' AND NOT EXISTS (SELECT 1 FROM TblEmpM WHERE emp_id = @approved_by)
    BEGIN
        RAISERROR('Invalid employee ID for approver.', 16, 1);
        RETURN;
    END
    
    -- For admin approvers, validate that user_id exists
    IF @approver_type = 'admin' AND NOT EXISTS (SELECT 1 FROM TblUsers WHERE user_id = @approved_by)
    BEGIN
        RAISERROR('Invalid admin user ID for approver.', 16, 1);
        RETURN;
    END
    
    -- Check if leave exists
    IF NOT EXISTS (SELECT 1 FROM TblLeaves WHERE leave_id = @leave_id)
    BEGIN
        RAISERROR('Leave application not found.', 16, 1);
        RETURN;
    END
    
    -- Update leave status
    UPDATE TblLeaves 
    SET status = @status,
        approved_by = @approved_by,
        approver_type = @approver_type,
        approved_date = CASE 
            WHEN @status IN ('approved', 'rejected', 'viewed') THEN GETDATE() 
            ELSE approved_date 
        END,
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
        l.approved_by,
        l.approver_type,
        CASE 
            WHEN l.approver_type = 'admin' THEN COALESCE(admin_user.username, 'Admin')
            ELSE COALESCE(approver.name, 'Unknown')
        END as approved_by_name,
        l.approved_date,
        l.comments
    FROM TblLeaves l
    LEFT JOIN TblEmpM approver_emp ON l.approved_by = approver_emp.emp_id AND l.approver_type = 'employee'
    LEFT JOIN TblEmpS approver ON approver_emp.emp_det_id = approver.emp_det_id
    LEFT JOIN TblUsers admin_user ON l.approved_by = admin_user.user_id AND l.approver_type = 'admin'
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

-- =============================================
-- ADMIN LEAVE APPROVAL MIGRATION (For Existing Databases)
-- =============================================
-- This section handles existing databases that may not have the approver_type column

PRINT 'Checking and updating leave management for admin approvals...';

-- Add approver_type column if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'TblLeaves' AND COLUMN_NAME = 'approver_type'
)
BEGIN
    ALTER TABLE TblLeaves ADD approver_type VARCHAR(10) DEFAULT 'employee' CHECK (approver_type IN ('employee', 'admin'));
    PRINT 'approver_type column added to TblLeaves table';
END
ELSE
BEGIN
    PRINT 'approver_type column already exists in TblLeaves table';
END

-- Drop and recreate the stored procedure to ensure it has the correct signature
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_UpdateLeaveStatus')
BEGIN
    DROP PROCEDURE sp_UpdateLeaveStatus;
    PRINT 'Dropped existing sp_UpdateLeaveStatus procedure';
END

-- Recreate sp_UpdateLeaveStatus with proper parameters
CREATE PROCEDURE sp_UpdateLeaveStatus
    @leave_id INT,
    @status VARCHAR(20),
    @approved_by INT,
    @comments NVARCHAR(500) = NULL,
    @approver_type VARCHAR(10) = 'employee'
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validate status
    IF @status NOT IN ('approved', 'rejected', 'viewed')
    BEGIN
        RAISERROR('Invalid status. Must be approved, rejected, or viewed.', 16, 1);
        RETURN;
    END
    
    -- Validate approver type
    IF @approver_type NOT IN ('employee', 'admin')
    BEGIN
        RAISERROR('Invalid approver type. Must be employee or admin.', 16, 1);
        RETURN;
    END
    
    -- For employee approvers, validate that emp_id exists
    IF @approver_type = 'employee' AND NOT EXISTS (SELECT 1 FROM TblEmpM WHERE emp_id = @approved_by)
    BEGIN
        RAISERROR('Invalid employee ID for approver.', 16, 1);
        RETURN;
    END
    
    -- For admin approvers, validate that user_id exists
    IF @approver_type = 'admin' AND NOT EXISTS (SELECT 1 FROM TblUsers WHERE user_id = @approved_by)
    BEGIN
        RAISERROR('Invalid admin user ID for approver.', 16, 1);
        RETURN;
    END
    
    -- Check if leave exists
    IF NOT EXISTS (SELECT 1 FROM TblLeaves WHERE leave_id = @leave_id)
    BEGIN
        RAISERROR('Leave application not found.', 16, 1);
        RETURN;
    END
    
    -- Update leave status
    UPDATE TblLeaves 
    SET status = @status,
        approved_by = @approved_by,
        approver_type = @approver_type,
        approved_date = CASE 
            WHEN @status IN ('approved', 'rejected', 'viewed') THEN GETDATE() 
            ELSE approved_date 
        END,
        comments = @comments,
        updated_at = GETDATE()
    WHERE leave_id = @leave_id;
    
    SELECT 'Leave status updated successfully' as message;
END;
GO

-- Drop and recreate sp_GetLeaveApplications to ensure it handles admin approvers
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_GetLeaveApplications')
BEGIN
    DROP PROCEDURE sp_GetLeaveApplications;
    PRINT 'Dropped existing sp_GetLeaveApplications procedure';
END

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
        COALESCE(l.approver_type, 'employee') as approver_type,
        CASE 
            WHEN COALESCE(l.approver_type, 'employee') = 'admin' THEN COALESCE(admin_user.username, 'Admin')
            ELSE COALESCE(approver.name, 'Unknown')
        END as approved_by_name,
        l.approved_date,
        l.comments
    FROM TblLeaves l
    INNER JOIN TblEmpM e ON l.emp_id = e.emp_id
    INNER JOIN TblEmpS ed ON e.emp_det_id = ed.emp_det_id
    INNER JOIN TblSections s ON e.section_id = s.section_id
    INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
    INNER JOIN TblDesignations des ON e.desig_id = des.desig_id
    LEFT JOIN TblEmpM approver_emp ON l.approved_by = approver_emp.emp_id AND COALESCE(l.approver_type, 'employee') = 'employee'
    LEFT JOIN TblEmpS approver ON approver_emp.emp_det_id = approver.emp_det_id
    LEFT JOIN TblUsers admin_user ON l.approved_by = admin_user.user_id AND COALESCE(l.approver_type, 'employee') = 'admin'
    WHERE (@status IS NULL OR l.status = @status)
    AND (@emp_id IS NULL OR l.emp_id = @emp_id)
    ORDER BY l.applied_date DESC;
END;
GO

-- Drop and recreate sp_GetEmployeeLeaves to ensure it handles admin approvers
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_GetEmployeeLeaves')
BEGIN
    DROP PROCEDURE sp_GetEmployeeLeaves;
    PRINT 'Dropped existing sp_GetEmployeeLeaves procedure';
END

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
        l.approved_by,
        COALESCE(l.approver_type, 'employee') as approver_type,
        CASE 
            WHEN COALESCE(l.approver_type, 'employee') = 'admin' THEN COALESCE(admin_user.username, 'Admin')
            ELSE COALESCE(approver.name, 'Unknown')
        END as approved_by_name,
        l.approved_date,
        l.comments
    FROM TblLeaves l
    LEFT JOIN TblEmpM approver_emp ON l.approved_by = approver_emp.emp_id AND COALESCE(l.approver_type, 'employee') = 'employee'
    LEFT JOIN TblEmpS approver ON approver_emp.emp_det_id = approver.emp_det_id
    LEFT JOIN TblUsers admin_user ON l.approved_by = admin_user.user_id AND COALESCE(l.approver_type, 'employee') = 'admin'
    WHERE l.emp_id = @emp_id
    ORDER BY l.applied_date DESC;
END;
GO

PRINT 'Admin leave approval migration completed successfully!';
PRINT 'Admins can now approve leave applications without foreign key constraint errors.';

-- =============================================
-- WORK HOURS MIGRATION (For Existing Databases)
-- =============================================
-- This section adds work hours fields to existing databases
-- Skip this section if creating a fresh database (work hours are already included above)

PRINT 'Checking and adding work hours fields if they do not exist...';

-- Add work_start_time field if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'TblEmpM' AND COLUMN_NAME = 'work_start_time'
)
BEGIN
    ALTER TABLE TblEmpM 
    ADD work_start_time TIME DEFAULT '09:00:00' NOT NULL;
    PRINT 'work_start_time field added successfully';
END
ELSE
BEGIN
    PRINT 'work_start_time field already exists';
END

-- Add work_end_time field if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'TblEmpM' AND COLUMN_NAME = 'work_end_time'
)
BEGIN
    ALTER TABLE TblEmpM 
    ADD work_end_time TIME DEFAULT '17:00:00' NOT NULL;
    PRINT 'work_end_time field added successfully';
END
ELSE
BEGIN
    PRINT 'work_end_time field already exists';
END

-- Add salary field if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'TblEmpM' AND COLUMN_NAME = 'salary'
)
BEGIN
    ALTER TABLE TblEmpM 
    ADD salary DECIMAL(10, 2) DEFAULT 50000.00 NOT NULL;
    PRINT 'salary field added successfully';
END
ELSE
BEGIN
    PRINT 'salary field already exists';
END

-- Add bonus field if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'TblEmpM' AND COLUMN_NAME = 'bonus'
)
BEGIN
    ALTER TABLE TblEmpM 
    ADD bonus DECIMAL(10, 2) DEFAULT 0.00;
    PRINT 'bonus field added successfully';
END
ELSE
BEGIN
    PRINT 'bonus field already exists';
END

-- Update existing records to have default work hours (9 AM - 5 PM) and salary/bonus
UPDATE TblEmpM 
SET work_start_time = COALESCE(work_start_time, '09:00:00'), 
    work_end_time = COALESCE(work_end_time, '17:00:00'),
    salary = COALESCE(salary, 50000.00),
    bonus = COALESCE(bonus, 0.00)
WHERE work_start_time IS NULL OR work_end_time IS NULL OR salary IS NULL OR bonus IS NULL;

PRINT 'Updated existing records with default work hours (9:00 AM - 5:00 PM)';

-- Update the view to include work hours if it exists
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_EmployeeDetails')
BEGIN
    DROP VIEW vw_EmployeeDetails;
    PRINT 'Dropped existing view vw_EmployeeDetails for recreation';
    
    -- Recreate view with work hours fields
    EXEC('
    CREATE VIEW vw_EmployeeDetails AS
    SELECT 
        e.emp_id,
        ed.emp_det_id,
        ed.name,
        ed.cnic,
        ed.start_date,
        ed.email,
        e.type,
        e.status,
        e.section_id,
        e.desig_id,
        des.role_id,
        s.dept_id,
        e.work_start_time,
        e.work_end_time,
        e.salary,
        e.bonus,
        d.name as department_name,
        s.name as section_name,
        des.title as designation_title,
        r.name as role_name
    FROM TblEmpM e
    INNER JOIN TblEmpS ed ON e.emp_det_id = ed.emp_det_id
    INNER JOIN TblSections s ON e.section_id = s.section_id
    INNER JOIN TblDepartments d ON s.dept_id = d.dept_id
    INNER JOIN TblDesignations des ON e.desig_id = des.desig_id
    INNER JOIN TblRoles r ON des.role_id = r.role_id
    ');
    
    PRINT 'Recreated view vw_EmployeeDetails with work hours fields';
END

PRINT 'Work hours and salary migration completed successfully!';
PRINT 'All employees now have default work hours: 9:00 AM - 5:00 PM, salary: PKR 50,000, bonus: PKR 0';
PRINT 'You can customize work hours, salary, and bonus for individual employees through the application.';

-- =============================================
-- BARCODE MIGRATION (For Existing Databases)
-- =============================================
-- This section adds barcode field to existing databases

PRINT 'Checking and adding barcode field if it does not exist...';

-- Add barcode field if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'TblEmpS' AND COLUMN_NAME = 'barcode'
)
BEGIN
    ALTER TABLE TblEmpS 
    ADD barcode VARCHAR(100) UNIQUE NULL;
    PRINT 'barcode field added successfully';
END
ELSE
BEGIN
    PRINT 'barcode field already exists';
END

PRINT 'Barcode migration completed successfully!';
PRINT 'You can now generate barcodes for employees and use barcode scanning for attendance.';

-- =============================================
-- END WORK HOURS MIGRATION
-- =============================================
GO


-- Database Verification Queries
SELECT name FROM sys.databases WHERE name = 'EmployeeManagementSystem';
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_TYPE = 'PROCEDURE';

-- View Data
SELECT * FROM TblDepartments;
SELECT * FROM TblSections;
SELECT * FROM TblDesignations;
SELECT * FROM TblRoles;
SELECT * FROM TblEmpS;
SELECT * FROM TblEmpM;
SELECT * FROM TblAttendance;
SELECT * FROM vw_EmployeeDetails;
SELECT * FROM TblUsers WHERE email = 'admin@gmail.com';

-- Test Attendance Procedures (Optional - for testing)
-- EXEC sp_GetAttendanceByDate '2025-01-10';
-- EXEC sp_GetAttendanceStats '2025-01-10';
