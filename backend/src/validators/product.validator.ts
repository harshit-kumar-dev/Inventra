import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(2, 'SKU must be at least 2 characters').toUpperCase(),
  description: z.string().optional(),
  perUnitCost: z.number().min(0, 'Unit cost must be a non-negative number').default(0),
  categoryId: z.string().uuid('Valid category ID is required'),
  uomId: z.string().uuid('Valid Unit of Measure ID is required'),
  reorderLevel: z.number().min(0, 'Reorder level must be non-negative').default(10),
  active: z.boolean().default(true),
});

export const updateProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').optional(),
  sku: z.string().min(2, 'SKU must be at least 2 characters').toUpperCase().optional(),
  description: z.string().optional(),
  perUnitCost: z.number().min(0, 'Unit cost must be a non-negative number').optional(),
  categoryId: z.string().uuid('Valid category ID is required').optional(),
  uomId: z.string().uuid('Valid Unit of Measure ID is required').optional(),
  reorderLevel: z.number().min(0, 'Reorder level must be non-negative').optional(),
  active: z.boolean().optional(),
});

export const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  active: z.enum(['true', 'false', 'all']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
});
