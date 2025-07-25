-- Create Database
CREATE DATABASE EmployeeManagementSystem;
GO

USE EmployeeManagementSystem;
GO

-- Users Table
CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'Employee'
);
GO

-- Enforce only one Admin user
CREATE UNIQUE INDEX UX_SingleAdminUser ON Users(role)
WHERE role = 'Admin';
GO

-- Departments Table
CREATE TABLE Departments (
    dept_id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(100) NOT NULL
);
GO

-- Sections Table
CREATE TABLE Sections (
    section_id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(100) NOT NULL,
    dept_id INT NOT NULL FOREIGN KEY REFERENCES Departments(dept_id)
);
GO

-- Designations Table
CREATE TABLE Designations (
    desig_id INT PRIMARY KEY IDENTITY(1,1),
    title VARCHAR(100) NOT NULL
);
GO

-- Roles Table
CREATE TABLE Roles (
    role_id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(100) NOT NULL
);
GO

-- EmployeeDetails Table (Fixed information)
CREATE TABLE EmployeeDetails (
    emp_det_id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(100) NOT NULL,
    cnic VARCHAR(15) UNIQUE NOT NULL,
    start_date DATE NOT NULL
);
GO

-- Employees Table (Editable information)
CREATE TABLE Employees (
    emp_id INT PRIMARY KEY IDENTITY(1,1),
    emp_det_id INT NOT NULL FOREIGN KEY REFERENCES EmployeeDetails(emp_det_id),
    section_id INT NOT NULL FOREIGN KEY REFERENCES Sections(section_id),
    desig_id INT NOT NULL FOREIGN KEY REFERENCES Designations(desig_id),
    role_id INT NOT NULL FOREIGN KEY REFERENCES Roles(role_id),
    type VARCHAR(10) CHECK (type IN ('fixed', 'editable')) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active'
);
GO

-- Stored Procedure: Register User
CREATE PROCEDURE sp_RegisterUser
    @username VARCHAR(50),
    @email VARCHAR(100),
    @password_hash VARCHAR(255),
    @role VARCHAR(20)
AS
BEGIN
    INSERT INTO Users (username, email, password_hash, role)
    VALUES (@username, @email, @password_hash, @role);
END;
GO

-- Stored Procedure: Login User
CREATE PROCEDURE sp_LoginUser
    @username VARCHAR(50),
    @password_hash VARCHAR(255)
AS
BEGIN
    SELECT * FROM Users
    WHERE username = @username AND password_hash = @password_hash;
END;
GO

-- Stored Procedure: Add EmployeeDetails (Fixed information)
CREATE PROCEDURE sp_AddEmployeeDetails
    @name VARCHAR(100),
    @cnic VARCHAR(15),
    @start_date DATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO EmployeeDetails (name, cnic, start_date)
    VALUES (@name, @cnic, @start_date);

    SELECT SCOPE_IDENTITY() AS emp_det_id;
END;
GO

-- Stored Procedure: Add Employee (Editable information)
CREATE PROCEDURE sp_AddEmployee
    @emp_det_id INT,
    @section_id INT,
    @desig_id INT,
    @role_id INT,
    @type VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Employees (emp_det_id, section_id, desig_id, role_id, type)
    VALUES (@emp_det_id, @section_id, @desig_id, @role_id, @type);
    
    SELECT SCOPE_IDENTITY() AS emp_id;
END;
GO

-- Stored Procedure: Update Employee (Only editable fields)
CREATE PROCEDURE sp_UpdateEmployee
    @user_email VARCHAR(100),
    @emp_id INT,
    @section_id INT,
    @desig_id INT,
    @role_id INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @user_role VARCHAR(20);

    SELECT @user_role = role FROM Users WHERE email = @user_email;

    IF @user_role <> 'Admin'
    BEGIN
        RAISERROR('Only admin is allowed to update employee data.', 16, 1);
        RETURN;
    END

    UPDATE Employees
    SET section_id = @section_id,
        desig_id = @desig_id,
        role_id = @role_id
    WHERE emp_id = @emp_id;
END;
GO

-- Trigger: Update Status on Role Change
CREATE TRIGGER trg_UpdateStatus
ON Employees
AFTER UPDATE
AS
BEGIN
    UPDATE e
    SET status = 'Changed'
    FROM Employees e
    INNER JOIN inserted i ON e.emp_id = i.emp_id
    INNER JOIN deleted d ON e.emp_id = d.emp_id
    WHERE (
        i.section_id <> d.section_id OR
        i.desig_id <> d.desig_id OR
        i.role_id <> d.role_id
    );
END;
GO

-- Departments
INSERT INTO Departments (name) VALUES 
('HR'), 
('IT'), 
('Finance');
GO

-- Sections
INSERT INTO Sections (name, dept_id) VALUES 
('Recruitment', 1), 
('Employee Relations', 1),
('Software Development', 2), 
('IT Support', 2),
('Accounts Payable', 3), 
('Budgeting & Planning', 3);
GO

-- Designations
INSERT INTO Designations (title) VALUES 
('Software Engineer'),      -- 1
('Accounts Executive'),     -- 2
('HR Manager'),             -- 3
('Recruitment Officer');    -- 4
GO

-- Roles
INSERT INTO Roles (name) VALUES 
('Employee'),   -- 1
('HR');         -- 2
GO

-- Add Admin User and Employee (if not exists)
IF NOT EXISTS (SELECT 1 FROM Users WHERE email = 'admin@gmail.com')
BEGIN
    INSERT INTO Users (username, email, password_hash, role)
    VALUES ('admin', 'admin@gmail.com', '$2b$10$IctalKBt74Nny6Ysz.wUT.SFoLIWX0J4rJx9Shz5fEJ8CXvCqVJAq', 'Admin');
END
GO

-- Add Admin Employee Details and Employee
IF NOT EXISTS (SELECT 1 FROM EmployeeDetails WHERE cnic = '00000-0000000-0')
BEGIN
    DECLARE @admin_emp_det_id INT;
    EXEC sp_AddEmployeeDetails 'admin', '00000-0000000-0', '2024-01-01';
    SELECT @admin_emp_det_id = SCOPE_IDENTITY();
    
    EXEC sp_AddEmployee @admin_emp_det_id, 1, 1, 1, 'fixed';
END
GO

-- View to get complete employee information
CREATE VIEW vw_EmployeeDetails AS
SELECT 
    e.emp_id,
    ed.emp_det_id,
    ed.name,
    ed.cnic,
    ed.start_date,
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

-- Database Verification Queries
SELECT name FROM sys.databases WHERE name = 'EmployeeManagementSystem';
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_TYPE = 'PROCEDURE';

-- View Data
SELECT * FROM Departments;
SELECT * FROM Sections;
SELECT * FROM Designations;
SELECT * FROM Roles;
SELECT * FROM EmployeeDetails;
SELECT * FROM Employees;
SELECT * FROM vw_EmployeeDetails;
SELECT * FROM Users WHERE email = 'admin@gmail.com';
