-- Fix QUOTED_IDENTIFIER issue by recreating views with proper settings
USE EmployeeManagementSystem;
GO

-- Set proper options for creating indexed views
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

-- Drop and recreate vw_EmployeeDetails
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_EmployeeDetails')
DROP VIEW vw_EmployeeDetails;
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

-- Drop and recreate vw_EmployeeDashboard
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_EmployeeDashboard')
DROP VIEW vw_EmployeeDashboard;
GO

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

-- Verify views were created successfully
SELECT 'vw_EmployeeDetails' as ViewName, COUNT(*) as RecordCount FROM vw_EmployeeDetails;
SELECT 'vw_EmployeeDashboard' as ViewName, COUNT(*) as RecordCount FROM vw_EmployeeDashboard;

PRINT 'Views recreated successfully with proper SET options';
GO
