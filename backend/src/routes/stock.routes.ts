import { Router } from 'express';
import { StockController } from '../controllers/stock.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', StockController.queryStock);
router.get('/alerts', StockController.getStockAlerts);
router.get('/products/:productId', StockController.getStockByProduct);
router.get('/warehouses/:warehouseId', StockController.getStockByWarehouse);
router.get('/locations/:locationId', StockController.getStockByLocation);
router.get('/ledger', StockController.getLedgerHistory);

export default router;
