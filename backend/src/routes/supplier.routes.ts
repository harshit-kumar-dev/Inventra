import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { createSupplierSchema, updateSupplierSchema } from '../validators/supplier.validator';
import { Role } from '@stocksense/database';

const router = Router();

router.use(authenticate);

router.get('/', SupplierController.getAll);
router.get('/:id', SupplierController.getById);
router.post('/', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), validateBody(createSupplierSchema), SupplierController.create);
router.put('/:id', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), validateBody(updateSupplierSchema), SupplierController.update);

export default router;
