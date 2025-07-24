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

-- Employees Table
CREATE TABLE Employees (
    emp_id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(100) NOT NULL,
    cnic VARCHAR(15) UNIQUE NOT NULL,
    dept_id INT NOT NULL FOREIGN KEY REFERENCES Departments(dept_id),
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

-- Stored Procedure: Add Employee
CREATE PROCEDURE sp_AddEmployee
    @name VARCHAR(100),
    @cnic VARCHAR(15),
    @dept_id INT,
    @section_id INT,
    @desig_id INT,
    @role_id INT,
    @type VARCHAR(10)
AS
BEGIN
    INSERT INTO Employees (name, cnic, dept_id, section_id, desig_id, role_id, type)
    VALUES (@name, @cnic, @dept_id, @section_id, @desig_id, @role_id, @type);
END;
GO

-- Stored Procedure: Update Employee
CREATE PROCEDURE sp_UpdateEmployee
    @user_email VARCHAR(100),
    @emp_id INT,
    @name VARCHAR(100),
    @cnic VARCHAR(15),
    @dept_id INT,
    @section_id INT,
    @desig_id INT,
    @role_id INT
AS
BEGIN
    DECLARE @type VARCHAR(10);
    DECLARE @current_name VARCHAR(100);
    DECLARE @current_cnic VARCHAR(15);
    DECLARE @user_role VARCHAR(20);

    SELECT @user_role = role FROM Users WHERE email = @user_email;

    IF @user_role <> 'Admin'
    BEGIN
        RAISERROR('Only admin is allowed to update employee data.', 16, 1);
        RETURN;
    END

    SELECT 
        @type = type,
        @current_name = name,
        @current_cnic = cnic
    FROM Employees WHERE emp_id = @emp_id;

    IF @name <> @current_name OR @cnic <> @current_cnic
    BEGIN
        RAISERROR('Name and CNIC cannot be changed.', 16, 1);
        RETURN;
    END

    UPDATE Employees
    SET dept_id = @dept_id,
        section_id = @section_id,
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
        i.dept_id <> d.dept_id OR
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

IF NOT EXISTS (SELECT 1 FROM Employees WHERE name = 'admin')
BEGIN
    EXEC sp_AddEmployee 'admin', '00000-0000000-0', 1, 1, 1, 1, 'fixed';
END
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
SELECT * FROM Employees;
SELECT * FROM Users WHERE email = 'admin@gmail.com';

-- FOR deleting employee, section and its department
DELETE FROM Employees WHERE dept_id = 8;
DELETE FROM Sections WHERE dept_id = 8;
DELETE FROM Departments WHERE dept_id = 8; 