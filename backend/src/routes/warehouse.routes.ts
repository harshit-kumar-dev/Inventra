import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@stocksense/database';

const router = Router();

// Require valid authentication token
router.use(authenticate);

// Strictly protect ALL Warehouse and Location master data routes for ADMIN and INVENTORY_MANAGER only.
// WAREHOUSE_STAFF will receive 403 Forbidden on any attempts.
router.use(authorize([Role.ADMIN, Role.INVENTORY_MANAGER]));

// Warehouses
router.get('/', WarehouseController.getWarehouses);
router.get('/locations/all', WarehouseController.getLocations);
router.get('/:id', WarehouseController.getWarehouseById);
router.post('/', WarehouseController.createWarehouse);
router.put('/:id', WarehouseController.updateWarehouse);
router.delete('/:id', WarehouseController.deleteWarehouse);

// Locations
router.post('/locations', WarehouseController.createLocation);
router.put('/locations/:id', WarehouseController.updateLocation);
router.delete('/locations/:id', WarehouseController.deleteLocation);

export default router;
