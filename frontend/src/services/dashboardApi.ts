import { api } from './api';

export interface DashboardSummary {
  inventory: {
    totalActiveProducts: number;
    totalProductsInStock: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  receipts: {
    pending: number;
    late: number;
    completed: number;
    label: string;
  };
  deliveries: {
    pending: number;
    late: number;
    waiting: number;
    completed: number;
    label: string;
  };
  transfers: {
    scheduled: number;
    late: number;
    completed: number;
  };
  adjustments: {
    completed: number;
  };
}

export interface NotificationItem {
  id: string;
  userId?: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OPERATION_PENDING' | 'SYSTEM';
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
}

export const dashboardApi = {
  getSummary: () => api.get<DashboardSummary>('/dashboard/summary'),
  getLowStock: (page = 1, limit = 20) => api.get<{ products: any[] }>('/dashboard/low-stock', { page, limit }),
  getOperations: (query?: any) => api.get<{ operations: any[] }>('/dashboard/operations', query),
  getNotifications: () => api.get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/notifications/read-all'),
};
