import { api } from './api';

export interface Location {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  type: string;
  active: boolean;
  warehouse?: { id: string; name: string; code: string };
  stockQuantities?: Array<{
    id: string;
    quantity: number;
    product: { id: string; name: string; sku: string; uom: { name: string; symbol: string } };
  }>;
  createdAt?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  active: boolean;
  locations?: Location[];
  _count?: { locations: number };
  createdAt?: string;
}

export const warehouseApi = {
  getWarehouses: () => {
    return api.get<{ warehouses: Warehouse[] }>('/warehouses');
  },

  getWarehouseById: (id: string) => {
    return api.get<{ warehouse: Warehouse }>(`/warehouses/${id}`);
  },

  createWarehouse: (data: { name: string; code: string; address?: string }) => {
    return api.post<{ warehouse: Warehouse }>('/warehouses', data);
  },

  updateWarehouse: (
    id: string,
    data: { name?: string; code?: string; address?: string; active?: boolean }
  ) => {
    return api.put<{ warehouse: Warehouse }>(`/warehouses/${id}`, data);
  },

  getLocations: (warehouseId?: string) => {
    return api.get<{ locations: Location[] }>('/warehouses/locations/all', {
      warehouseId,
    });
  },

  createLocation: (data: {
    warehouseId: string;
    name: string;
    code: string;
    type?: string;
  }) => {
    return api.post<{ location: Location }>('/warehouses/locations', data);
  },

  updateLocation: (
    id: string,
    data: { name?: string; code?: string; type?: string; active?: boolean }
  ) => {
    return api.put<{ location: Location }>(`/warehouses/locations/${id}`, data);
  },
};
