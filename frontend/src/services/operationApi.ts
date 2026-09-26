import { api } from './api';

// --- Receipts ---
export interface ReceiptLine {
  id?: string;
  productId: string;
  locationId: string;
  quantity: number;
  product?: { id: string; name: string; sku: string; uom?: { symbol: string } };
  location?: { id: string; name: string; code: string };
}

export interface Receipt {
  id: string;
  referenceNo: string;
  supplierId: string;
  warehouseId: string;
  status: 'DRAFT' | 'READY' | 'DONE' | 'CANCELED';
  scheduleDate: string;
  responsible?: string;
  notes?: string;
  supplier: { id: string; name: string; email?: string; phone?: string };
  warehouse: { id: string; name: string; code: string };
  creator?: { id: string; name: string };
  validator?: { id: string; name: string };
  lines: ReceiptLine[];
  isLate?: boolean;
  totalQuantity?: number;
  totalItems?: number;
  createdAt: string;
  updatedAt: string;
}

// --- Deliveries ---
export interface DeliveryLine {
  id?: string;
  productId: string;
  locationId: string;
  quantity: number;
  availableStock?: number;
  isShortage?: boolean;
  product?: { id: string; name: string; sku: string; uom?: { symbol: string } };
  location?: { id: string; name: string; code: string };
}

export interface Delivery {
  id: string;
  referenceNo: string;
  customerName: string;
  deliveryAddress?: string;
  warehouseId: string;
  status: 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED';
  scheduleDate: string;
  responsible?: string;
  notes?: string;
  warehouse: { id: string; name: string; code: string };
  creator?: { id: string; name: string };
  validator?: { id: string; name: string };
  lines: DeliveryLine[];
  isLate?: boolean;
  hasShortage?: boolean;
  totalQuantity?: number;
  totalItems?: number;
  createdAt: string;
  updatedAt: string;
}

// --- Transfers ---
export interface TransferLine {
  id?: string;
  productId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: number;
  product?: { id: string; name: string; sku: string; uom?: { symbol: string } };
  sourceLocation?: { id: string; name: string; code: string };
  destinationLocation?: { id: string; name: string; code: string };
}

export interface InternalTransfer {
  id: string;
  referenceNo: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  status: 'DRAFT' | 'READY' | 'DONE' | 'CANCELED';
  scheduleDate: string;
  responsible?: string;
  notes?: string;
  sourceWarehouse: { id: string; name: string; code: string };
  destinationWarehouse: { id: string; name: string; code: string };
  creator?: { id: string; name: string };
  validator?: { id: string; name: string };
  lines: TransferLine[];
  isLate?: boolean;
  totalQuantity?: number;
  totalItems?: number;
  createdAt: string;
  updatedAt: string;
}

// --- Adjustments ---
export interface AdjustmentLine {
  id?: string;
  productId: string;
  previousQuantity: number;
  countedQuantity: number;
  delta: number;
  product?: { id: string; name: string; sku: string; uom?: { symbol: string } };
}

export interface StockAdjustment {
  id: string;
  referenceNo: string;
  warehouseId: string;
  locationId: string;
  status: 'DRAFT' | 'READY' | 'DONE' | 'CANCELED';
  reason: string;
  notes?: string;
  warehouse: { id: string; name: string; code: string };
  location: { id: string; name: string; code: string };
  creator?: { id: string; name: string };
  validator?: { id: string; name: string };
  lines: AdjustmentLine[];
  netDelta?: number;
  totalLines?: number;
  createdAt: string;
  updatedAt: string;
}

export const operationApi = {
  // Receipts
  getReceipts: (query?: any) => api.get<{ receipts: Receipt[] }>('/receipts', query),
  getReceiptById: (id: string) => api.get<{ receipt: Receipt }>(`/receipts/${id}`),
  createReceipt: (data: any) => api.post<{ receipt: Receipt }>('/receipts', data),
  updateReceipt: (id: string, data: any) => api.put<{ receipt: Receipt }>(`/receipts/${id}`, data),
  readyReceipt: (id: string) => api.post<{ receipt: Receipt }>(`/receipts/${id}/ready`),
  validateReceipt: (id: string) => api.post<{ receipt: Receipt }>(`/receipts/${id}/validate`),
  cancelReceipt: (id: string) => api.post<{ receipt: Receipt }>(`/receipts/${id}/cancel`),

  // Deliveries
  getDeliveries: (query?: any) => api.get<{ deliveries: Delivery[] }>('/deliveries', query),
  getDeliveryById: (id: string) => api.get<{ delivery: Delivery }>(`/deliveries/${id}`),
  createDelivery: (data: any) => api.post<{ delivery: Delivery }>('/deliveries', data),
  updateDelivery: (id: string, data: any) => api.put<{ delivery: Delivery }>(`/deliveries/${id}`, data),
  readyDelivery: (id: string) => api.post<{ delivery: Delivery }>(`/deliveries/${id}/ready`),
  validateDelivery: (id: string) => api.post<{ delivery: Delivery }>(`/deliveries/${id}/validate`),
  cancelDelivery: (id: string) => api.post<{ delivery: Delivery }>(`/deliveries/${id}/cancel`),

  // Transfers
  getTransfers: (query?: any) => api.get<{ transfers: InternalTransfer[] }>('/transfers', query),
  getTransferById: (id: string) => api.get<{ transfer: InternalTransfer }>(`/transfers/${id}`),
  createTransfer: (data: any) => api.post<{ transfer: InternalTransfer }>('/transfers', data),
  updateTransfer: (id: string, data: any) => api.put<{ transfer: InternalTransfer }>(`/transfers/${id}`, data),
  readyTransfer: (id: string) => api.post<{ transfer: InternalTransfer }>(`/transfers/${id}/ready`),
  validateTransfer: (id: string) => api.post<{ transfer: InternalTransfer }>(`/transfers/${id}/validate`),
  cancelTransfer: (id: string) => api.post<{ transfer: InternalTransfer }>(`/transfers/${id}/cancel`),

  // Adjustments
  getAdjustments: (query?: any) => api.get<{ adjustments: StockAdjustment[] }>('/adjustments', query),
  getAdjustmentById: (id: string) => api.get<{ adjustment: StockAdjustment }>(`/adjustments/${id}`),
  createAdjustment: (data: any) => api.post<{ adjustment: StockAdjustment }>('/adjustments', data),
  updateAdjustment: (id: string, data: any) => api.put<{ adjustment: StockAdjustment }>(`/adjustments/${id}`, data),
  readyAdjustment: (id: string) => api.post<{ adjustment: StockAdjustment }>(`/adjustments/${id}/ready`),
  validateAdjustment: (id: string) => api.post<{ adjustment: StockAdjustment }>(`/adjustments/${id}/validate`),
  cancelAdjustment: (id: string) => api.post<{ adjustment: StockAdjustment }>(`/adjustments/${id}/cancel`),
};
