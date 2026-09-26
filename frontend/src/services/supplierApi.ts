import { api } from './api';

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  _count?: { receipts: number };
  createdAt: string;
}

export const supplierApi = {
  getSuppliers: () => {
    return api.get<{ suppliers: Supplier[] }>('/suppliers');
  },

  getSupplierById: (id: string) => {
    return api.get<{ supplier: Supplier }>(`/suppliers/${id}`);
  },

  createSupplier: (data: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) => {
    return api.post<{ supplier: Supplier }>('/suppliers', data);
  },

  updateSupplier: (
    id: string,
    data: {
      name?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
    }
  ) => {
    return api.put<{ supplier: Supplier }>(`/suppliers/${id}`, data);
  },
};
