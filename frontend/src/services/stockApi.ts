import { api } from './api';

export interface StockItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  productName: string;
  sku: string;
  uom: string;
  locationName: string;
  locationCode: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  updatedAt: string;
}

export interface StockLedgerEntry {
  id: string;
  productId: string;
  locationId: string;
  operationType:
    | 'RECEIPT'
    | 'DELIVERY'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'ADJUSTMENT_GAIN'
    | 'ADJUSTMENT_LOSS'
    | 'INITIAL_SEED';
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  userId?: string;
  notes?: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    uom?: { name: string; symbol: string };
  };
  location?: {
    id: string;
    name: string;
    code: string;
    warehouse: { id: string; name: string; code: string };
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export const stockApi = {
  queryStock: (query?: any) => {
    return api.get<{ stock: StockItem[] }>('/stock', query);
  },

  getStockByProduct: (productId: string) => {
    return api.get<{ stock: StockItem[] }>(`/stock/products/${productId}`);
  },

  getStockByWarehouse: (warehouseId: string) => {
    return api.get<{ stock: StockItem[] }>(`/stock/warehouses/${warehouseId}`);
  },

  getStockByLocation: (locationId: string) => {
    return api.get<{ stock: StockItem[] }>(`/stock/locations/${locationId}`);
  },

  getLedgerHistory: (query?: {
    productId?: string;
    warehouseId?: string;
    locationId?: string;
    operationType?: string;
    referenceType?: string;
    page?: number;
    limit?: number;
  }) => {
    return api.get<{
      entries: StockLedgerEntry[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>('/stock/ledger', query);
  },

  getStockAlerts: () => {
    return api.get<{
      alerts: {
        lowStock: any[];
        outOfStock: any[];
        totalAlerts: number;
      };
    }>('/stock/alerts');
  },
};
