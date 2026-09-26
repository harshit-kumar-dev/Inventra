import { Router } from 'express';
import { TransferController } from '../controllers/transfer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  createTransferSchema,
  updateTransferSchema,
  transferQuerySchema,
} from '../validators/transfer.validator';
import { Role } from '@stocksense/database';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(transferQuerySchema), TransferController.getTransfers);
router.get('/:id', TransferController.getTransferById);
router.post('/', validateBody(createTransferSchema), TransferController.createTransfer);
router.put('/:id', validateBody(updateTransferSchema), TransferController.updateTransfer);
router.post('/:id/ready', TransferController.markReady);
router.post('/:id/validate', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), TransferController.validateTransfer);
router.post('/:id/cancel', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), TransferController.cancelTransfer);

export default router;
