import { Router } from 'express';
import { ReceiptController } from '../controllers/receipt.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  createReceiptSchema,
  updateReceiptSchema,
  receiptQuerySchema,
} from '../validators/receipt.validator';
import { Role } from '@stocksense/database';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(receiptQuerySchema), ReceiptController.getReceipts);
router.get('/:id', ReceiptController.getReceiptById);
router.post('/', validateBody(createReceiptSchema), ReceiptController.createReceipt);
router.put('/:id', validateBody(updateReceiptSchema), ReceiptController.updateReceipt);
router.post('/:id/ready', ReceiptController.markReady);
router.post('/:id/validate', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), ReceiptController.validateReceipt);
router.post('/:id/cancel', authorize([Role.INVENTORY_MANAGER, Role.ADMIN]), ReceiptController.cancelReceipt);

export default router;
