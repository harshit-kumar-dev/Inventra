import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@stocksense/database';

const router = Router();

// Only ADMIN or INVENTORY_MANAGER can access users
router.use(authenticate);

// View list of users - allowed for ADMIN and INVENTORY_MANAGER
router.get('/', authorize([Role.ADMIN, Role.INVENTORY_MANAGER]), UserController.getAll);
router.get('/:id', authorize([Role.ADMIN, Role.INVENTORY_MANAGER]), UserController.getById);

// Create, Update, Delete - strictly ADMIN only
router.post('/', authorize([Role.ADMIN]), UserController.create);
router.put('/:id', authorize([Role.ADMIN]), UserController.update);
router.delete('/:id', authorize([Role.ADMIN]), UserController.delete);

export default router;
