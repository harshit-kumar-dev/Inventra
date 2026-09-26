import { prisma, DocumentStatus, OperationType } from '../config/db';

export class DashboardService {
  /**
   * Calculate live real-time operational KPI summary
   */
  static async getSummary() {
    const now = new Date();

    // 1. Query products with their location-level stock
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        stockQuantities: { select: { quantity: true } },
      },
    });

    let totalProductsInStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const totalStock = p.stockQuantities.reduce((sum, sq) => sum + sq.quantity, 0);
      if (totalStock <= 0) {
        outOfStockCount++;
      } else {
        totalProductsInStock++;
        if (totalStock <= p.reorderLevel) {
          lowStockCount++;
        }
      }
    }

    // 2. Receipt Statistics
    const [
      pendingReceipts,
      lateReceipts,
      totalReceiptsDone,
    ] = await Promise.all([
      prisma.receipt.count({
        where: { status: { in: [DocumentStatus.DRAFT, DocumentStatus.READY] } },
      }),
      prisma.receipt.count({
        where: {
          status: { in: [DocumentStatus.DRAFT, DocumentStatus.READY] },
          scheduleDate: { lt: now },
        },
      }),
      prisma.receipt.count({
        where: { status: DocumentStatus.DONE },
      }),
    ]);

    // 3. Delivery Statistics
    const [
      pendingDeliveries,
      lateDeliveries,
      waitingDeliveries,
      totalDeliveriesDone,
    ] = await Promise.all([
      prisma.delivery.count({
        where: { status: { in: [DocumentStatus.DRAFT, DocumentStatus.WAITING, DocumentStatus.READY] } },
      }),
      prisma.delivery.count({
        where: {
          status: { in: [DocumentStatus.DRAFT, DocumentStatus.WAITING, DocumentStatus.READY] },
          scheduleDate: { lt: now },
        },
      }),
      prisma.delivery.count({
        where: { status: DocumentStatus.WAITING },
      }),
      prisma.delivery.count({
        where: { status: DocumentStatus.DONE },
      }),
    ]);

    // 4. Internal Transfer Statistics
    const [
      scheduledTransfers,
      lateTransfers,
      totalTransfersDone,
    ] = await Promise.all([
      prisma.internalTransfer.count({
        where: { status: { in: [DocumentStatus.DRAFT, DocumentStatus.READY] } },
      }),
      prisma.internalTransfer.count({
        where: {
          status: { in: [DocumentStatus.DRAFT, DocumentStatus.READY] },
          scheduleDate: { lt: now },
        },
      }),
      prisma.internalTransfer.count({
        where: { status: DocumentStatus.DONE },
      }),
    ]);

    // 5. Stock Adjustments Count
    const totalAdjustmentsDone = await prisma.stockAdjustment.count({
      where: { status: DocumentStatus.DONE },
    });

    return {
      inventory: {
        totalActiveProducts: products.length,
        totalProductsInStock,
        lowStockCount,
        outOfStockCount,
      },
      receipts: {
        pending: pendingReceipts,
        late: lateReceipts,
        completed: totalReceiptsDone,
        label: `${pendingReceipts} to receive`,
      },
      deliveries: {
        pending: pendingDeliveries,
        late: lateDeliveries,
        waiting: waitingDeliveries,
        completed: totalDeliveriesDone,
        label: `${pendingDeliveries} to deliver`,
      },
      transfers: {
        scheduled: scheduledTransfers,
        late: lateTransfers,
        completed: totalTransfersDone,
      },
      adjustments: {
        completed: totalAdjustmentsDone,
      },
    };
  }

  /**
   * Get Low Stock & Out of Stock products list
   */
  static async getLowStockProducts(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: { select: { id: true, name: true } },
        uom: { select: { id: true, name: true, symbol: true } },
        stockQuantities: {
          include: {
            location: {
              include: { warehouse: { select: { name: true, code: true } } },
            },
          },
        },
      },
    });

    const lowOrOutProducts = products
      .map((p) => {
        const totalStock = p.stockQuantities.reduce((sum, sq) => sum + sq.quantity, 0);
        let stockStatus: 'LOW_STOCK' | 'OUT_OF_STOCK' | null = null;

        if (totalStock <= 0) {
          stockStatus = 'OUT_OF_STOCK';
        } else if (totalStock <= p.reorderLevel) {
          stockStatus = 'LOW_STOCK';
        }

        if (!stockStatus) return null;

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category.name,
          uom: p.uom.symbol,
          perUnitCost: p.perUnitCost,
          reorderLevel: p.reorderLevel,
          currentStock: totalStock,
          deficit: p.reorderLevel > totalStock ? p.reorderLevel - totalStock : 0,
          stockStatus,
          stockByLocation: p.stockQuantities.map((sq) => ({
            locationName: sq.location.name,
            warehouseCode: sq.location.warehouse.code,
            quantity: sq.quantity,
          })),
        };
      })
      .filter(Boolean);

    const total = lowOrOutProducts.length;
    const paginated = lowOrOutProducts.slice(skip, skip + limit);

    return {
      products: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Unified Operations Feed across Receipts, Deliveries, Transfers, and Adjustments
   */
  static async getOperationsFeed(query: {
    type?: 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT' | 'ALL';
    status?: 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED' | 'ALL';
    warehouseId?: string;
    locationId?: string;
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const operations: any[] = [];

    const statusFilter = query.status && query.status !== 'ALL' ? (query.status as DocumentStatus) : undefined;

    // 1. Fetch Receipts
    if (!query.type || query.type === 'ALL' || query.type === 'RECEIPT') {
      const receiptWhere: any = {};
      if (statusFilter) receiptWhere.status = statusFilter;
      if (query.warehouseId) receiptWhere.warehouseId = query.warehouseId;
      if (query.locationId) receiptWhere.lines = { some: { locationId: query.locationId } };
      if (query.categoryId) receiptWhere.lines = { some: { product: { categoryId: query.categoryId } } };
      if (query.search) {
        receiptWhere.OR = [
          { referenceNo: { contains: query.search.trim(), mode: 'insensitive' } },
          { supplier: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
        ];
      }

      const receipts = await prisma.receipt.findMany({
        where: receiptWhere,
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { name: true } },
          warehouse: { select: { name: true, code: true } },
          lines: {
            include: {
              product: { select: { name: true, sku: true } },
              location: { select: { name: true, code: true } },
            },
          },
        },
      });

      receipts.forEach((r) => {
        operations.push({
          id: r.id,
          operationType: 'RECEIPT',
          referenceNo: r.referenceNo,
          partner: r.supplier.name,
          warehouseName: r.warehouse.name,
          warehouseCode: r.warehouse.code,
          status: r.status,
          scheduleDate: r.scheduleDate,
          itemCount: r.lines.length,
          totalQuantity: r.lines.reduce((sum, l) => sum + l.quantity, 0),
          createdAt: r.createdAt,
        });
      });
    }

    // 2. Fetch Deliveries
    if (!query.type || query.type === 'ALL' || query.type === 'DELIVERY') {
      const deliveryWhere: any = {};
      if (statusFilter) deliveryWhere.status = statusFilter;
      if (query.warehouseId) deliveryWhere.warehouseId = query.warehouseId;
      if (query.locationId) deliveryWhere.lines = { some: { locationId: query.locationId } };
      if (query.categoryId) deliveryWhere.lines = { some: { product: { categoryId: query.categoryId } } };
      if (query.search) {
        deliveryWhere.OR = [
          { referenceNo: { contains: query.search.trim(), mode: 'insensitive' } },
          { customerName: { contains: query.search.trim(), mode: 'insensitive' } },
        ];
      }

      const deliveries = await prisma.delivery.findMany({
        where: deliveryWhere,
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { name: true, code: true } },
          lines: {
            include: {
              product: { select: { name: true, sku: true } },
              location: { select: { name: true, code: true } },
            },
          },
        },
      });

      deliveries.forEach((d) => {
        operations.push({
          id: d.id,
          operationType: 'DELIVERY',
          referenceNo: d.referenceNo,
          partner: d.customerName,
          warehouseName: d.warehouse.name,
          warehouseCode: d.warehouse.code,
          status: d.status,
          scheduleDate: d.scheduleDate,
          itemCount: d.lines.length,
          totalQuantity: d.lines.reduce((sum, l) => sum + l.quantity, 0),
          createdAt: d.createdAt,
        });
      });
    }

    // 3. Fetch Transfers
    if (!query.type || query.type === 'ALL' || query.type === 'INTERNAL_TRANSFER') {
      const transferWhere: any = {};
      if (statusFilter) transferWhere.status = statusFilter;
      if (query.warehouseId) {
        transferWhere.OR = [
          { sourceWarehouseId: query.warehouseId },
          { destinationWarehouseId: query.warehouseId },
        ];
      }
      if (query.search) {
        transferWhere.referenceNo = { contains: query.search.trim(), mode: 'insensitive' };
      }

      const transfers = await prisma.internalTransfer.findMany({
        where: transferWhere,
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          sourceWarehouse: { select: { name: true, code: true } },
          destinationWarehouse: { select: { name: true, code: true } },
          lines: {
            include: {
              product: { select: { name: true, sku: true } },
              sourceLocation: { select: { name: true, code: true } },
              destinationLocation: { select: { name: true, code: true } },
            },
          },
        },
      });

      transfers.forEach((t) => {
        operations.push({
          id: t.id,
          operationType: 'INTERNAL_TRANSFER',
          referenceNo: t.referenceNo,
          partner: `${t.sourceWarehouse.code} ➔ ${t.destinationWarehouse.code}`,
          warehouseName: `${t.sourceWarehouse.name} ➔ ${t.destinationWarehouse.name}`,
          warehouseCode: t.sourceWarehouse.code,
          status: t.status,
          scheduleDate: t.scheduleDate,
          itemCount: t.lines.length,
          totalQuantity: t.lines.reduce((sum, l) => sum + l.quantity, 0),
          createdAt: t.createdAt,
        });
      });
    }

    // 4. Fetch Adjustments
    if (!query.type || query.type === 'ALL' || query.type === 'ADJUSTMENT') {
      const adjWhere: any = {};
      if (statusFilter) adjWhere.status = statusFilter;
      if (query.warehouseId) adjWhere.warehouseId = query.warehouseId;
      if (query.locationId) adjWhere.locationId = query.locationId;
      if (query.search) {
        adjWhere.OR = [
          { referenceNo: { contains: query.search.trim(), mode: 'insensitive' } },
          { reason: { contains: query.search.trim(), mode: 'insensitive' } },
        ];
      }

      const adjustments = await prisma.stockAdjustment.findMany({
        where: adjWhere,
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { name: true, code: true } },
          location: { select: { name: true, code: true } },
          lines: {
            include: {
              product: { select: { name: true, sku: true } },
            },
          },
        },
      });

      adjustments.forEach((a) => {
        operations.push({
          id: a.id,
          operationType: 'ADJUSTMENT',
          referenceNo: a.referenceNo,
          partner: a.reason,
          warehouseName: a.warehouse.name,
          warehouseCode: a.warehouse.code,
          status: a.status,
          scheduleDate: a.createdAt,
          itemCount: a.lines.length,
          totalQuantity: a.lines.reduce((sum, l) => sum + Math.abs(l.delta), 0),
          createdAt: a.createdAt,
        });
      });
    }

    // Sort combined operations by createdAt desc
    operations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = operations.length;
    const skip = (page - 1) * limit;
    const paginated = operations.slice(skip, skip + limit);

    return {
      operations: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
