import { Router } from 'express';
import { AdjustmentController } from '../controllers/adjustment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  createAdjustmentSchema,
  updateAdjustmentSchema,
  adjustmentQuerySchema,
} from '../validators/adjustment.validator';
import { Role } from '@stocksense/database';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(adjustmentQuerySchema), AdjustmentController.getAdjustments);
router.get('/:id', AdjustmentController.getAdjustmentById);
router.post('/', validateBody(createAdjustmentSchema), AdjustmentController.createAdjustment);
router.put('/:id', validateBody(updateAdjustmentSchema), AdjustmentController.updateAdjustment);
router.post('/:id/ready', AdjustmentController.markReady);
router.post('/:id/validate', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), AdjustmentController.validateAdjustment);
router.post('/:id/cancel', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), AdjustmentController.cancelAdjustment);

export default router;
