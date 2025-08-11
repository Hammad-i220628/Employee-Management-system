export interface User {
  id: number;
  username: string;
  email: string;
  role: string; // Admin, Employee, etc.
  type: string; // fixed, editable, etc.
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface Department {
  dept_id: number;
  name: string;
}

export interface Section {
  section_id: number;
  name: string;
  dept_id: number;
  department_name?: string;
}

export interface Designation {
  desig_id: number;
  title: string;
  role_id?: number;
  role_name?: string;
}

export interface Role {
  role_id: number;
  name: string;
}

export interface Employee {
  emp_id: number;
  emp_det_id: number;
  name: string;
  cnic: string;
  start_date: string;
  email?: string;
  type: 'fixed' | 'editable';
  status: string;
  section_id: number;
  desig_id: number;
  role_id: number;
  dept_id: number;
  work_start_time?: string;
  work_end_time?: string;
  department_name?: string;
  section_name?: string;
  designation_title?: string;
  role_name?: string;
}

export interface EmployeeFormData {
  emp_id?: number; // Optional, present when editing
  name: string;
  cnic: string;
  start_date: string;
  email?: string; // Optional, used when creating new employees
  password?: string; // Optional, used when creating new employees
  section_id: string;
  desig_id: string;
  role_id: string;
  type: 'fixed' | 'editable';
  work_start_time?: string;
  work_end_time?: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}