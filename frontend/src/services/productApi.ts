import { api } from './api';

export interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: { products: number };
}

export interface UnitOfMeasure {
  id: string;
  name: string;
  symbol: string;
}

export interface StockByLocation {
  locationId: string;
  locationName: string;
  locationCode: string;
  warehouseName: string;
  warehouseCode: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  perUnitCost: number;
  reorderLevel: number;
  active: boolean;
  category: { id: string; name: string };
  uom: { id: string; name: string; symbol: string };
  totalStock: number;
  stockStatus: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  stockByLocation?: StockByLocation[];
  createdAt: string;
  updatedAt: string;
}

export const productApi = {
  getProducts: (query?: {
    search?: string;
    categoryId?: string;
    active?: string;
    page?: number;
    limit?: number;
  }) => {
    return api.get<{ products: Product[] }>('/products', query);
  },

  getProductById: (id: string) => {
    return api.get<{ product: Product }>(`/products/${id}`);
  },

  createProduct: (data: {
    name: string;
    sku: string;
    description?: string;
    perUnitCost?: number;
    categoryId: string;
    uomId: string;
    reorderLevel?: number;
    active?: boolean;
  }) => {
    return api.post<{ product: Product }>('/products', data);
  },

  updateProduct: (
    id: string,
    data: {
      name?: string;
      sku?: string;
      description?: string;
      perUnitCost?: number;
      categoryId?: string;
      uomId?: string;
      reorderLevel?: number;
      active?: boolean;
    }
  ) => {
    return api.put<{ product: Product }>(`/products/${id}`, data);
  },

  toggleStatus: (id: string, active: boolean) => {
    return api.patch<{ product: Product }>(`/products/${id}/status`, { active });
  },

  getCategories: () => {
    return api.get<{ categories: Category[] }>('/categories');
  },

  createCategory: (data: { name: string; description?: string }) => {
    return api.post<{ category: Category }>('/categories', data);
  },

  updateCategory: (id: string, data: { name?: string; description?: string }) => {
    return api.put<{ category: Category }>(`/categories/${id}`, data);
  },

  getUnits: () => {
    return api.get<{ units: UnitOfMeasure[] }>('/units');
  },
};
