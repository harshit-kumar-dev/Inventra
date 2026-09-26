import { z } from 'zod';

export const adjustmentLineSchema = z.object({
  productId: z.string().uuid('Valid product ID is required'),
  countedQuantity: z.number().min(0, 'Counted quantity cannot be negative'),
});

export const createAdjustmentSchema = z.object({
  warehouseId: z.string().uuid('Valid warehouse ID is required'),
  locationId: z.string().uuid('Valid location ID is required'),
  reason: z.string().min(2, 'Reason for adjustment is required'),
  notes: z.string().optional(),
  lines: z.array(adjustmentLineSchema).min(1, 'Adjustment must contain at least one product line'),
});

export const updateAdjustmentSchema = z.object({
  warehouseId: z.string().uuid('Valid warehouse ID is required').optional(),
  locationId: z.string().uuid('Valid location ID is required').optional(),
  reason: z.string().min(2, 'Reason for adjustment is required').optional(),
  notes: z.string().optional(),
  lines: z.array(adjustmentLineSchema).min(1, 'Adjustment must contain at least one product line').optional(),
});

export const adjustmentQuerySchema = z.object({
  status: z.enum(['DRAFT', 'READY', 'DONE', 'CANCELED', 'ALL']).optional(),
  warehouseId: z.string().optional(),
  locationId: z.string().optional(),
  productId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
});
