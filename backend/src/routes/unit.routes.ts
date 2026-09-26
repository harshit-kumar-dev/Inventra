import { Router } from 'express';
import { UnitController } from '../controllers/unit.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', UnitController.getAll);

export default router;
