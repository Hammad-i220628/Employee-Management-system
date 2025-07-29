import axios from 'axios';
import { 
  AuthResponse, 
  Employee, 
  EmployeeFormData, 
  Department, 
  Section, 
  Designation, 
  Role,
  LoginFormData,
  RegisterFormData
} from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (data: LoginFormData): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterFormData): Promise<{ message: string }> => {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },
};

// Employee API
export const employeeAPI = {
  getAll: async (): Promise<Employee[]> => {
    const response = await api.get('/employees');
    return response.data;
  },

  getById: async (id: number): Promise<Employee> => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<{ message: string }> => {
    const response = await api.post('/employees', data);
    return response.data;
  },

  update: async (id: number, data: any): Promise<{ message: string }> => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },
};

// Department API
export const departmentAPI = {
  getAll: async (): Promise<Department[]> => {
    const response = await api.get('/departments');
    return response.data;
  },

  create: async (data: { name: string }): Promise<{ message: string }> => {
    const response = await api.post('/departments', data);
    return response.data;
  },

  update: async (id: number, data: { name: string }): Promise<{ message: string }> => {
    const response = await api.put(`/departments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/departments/${id}`);
    return response.data;
  },
};

// Section API
export const sectionAPI = {
  getAll: async (): Promise<Section[]> => {
    const response = await api.get('/departments/sections');
    return response.data;
  },

  create: async (data: { name: string; dept_id: number }): Promise<{ message: string }> => {
    const response = await api.post('/departments/sections', data);
    return response.data;
  },

  update: async (id: number, data: { name: string; dept_id: number }): Promise<{ message: string }> => {
    const response = await api.put(`/departments/sections/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/departments/sections/${id}`);
    return response.data;
  },
};

// Designation API
export const designationAPI = {
  getAll: async (): Promise<Designation[]> => {
    const response = await api.get('/departments/designations');
    return response.data;
  },

  create: async (data: { title: string; role_id?: number }): Promise<{ message: string }> => {
    const response = await api.post('/departments/designations', data);
    return response.data;
  },

  update: async (id: number, data: { title: string; role_id?: number }): Promise<{ message: string }> => {
    const response = await api.put(`/departments/designations/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/departments/designations/${id}`);
    return response.data;
  },
};

// Role API
export const roleAPI = {
  getAll: async (): Promise<Role[]> => {
    const response = await api.get('/departments/roles');
    return response.data;
  },

  create: async (data: { name: string }): Promise<{ message: string }> => {
    const response = await api.post('/departments/roles', data);
    return response.data;
  },

  update: async (id: number, data: { name: string }): Promise<{ message: string }> => {
    const response = await api.put(`/departments/roles/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/departments/roles/${id}`);
    return response.data;
  },
};

export default api;