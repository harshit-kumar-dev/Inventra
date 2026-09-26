import { api } from './api';

export interface User {
  id: string;
  name: string;
  loginId: string;
  email: string;
  role: 'INVENTORY_MANAGER' | 'WAREHOUSE_STAFF' | 'ADMIN';
  createdAt: string;
}

export const authApi = {
  login: (data: { email: string; password: string }) => {
    return api.post<{ user: User; token: string }>('/auth/login', data);
  },

  register: (data: { name: string; loginId: string; email: string; password: string; role?: string }) => {
    return api.post<{ user: User; token: string }>('/auth/register', data);
  },

  getMe: () => {
    return api.get<{ user: User }>('/auth/me');
  },

  forgotPassword: (email: string) => {
    return api.post<{ message: string }>('/auth/forgot-password', { email });
  },

  verifyOTP: (data: { email: string; otp: string }) => {
    return api.post<{ verified: boolean; message: string }>('/auth/verify-otp', data);
  },

  resetPassword: (data: { email: string; otp: string; newPassword: string }) => {
    return api.post<{ message: string }>('/auth/reset-password', data);
  },

  logout: () => {
    return api.post('/auth/logout');
  },
};
