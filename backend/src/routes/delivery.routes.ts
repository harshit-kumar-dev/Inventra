import { Router } from 'express';
import { DeliveryController } from '../controllers/delivery.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  createDeliverySchema,
  updateDeliverySchema,
  deliveryQuerySchema,
} from '../validators/delivery.validator';
import { Role } from '@stocksense/database';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(deliveryQuerySchema), DeliveryController.getDeliveries);
router.get('/:id', DeliveryController.getDeliveryById);
router.post('/', validateBody(createDeliverySchema), DeliveryController.createDelivery);
router.put('/:id', validateBody(updateDeliverySchema), DeliveryController.updateDelivery);
router.post('/:id/ready', DeliveryController.markReady);
router.post('/:id/validate', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), DeliveryController.validateDelivery);
router.post('/:id/cancel', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), DeliveryController.cancelDelivery);

export default router;
