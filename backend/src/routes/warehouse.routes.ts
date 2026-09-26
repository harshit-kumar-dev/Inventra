import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@stocksense/database';

const router = Router();

router.use(authenticate);

// Warehouses
router.get('/', WarehouseController.getWarehouses);
router.get('/locations/all', WarehouseController.getLocations);
router.get('/:id', WarehouseController.getWarehouseById);
router.post('/', authorize([Role.INVENTORY_MANAGER]), WarehouseController.createWarehouse);
router.put('/:id', authorize([Role.INVENTORY_MANAGER]), WarehouseController.updateWarehouse);

// Locations
router.post('/locations', authorize([Role.INVENTORY_MANAGER]), WarehouseController.createLocation);
router.put('/locations/:id', authorize([Role.INVENTORY_MANAGER]), WarehouseController.updateLocation);

export default router;
