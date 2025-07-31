-- Migration: Add email field to EmployeeDetails table
USE EmployeeManagementSystem;
GO

-- Add email column to EmployeeDetails table
ALTER TABLE EmployeeDetails 
ADD email VARCHAR(100) UNIQUE;
GO

-- Update the stored procedure for adding employee details
DROP PROCEDURE IF EXISTS sp_AddEmployeeDetails;
GO

CREATE PROCEDURE sp_AddEmployeeDetails
    @name VARCHAR(100),
    @cnic VARCHAR(15),
    @start_date DATE,
    @email VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO EmployeeDetails (name, cnic, start_date, email)
    VALUES (@name, @cnic, @start_date, @email);

    SELECT SCOPE_IDENTITY() AS emp_det_id;
END;
GO

-- Create a procedure to create employee user account
CREATE PROCEDURE sp_AddEmployeeUser
    @emp_det_id INT,
    @email VARCHAR(100),
    @password_hash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Get employee name from EmployeeDetails
    DECLARE @name VARCHAR(100);
    SELECT @name = name FROM EmployeeDetails WHERE emp_det_id = @emp_det_id;
    
    -- Insert into Users table
    INSERT INTO Users (username, email, password_hash, role)
    VALUES (@name, @email, @password_hash, 'Employee');
    
    SELECT SCOPE_IDENTITY() AS user_id;
END;
GO

-- Update the view to include email
DROP VIEW IF EXISTS vw_EmployeeDetails;
GO

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
    e.role_id,
    s.dept_id,
    d.name as department_name,
    s.name as section_name,
    des.title as designation_title,
    r.name as role_name
FROM Employees e
INNER JOIN EmployeeDetails ed ON e.emp_det_id = ed.emp_det_id
INNER JOIN Sections s ON e.section_id = s.section_id
INNER JOIN Departments d ON s.dept_id = d.dept_id
INNER JOIN Designations des ON e.desig_id = des.desig_id
INNER JOIN Roles r ON e.role_id = r.role_id;
GO

-- Create a view for employee dashboard
CREATE VIEW vw_EmployeeDashboard AS
SELECT 
    u.user_id,
    u.email,
    ed.name,
    ed.cnic,
    ed.start_date,
    COALESCE(e.status, 'Unassigned') as status,
    COALESCE(d.name, 'Not Assigned') as department_name,
    COALESCE(s.name, 'Not Assigned') as section_name,
    COALESCE(des.title, 'Not Assigned') as designation_title,
    COALESCE(r.name, 'Employee') as role_name
FROM Users u
INNER JOIN EmployeeDetails ed ON u.email = ed.email
LEFT JOIN Employees e ON e.emp_det_id = ed.emp_det_id
LEFT JOIN Sections s ON e.section_id = s.section_id
LEFT JOIN Departments d ON s.dept_id = d.dept_id
LEFT JOIN Designations des ON e.desig_id = des.desig_id
LEFT JOIN Roles r ON e.role_id = r.role_id
WHERE u.role = 'Employee';
GO

-- Update admin email in EmployeeDetails
UPDATE EmployeeDetails 
SET email = 'admin@gmail.com' 
WHERE cnic = '00000-0000000-0';
GO

PRINT 'Migration completed: Added email field to EmployeeDetails table';
