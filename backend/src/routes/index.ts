import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import unitRoutes from './unit.routes';
import supplierRoutes from './supplier.routes';
import warehouseRoutes from './warehouse.routes';
import stockRoutes from './stock.routes';
import receiptRoutes from './receipt.routes';
import deliveryRoutes from './delivery.routes';
import transferRoutes from './transfer.routes';
import adjustmentRoutes from './adjustment.routes';
import dashboardRoutes from './dashboard.routes';
import notificationRoutes from './notification.routes';
import userRoutes from './user.routes';
import { prisma } from '@stocksense/database';

const router = Router();

// Health check endpoint (Phase 14 requirement)
router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
    });
  }
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/units', unitRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/stock', stockRoutes);
router.use('/receipts', receiptRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/transfers', transferRoutes);
router.use('/adjustments', adjustmentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);
router.use('/users', userRoutes);

export default router;
