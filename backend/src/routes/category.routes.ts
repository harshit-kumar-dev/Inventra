import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';
import { Role } from '@stocksense/database';

const router = Router();

router.use(authenticate);

router.get('/', CategoryController.getAll);
router.post('/', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), validateBody(createCategorySchema), CategoryController.create);
router.put('/:id', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), validateBody(updateCategorySchema), CategoryController.update);

export default router;
