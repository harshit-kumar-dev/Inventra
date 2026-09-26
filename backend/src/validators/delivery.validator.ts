import { z } from 'zod';

export const deliveryLineSchema = z.object({
  productId: z.string().uuid('Valid product ID is required'),
  locationId: z.string().uuid('Valid location ID is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
});

export const createDeliverySchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  deliveryAddress: z.string().optional(),
  warehouseId: z.string().uuid('Valid warehouse ID is required'),
  scheduleDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).transform((val) => new Date(val)),
  responsible: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(deliveryLineSchema).min(1, 'Delivery order must contain at least one product line'),
});

export const updateDeliverySchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters').optional(),
  deliveryAddress: z.string().optional(),
  warehouseId: z.string().uuid('Valid warehouse ID is required').optional(),
  scheduleDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).transform((val) => new Date(val)).optional(),
  responsible: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(deliveryLineSchema).min(1, 'Delivery order must contain at least one product line').optional(),
});

export const deliveryQuerySchema = z.object({
  status: z.enum(['DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED', 'ALL']).optional(),
  warehouseId: z.string().optional(),
  productId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
});
