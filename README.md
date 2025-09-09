# Employee Management System

A comprehensive web-based Employee Management System built with modern technologies for efficient workforce management, attendance tracking, and policy administration.

## 🚀 Technologies Used

### Frontend
- **React 18** - Modern UI library for building interactive user interfaces
- **TypeScript** - Type-safe JavaScript for better development experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Lucide React** - Beautiful icon library
- **Axios** - HTTP client for API communication

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type-safe server-side development
- **JWT (jsonwebtoken)** - Secure authentication and authorization
- **bcrypt** - Password hashing for security
- **CORS** - Cross-origin resource sharing middleware
- **Express Validator** - Input validation and sanitization

### Database
- **Microsoft SQL Server** - Robust relational database management system
- **mssql** - SQL Server driver for Node.js
- **Stored Procedures** - Optimized database operations

### Barcode
- **@zxing/library** - Barcode code scanning

## 📋 Key Features

### Authentication & Authorization
- **Secure Login/Registration** - JWT-based authentication system
<img width="1916" height="1075" alt="Image" src="https://github.com/user-attachments/assets/af8c7f57-b43a-4862-9509-b383024fd1aa" />

- **Role-based Access Control** - Admin and Employee role management
<img width="1918" height="921" alt="Image" src="https://github.com/user-attachments/assets/08061af1-1456-41d7-9a93-186ab7711369" />

- **Single Admin Constraint** - Database-level admin user restriction

### Employee Management
- **Employee Registration** - Complete employee profile creation
<img width="1901" height="933" alt="Image" src="https://github.com/user-attachments/assets/2c7e6e8c-2cd6-47ca-8497-8a0418f5cfea" />

- **Department & Section Management** - Hierarchical organizational structure
- **Designation & Role Assignment** - Flexible role and designation system
- **Employee Status Tracking** - Active/Inactive employee management
- **Barcode Integration** - Unique barcode generation for each employee

### Attendance System
- **Barcode Scanning** - Quick attendance marking via barcode scanning
- **Multiple Scanner Options** - Various barcode scanner implementations
- **Attendance Status Tracking** - Present, Absent, Late, Half Day statuses
- **Attendance History** - Comprehensive attendance records
- **Real-time Updates** - Live attendance status updates

### Leave Management
- **Leave Applications** - Employee leave request system
- **Leave History** - Complete leave application tracking
- **Leave Policy Integration** - Policy-based leave management

### Policy Management
- **Company Policies Display** - Read-only policy view for employees
- **Overtime Policy** - Global overtime policy management
- **Leave Policy Settings** - Configurable leave policies
- **Tax Deduction Policy** - Tax calculation and deduction management
- **Policy Status Indicators** - Enabled/Disabled status with color coding

### Dashboard & Analytics
- **Employee Dashboard** - Personalized employee view with:
  - Personal details and statistics
  - Organization structure overview
  - Company policies display
  - Leave application interface
  - Leave history tracking
- **Admin Dashboard** - Comprehensive management interface
- **Real-time Statistics** - Live data visualization

### Salary & Compensation
- **Salary Calculations** - Automated salary computation
- **Bonus Management** - Employee bonus tracking
- **Tax Deductions** - Automated tax calculation system
- **Work Hours Tracking** - Configurable work time management
