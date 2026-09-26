import { z } from 'zod';

export const receiptLineSchema = z.object({
  productId: z.string().uuid('Valid product ID is required'),
  locationId: z.string().uuid('Valid location ID is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
});

export const createReceiptSchema = z.object({
  supplierId: z.string().uuid('Valid supplier ID is required'),
  warehouseId: z.string().uuid('Valid warehouse ID is required'),
  scheduleDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).transform((val) => new Date(val)),
  responsible: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(receiptLineSchema).min(1, 'Receipt must contain at least one product line'),
});

export const updateReceiptSchema = z.object({
  supplierId: z.string().uuid('Valid supplier ID is required').optional(),
  warehouseId: z.string().uuid('Valid warehouse ID is required').optional(),
  scheduleDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).transform((val) => new Date(val)).optional(),
  responsible: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(receiptLineSchema).min(1, 'Receipt must contain at least one product line').optional(),
});

export const receiptQuerySchema = z.object({
  status: z.enum(['DRAFT', 'READY', 'DONE', 'CANCELED', 'ALL']).optional(),
  warehouseId: z.string().optional(),
  supplierId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
});
