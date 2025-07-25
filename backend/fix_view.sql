USE EmployeeManagementSystem;
GO

CREATE VIEW vw_EmployeeDetails AS
SELECT 
    COALESCE(e.emp_id, 0) as emp_id,
    ed.emp_det_id,
    ed.name,
    ed.cnic,
    ed.start_date,
    COALESCE(e.type, 'unassigned') as type,
    COALESCE(e.status, 'Unassigned') as status,
    COALESCE(e.section_id, 0) as section_id,
    COALESCE(e.desig_id, 0) as desig_id,
    COALESCE(e.role_id, 0) as role_id,
    COALESCE(s.dept_id, 0) as dept_id,
    COALESCE(d.name, 'Unassigned') as department_name,
    COALESCE(s.name, 'Unassigned') as section_name,
    COALESCE(des.title, 'Unassigned') as designation_title,
    COALESCE(r.name, 'Unassigned') as role_name
FROM EmployeeDetails ed
LEFT JOIN Employees e ON e.emp_det_id = ed.emp_det_id
LEFT JOIN Sections s ON e.section_id = s.section_id
LEFT JOIN Departments d ON s.dept_id = d.dept_id
LEFT JOIN Designations des ON e.desig_id = des.desig_id
LEFT JOIN Roles r ON e.role_id = r.role_id;
GO
