import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../validators/product.validator';
import { Role } from '@stocksense/database';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(productQuerySchema), ProductController.getProducts);
router.get('/:id', ProductController.getProductById);
router.post('/', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), validateBody(createProductSchema), ProductController.createProduct);
router.put('/:id', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), validateBody(updateProductSchema), ProductController.updateProduct);
router.patch('/:id/status', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), ProductController.toggleProductStatus);

export default router;
