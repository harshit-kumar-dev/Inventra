import { z } from 'zod';

export const transferLineSchema = z.object({
  productId: z.string().uuid('Valid product ID is required'),
  sourceLocationId: z.string().uuid('Valid source location ID is required'),
  destinationLocationId: z.string().uuid('Valid destination location ID is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
});

export const createTransferSchema = z.object({
  sourceWarehouseId: z.string().uuid('Valid source warehouse ID is required'),
  destinationWarehouseId: z.string().uuid('Valid destination warehouse ID is required'),
  scheduleDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).transform((val) => new Date(val)),
  responsible: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(transferLineSchema).min(1, 'Transfer must contain at least one product line'),
});

export const updateTransferSchema = z.object({
  sourceWarehouseId: z.string().uuid('Valid source warehouse ID is required').optional(),
  destinationWarehouseId: z.string().uuid('Valid destination warehouse ID is required').optional(),
  scheduleDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).transform((val) => new Date(val)).optional(),
  responsible: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(transferLineSchema).min(1, 'Transfer must contain at least one product line').optional(),
});

export const transferQuerySchema = z.object({
  status: z.enum(['DRAFT', 'READY', 'DONE', 'CANCELED', 'ALL']).optional(),
  sourceWarehouseId: z.string().optional(),
  destinationWarehouseId: z.string().optional(),
  productId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
});
