-- Fix QUOTED_IDENTIFIER issue by recreating all stored procedures with proper settings
USE EmployeeManagementSystem;
GO

-- Set proper options for creating stored procedures
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

-- Drop and recreate sp_AddEmployeeDetails
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_AddEmployeeDetails')
DROP PROCEDURE sp_AddEmployeeDetails;
GO

CREATE PROCEDURE sp_AddEmployeeDetails
    @name VARCHAR(100),
    @cnic VARCHAR(15),
    @start_date DATE,
    @email VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET ANSI_NULLS ON;
    SET QUOTED_IDENTIFIER ON;
    SET ARITHABORT ON;
    
    INSERT INTO EmployeeDetails (name, cnic, start_date, email)
    VALUES (@name, @cnic, @start_date, @email);

    SELECT SCOPE_IDENTITY() AS emp_det_id;
END;
GO

-- Drop and recreate sp_AddEmployeeUser
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_AddEmployeeUser')
DROP PROCEDURE sp_AddEmployeeUser;
GO

CREATE PROCEDURE sp_AddEmployeeUser
    @emp_det_id INT,
    @email VARCHAR(100),
    @password_hash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SET ANSI_NULLS ON;
    SET QUOTED_IDENTIFIER ON;
    SET ARITHABORT ON;
    
    -- Get employee name from EmployeeDetails
    DECLARE @name VARCHAR(100);
    SELECT @name = name FROM EmployeeDetails WHERE emp_det_id = @emp_det_id;
    
    -- Insert into Users table
    INSERT INTO Users (username, email, password_hash, role)
    VALUES (@name, @email, @password_hash, 'Employee');
    
    SELECT SCOPE_IDENTITY() AS user_id;
END;
GO

-- Drop and recreate sp_AddEmployee
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_AddEmployee')
DROP PROCEDURE sp_AddEmployee;
GO

CREATE PROCEDURE sp_AddEmployee
    @emp_det_id INT,
    @section_id INT,
    @desig_id INT,
    @role_id INT,
    @type VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    SET ANSI_NULLS ON;
    SET QUOTED_IDENTIFIER ON;
    SET ARITHABORT ON;
    
    INSERT INTO Employees (emp_det_id, section_id, desig_id, role_id, type)
    VALUES (@emp_det_id, @section_id, @desig_id, @role_id, @type);
    
    SELECT SCOPE_IDENTITY() AS emp_id;
END;
GO

-- Drop and recreate sp_UpdateEmployee
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_UpdateEmployee')
DROP PROCEDURE sp_UpdateEmployee;
GO

CREATE PROCEDURE sp_UpdateEmployee
    @user_email VARCHAR(100),
    @emp_id INT,
    @section_id INT,
    @desig_id INT,
    @role_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SET ANSI_NULLS ON;
    SET QUOTED_IDENTIFIER ON;
    SET ARITHABORT ON;
    
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

-- Drop and recreate sp_RegisterUser
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_RegisterUser')
DROP PROCEDURE sp_RegisterUser;
GO

CREATE PROCEDURE sp_RegisterUser
    @username VARCHAR(50),
    @email VARCHAR(100),
    @password_hash VARCHAR(255),
    @role VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET ANSI_NULLS ON;
    SET QUOTED_IDENTIFIER ON;
    SET ARITHABORT ON;
    
    INSERT INTO Users (username, email, password_hash, role)
    VALUES (@username, @email, @password_hash, @role);
END;
GO

-- Drop and recreate sp_LoginUser
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_LoginUser')
DROP PROCEDURE sp_LoginUser;
GO

CREATE PROCEDURE sp_LoginUser
    @username VARCHAR(50),
    @password_hash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SET ANSI_NULLS ON;
    SET QUOTED_IDENTIFIER ON;
    SET ARITHABORT ON;
    
    SELECT * FROM Users
    WHERE username = @username AND password_hash = @password_hash;
END;
GO

-- Test the stored procedures
PRINT 'Testing stored procedures...';

-- Test sp_AddEmployeeDetails
DECLARE @test_emp_det_id INT;
EXEC sp_AddEmployeeDetails 'Test User', '12345-1234567-1', '2025-07-31', 'test@example.com';
SELECT @test_emp_det_id = SCOPE_IDENTITY();
PRINT 'sp_AddEmployeeDetails - OK';

-- Clean up test data
DELETE FROM EmployeeDetails WHERE cnic = '12345-1234567-1';
PRINT 'Test data cleaned up';

PRINT 'All stored procedures recreated successfully with proper SET options';
GO
