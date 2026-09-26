import { api } from './api';

export interface ManagedUser {
  id: string;
  name: string;
  loginId: string;
  email: string;
  role: 'ADMIN' | 'INVENTORY_MANAGER' | 'WAREHOUSE_STAFF';
  createdAt: string;
  updatedAt: string;
  _count?: {
    createdReceipts?: number;
    createdDeliveries?: number;
    createdTransfers?: number;
    createdAdjustments?: number;
    ledgerEntries?: number;
  };
}

export const userApi = {
  getUsers: (params?: { search?: string; role?: string }) => {
    return api.get<{ users: ManagedUser[] }>('/users', params);
  },

  getUserById: (id: string) => {
    return api.get<{ user: ManagedUser }>(`/users/${id}`);
  },

  createUser: (data: {
    name: string;
    loginId: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'INVENTORY_MANAGER' | 'WAREHOUSE_STAFF';
  }) => {
    return api.post<{ user: ManagedUser }>('/users', data);
  },

  updateUser: (
    id: string,
    data: {
      name?: string;
      email?: string;
      role?: 'ADMIN' | 'INVENTORY_MANAGER' | 'WAREHOUSE_STAFF';
      password?: string;
    }
  ) => {
    return api.put<{ user: ManagedUser }>(`/users/${id}`, data);
  },

  deleteUser: (id: string) => {
    return api.delete<{ success: boolean; message: string }>(`/users/${id}`);
  },
};
