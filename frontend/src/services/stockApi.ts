import { api } from './api';

export interface StockItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  onHand?: number;
  reserved?: number;
  freeToUse?: number;
  productName: string;
  sku: string;
  category?: string;
  uom: string;
  perUnitCost?: number;
  reorderLevel?: number;
  locationName: string;
  locationCode: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  stockStatus?: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  updatedAt: string;
}

export interface StockLedgerEntry {
  id: string;
  productId: string;
  productName?: string;
  sku?: string;
  uom?: string;
  warehouseName?: string;
  warehouseCode?: string;
  locationId: string;
  locationName?: string;
  locationCode?: string;
  operationType:
    | 'RECEIPT'
    | 'DELIVERY'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'ADJUSTMENT_GAIN'
    | 'ADJUSTMENT_LOSS'
    | 'INITIAL_SEED';
  quantity: number;
  balanceAfter?: number;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  createdBy?: string;
  userId?: string;
  notes?: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    uom?: { name?: string; symbol: string };
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
    email?: string;
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
      ledger: StockLedgerEntry[];
      entries?: StockLedgerEntry[];
      pagination?: {
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
