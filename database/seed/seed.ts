import { PrismaClient, Role, DocumentStatus, OperationType, LocationType, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting deterministic Inventra database seed...');

  // -------------------------------------------------------------
  // 1. CLEANUP EXISTING DATA (IDEMPOTENT RESET)
  // -------------------------------------------------------------
  console.log('🧹 Cleaning existing records...');
  await prisma.notification.deleteMany({});
  await prisma.stockLedger.deleteMany({});
  await prisma.adjustmentLine.deleteMany({});
  await prisma.stockAdjustment.deleteMany({});
  await prisma.transferLine.deleteMany({});
  await prisma.internalTransfer.deleteMany({});
  await prisma.deliveryLine.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.receiptLine.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.stockQuantity.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.unitOfMeasure.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.passwordResetOTP.deleteMany({});
  await prisma.user.deleteMany({});

  // -------------------------------------------------------------
  // 2. SEED USERS
  // -------------------------------------------------------------
  console.log('👤 Seeding users...');
  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

  const manager = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins',
      loginId: 'manager1',
      email: 'manager@inventra.com',
      passwordHash: defaultPasswordHash,
      role: Role.INVENTORY_MANAGER,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      loginId: 'warehouse1',
      email: 'staff@inventra.com',
      passwordHash: defaultPasswordHash,
      role: Role.WAREHOUSE_STAFF,
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Harshit Kumar (Admin)',
      loginId: 'admin',
      email: 'harshit81k@gmail.com',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
    },
  });

  // -------------------------------------------------------------
  // 3. SEED WAREHOUSES & LOCATIONS
  // -------------------------------------------------------------
  console.log('🏢 Seeding warehouses and locations...');
  const mainWh = await prisma.warehouse.create({
    data: {
      name: 'Main Warehouse',
      code: 'WH',
      address: '100 Industrial Parkway, Sector 4, Metro City',
      active: true,
    },
  });

  const secWh = await prisma.warehouse.create({
    data: {
      name: 'Secondary Warehouse',
      code: 'WH2',
      address: '45 Cargo Road, Docklands Logistics Hub',
      active: true,
    },
  });

  const locMainStore = await prisma.location.create({
    data: { warehouseId: mainWh.id, name: 'Main Store', code: 'MAIN', type: LocationType.INTERNAL },
  });

  const locRackA = await prisma.location.create({
    data: { warehouseId: mainWh.id, name: 'Rack A', code: 'RACK_A', type: LocationType.INTERNAL },
  });

  const locRackB = await prisma.location.create({
    data: { warehouseId: mainWh.id, name: 'Rack B', code: 'RACK_B', type: LocationType.INTERNAL },
  });

  const locProdFloor = await prisma.location.create({
    data: { warehouseId: mainWh.id, name: 'Production Floor', code: 'PROD', type: LocationType.PRODUCTION },
  });

  const locSecStore = await prisma.location.create({
    data: { warehouseId: secWh.id, name: 'Secondary Store', code: 'SEC_MAIN', type: LocationType.INTERNAL },
  });

  const locSecBay = await prisma.location.create({
    data: { warehouseId: secWh.id, name: 'Dispatch Bay', code: 'DISPATCH', type: LocationType.INTERNAL },
  });

  // -------------------------------------------------------------
  // 4. SEED CATEGORIES & UOM
  // -------------------------------------------------------------
  console.log('📦 Seeding categories and units of measure...');
  const catRaw = await prisma.category.create({
    data: { name: 'Raw Material', description: 'Raw materials, metals, and fabrication inputs' },
  });

  const catFinished = await prisma.category.create({
    data: { name: 'Finished Goods', description: 'Manufactured products ready for commercial sale' },
  });

  const catConsumable = await prisma.category.create({
    data: { name: 'Consumables', description: 'PPE, packaging materials, and facility supplies' },
  });

  const uomKg = await prisma.unitOfMeasure.create({ data: { name: 'Kilogram', symbol: 'kg' } });
  const uomPcs = await prisma.unitOfMeasure.create({ data: { name: 'Pieces', symbol: 'pcs' } });
  const uomBox = await prisma.unitOfMeasure.create({ data: { name: 'Box', symbol: 'box' } });
  const uomLitre = await prisma.unitOfMeasure.create({ data: { name: 'Liter', symbol: 'L' } });

  // -------------------------------------------------------------
  // 5. SEED PRODUCTS (12 REALISTIC PRODUCTS)
  // -------------------------------------------------------------
  console.log('🏷️ Seeding products catalog...');
  const pSteelRods = await prisma.product.create({
    data: {
      name: 'Steel Rods 20mm',
      sku: 'RAW-STL-001',
      description: 'High tensile structural steel reinforcing rods (20mm x 6m)',
      perUnitCost: 75.0,
      categoryId: catRaw.id,
      uomId: uomKg.id,
      reorderLevel: 100.0,
    },
  });

  const pSteelSheets = await prisma.product.create({
    data: {
      name: 'Steel Sheets 5mm',
      sku: 'RAW-STL-002',
      description: 'Cold rolled industrial gauge steel sheets (4ft x 8ft)',
      perUnitCost: 120.0,
      categoryId: catRaw.id,
      uomId: uomKg.id,
      reorderLevel: 50.0,
    },
  });

  const pWoodPanels = await prisma.product.create({
    data: {
      name: 'Wood Panels Oak',
      sku: 'RAW-WOD-001',
      description: 'Solid treated oak timber panels for furniture framing',
      perUnitCost: 450.0,
      categoryId: catRaw.id,
      uomId: uomPcs.id,
      reorderLevel: 30.0,
    },
  });

  const pBolts = await prisma.product.create({
    data: {
      name: 'Industrial Bolts M10',
      sku: 'RAW-FAS-001',
      description: 'Galvanized hex-head grade 8.8 M10 bolts (100 pcs/box)',
      perUnitCost: 18.0,
      categoryId: catRaw.id,
      uomId: uomBox.id,
      reorderLevel: 40.0,
    },
  });

  const pNuts = await prisma.product.create({
    data: {
      name: 'Industrial Nuts M10',
      sku: 'RAW-FAS-002',
      description: 'Zinc-plated nylon lock nuts M10 (100 pcs/box)',
      perUnitCost: 14.0,
      categoryId: catRaw.id,
      uomId: uomBox.id,
      reorderLevel: 40.0,
    },
  });

  const pOfficeChair = await prisma.product.create({
    data: {
      name: 'Ergonomic Office Chair',
      sku: 'FG-CHR-001',
      description: 'High-back mesh executive ergonomic swivel chair with lumbar support',
      perUnitCost: 3200.0,
      categoryId: catFinished.id,
      uomId: uomPcs.id,
      reorderLevel: 15.0,
    },
  });

  const pExecutiveDesk = await prisma.product.create({
    data: {
      name: 'Executive Wooden Desk',
      sku: 'FG-DSK-001',
      description: 'Modern minimalist solid wood office workstation with cable routing',
      perUnitCost: 7500.0,
      categoryId: catFinished.id,
      uomId: uomPcs.id,
      reorderLevel: 10.0,
    },
  });

  const pSteelCabinet = await prisma.product.create({
    data: {
      name: 'Heavy Duty Steel Cabinet',
      sku: 'FG-CAB-001',
      description: '4-door secure industrial filing and tool storage cabinet',
      perUnitCost: 5800.0,
      categoryId: catFinished.id,
      uomId: uomPcs.id,
      reorderLevel: 8.0,
    },
  });

  const pSafetyHelmet = await prisma.product.create({
    data: {
      name: 'Industrial Safety Helmet',
      sku: 'CON-SAF-001',
      description: 'ANSI Z89.1 certified high-impact polypropylene hard hat',
      perUnitCost: 250.0,
      categoryId: catConsumable.id,
      uomId: uomPcs.id,
      reorderLevel: 25.0, // CURRENT STOCK IS 12 (LOW STOCK ALERT)
    },
  });

  const pPackagingBoxes = await prisma.product.create({
    data: {
      name: 'Corrugated Packaging Boxes',
      sku: 'CON-PKG-001',
      description: 'Heavy duty 3-ply cardboard shipping boxes 18x14x12 (25 pack)',
      perUnitCost: 35.0,
      categoryId: catConsumable.id,
      uomId: uomBox.id,
      reorderLevel: 100.0, // CURRENT STOCK IS 30 (LOW STOCK ALERT)
    },
  });

  const pMachineLubricant = await prisma.product.create({
    data: {
      name: 'Industrial Machine Lubricant',
      sku: 'CON-LUB-001',
      description: 'High-viscosity anti-wear hydraulic oil ISO VG 46',
      perUnitCost: 180.0,
      categoryId: catConsumable.id,
      uomId: uomLitre.id,
      reorderLevel: 20.0, // CURRENT STOCK IS 0 (OUT OF STOCK ALERT)
    },
  });

  const pSafetyVest = await prisma.product.create({
    data: {
      name: 'High-Vis Safety Vest',
      sku: 'CON-SAF-002',
      description: 'Class 2 reflective safety vest with zipper and dual radio pockets',
      perUnitCost: 120.0,
      categoryId: catConsumable.id,
      uomId: uomPcs.id,
      reorderLevel: 30.0, // CURRENT STOCK IS 0 (OUT OF STOCK ALERT)
    },
  });

  // -------------------------------------------------------------
  // 6. SEED SUPPLIERS (AT LEAST 3)
  // -------------------------------------------------------------
  console.log('🏭 Seeding suppliers...');
  const suppApex = await prisma.supplier.create({
    data: {
      name: 'Apex Steel & Metallurgy Ltd.',
      contactName: 'Robert Vance',
      email: 'sales@apexsteel.com',
      phone: '+91 98765 43210',
      address: 'Plot 12, Industrial Area Phase II, Jamshedpur',
    },
  });

  const suppTimber = await prisma.supplier.create({
    data: {
      name: 'TimberCraft Wood Solutions',
      contactName: 'Elena Rostova',
      email: 'orders@timbercraft.com',
      phone: '+91 98123 45678',
      address: '88 Forest Industrial Hub, Nagpur',
    },
  });

  const suppSafeGuard = await prisma.supplier.create({
    data: {
      name: 'SafeGuard PPE & Supplies',
      contactName: 'Marcus Chang',
      email: 'marcus@safeguard.com',
      phone: '+91 99887 76655',
      address: '22 Safety Lane, Okhla Phase III, New Delhi',
    },
  });

  // -------------------------------------------------------------
  // 7. SEED LOCATION-WISE STOCK QUANTITIES (BALANCED & CONSISTENT)
  // -------------------------------------------------------------
  console.log('📊 Seeding location-aware inventory quantities...');

  // Helper to create StockQuantity
  const createStock = async (productId: string, locationId: string, quantity: number) => {
    return prisma.stockQuantity.create({
      data: { productId, locationId, quantity },
    });
  };

  // Normal Stock Items
  await createStock(pSteelRods.id, locMainStore.id, 250.0);
  await createStock(pSteelRods.id, locRackA.id, 150.0);
  await createStock(pSteelRods.id, locProdFloor.id, 30.0);

  await createStock(pSteelSheets.id, locMainStore.id, 45.0); // was 48, adjusted by -3
  await createStock(pSteelSheets.id, locRackB.id, 60.0);

  await createStock(pWoodPanels.id, locMainStore.id, 80.0);
  await createStock(pWoodPanels.id, locSecStore.id, 35.0);

  await createStock(pBolts.id, locRackA.id, 200.0);
  await createStock(pNuts.id, locRackB.id, 180.0);

  await createStock(pOfficeChair.id, locMainStore.id, 45.0); // 55 received - 10 delivered = 45
  await createStock(pOfficeChair.id, locSecStore.id, 20.0);

  await createStock(pExecutiveDesk.id, locMainStore.id, 25.0);
  await createStock(pSteelCabinet.id, locMainStore.id, 14.0);

  // Low Stock Items (Below Reorder Threshold)
  await createStock(pSafetyHelmet.id, locRackA.id, 12.0); // Reorder is 25.0 -> LOW STOCK
  await createStock(pPackagingBoxes.id, locMainStore.id, 30.0); // Reorder is 100.0 -> LOW STOCK

  // Out of Stock Items (0.0 Quantity)
  await createStock(pMachineLubricant.id, locMainStore.id, 0.0); // OUT OF STOCK
  await createStock(pSafetyVest.id, locMainStore.id, 0.0); // OUT OF STOCK

  // -------------------------------------------------------------
  // 8. SEED DEMO OPERATIONS & AUDITABLE STOCK LEDGER ENTRIES
  // -------------------------------------------------------------
  console.log('📝 Seeding realistic operations (Receipts, Deliveries, Transfers, Adjustments)...');

  // --- DEMO OPERATION 1: Completed Receipt (WH/IN/0001) ---
  const receiptDone = await prisma.receipt.create({
    data: {
      referenceNo: 'WH/IN/0001',
      supplierId: suppApex.id,
      warehouseId: mainWh.id,
      status: DocumentStatus.DONE,
      scheduleDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      responsible: manager.name,
      notes: 'Initial bulk shipment of high-tensile steel rods',
      createdBy: manager.id,
      validatedBy: manager.id,
      lines: {
        create: [
          {
            productId: pSteelRods.id,
            locationId: locMainStore.id,
            quantity: 100.0,
          },
        ],
      },
    },
  });

  // Corresponding Ledger Entry for WH/IN/0001
  await prisma.stockLedger.create({
    data: {
      productId: pSteelRods.id,
      warehouseId: mainWh.id,
      locationId: locMainStore.id,
      operationType: OperationType.RECEIPT,
      quantity: 100.0,
      referenceType: 'RECEIPT',
      referenceId: receiptDone.referenceNo,
      balanceAfter: 250.0,
      createdBy: manager.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // --- DEMO OPERATION 2: Pending/Ready Receipt (WH/IN/0002) ---
  await prisma.receipt.create({
    data: {
      referenceNo: 'WH/IN/0002',
      supplierId: suppTimber.id,
      warehouseId: mainWh.id,
      status: DocumentStatus.READY,
      scheduleDate: new Date(), // Today
      responsible: staff.name,
      notes: 'Incoming delivery of oak panels awaiting dock inspection',
      createdBy: staff.id,
      lines: {
        create: [
          {
            productId: pWoodPanels.id,
            locationId: locMainStore.id,
            quantity: 50.0,
          },
        ],
      },
    },
  });

  // --- DEMO OPERATION 3: Draft Receipt (WH/IN/0003) ---
  await prisma.receipt.create({
    data: {
      referenceNo: 'WH/IN/0003',
      supplierId: suppSafeGuard.id,
      warehouseId: mainWh.id,
      status: DocumentStatus.DRAFT,
      scheduleDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // in 3 days
      responsible: manager.name,
      notes: 'Scheduled replenishment for low PPE gear',
      createdBy: manager.id,
      lines: {
        create: [
          {
            productId: pSafetyHelmet.id,
            locationId: locRackA.id,
            quantity: 100.0,
          },
        ],
      },
    },
  });

  // --- DEMO OPERATION 4: Completed Delivery Order (WH/OUT/0001) ---
  const deliveryDone = await prisma.delivery.create({
    data: {
      referenceNo: 'WH/OUT/0001',
      customerName: 'Azure Interior Solutions',
      deliveryAddress: 'Building 4B, Cyber Heights Tech Park, Bangalore',
      warehouseId: mainWh.id,
      status: DocumentStatus.DONE,
      scheduleDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
      responsible: staff.name,
      notes: 'Customer order #ORD-2026-891 picked and dispatched',
      createdBy: staff.id,
      validatedBy: manager.id,
      lines: {
        create: [
          {
            productId: pOfficeChair.id,
            locationId: locMainStore.id,
            quantity: 10.0,
          },
        ],
      },
    },
  });

  // Corresponding Ledger Entry for WH/OUT/0001
  await prisma.stockLedger.create({
    data: {
      productId: pOfficeChair.id,
      warehouseId: mainWh.id,
      locationId: locMainStore.id,
      operationType: OperationType.DELIVERY,
      quantity: -10.0,
      referenceType: 'DELIVERY',
      referenceId: deliveryDone.referenceNo,
      balanceAfter: 45.0,
      createdBy: manager.id,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // --- DEMO OPERATION 5: Waiting Delivery Order (WH/OUT/0002) (Out of Stock Alert Demo) ---
  await prisma.delivery.create({
    data: {
      referenceNo: 'WH/OUT/0002',
      customerName: 'Global Workspaces Corp',
      deliveryAddress: 'Suite 101, Prestige Towers, Outer Ring Road',
      warehouseId: mainWh.id,
      status: DocumentStatus.WAITING, // Waiting because stock is 0
      scheduleDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Late schedule date
      responsible: staff.name,
      notes: 'Blocked waiting on safety vests stock arrival',
      createdBy: staff.id,
      lines: {
        create: [
          {
            productId: pSafetyVest.id,
            locationId: locMainStore.id,
            quantity: 25.0,
          },
        ],
      },
    },
  });

  // --- DEMO OPERATION 6: Ready Delivery Order (WH/OUT/0003) ---
  await prisma.delivery.create({
    data: {
      referenceNo: 'WH/OUT/0003',
      customerName: 'Apex Logistics Corporate Offices',
      deliveryAddress: 'Logistics Park, Gateway Sector, Mumbai',
      warehouseId: mainWh.id,
      status: DocumentStatus.READY,
      scheduleDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
      responsible: staff.name,
      notes: 'Ready for loading on freight truck',
      createdBy: staff.id,
      lines: {
        create: [
          {
            productId: pExecutiveDesk.id,
            locationId: locMainStore.id,
            quantity: 5.0,
          },
        ],
      },
    },
  });

  // --- DEMO OPERATION 7: Completed Internal Transfer (WH/INT/0001) ---
  const transferDone = await prisma.internalTransfer.create({
    data: {
      referenceNo: 'WH/INT/0001',
      sourceWarehouseId: mainWh.id,
      destinationWarehouseId: mainWh.id,
      status: DocumentStatus.DONE,
      scheduleDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      responsible: staff.name,
      notes: 'Raw material dispatch from Main Store to Production Floor',
      createdBy: staff.id,
      validatedBy: staff.id,
      lines: {
        create: [
          {
            productId: pSteelRods.id,
            sourceLocationId: locMainStore.id,
            destinationLocationId: locProdFloor.id,
            quantity: 30.0,
          },
        ],
      },
    },
  });

  // Corresponding Transfer Ledger Entries (OUT from Main Store, IN to Production Floor)
  await prisma.stockLedger.create({
    data: {
      productId: pSteelRods.id,
      warehouseId: mainWh.id,
      locationId: locMainStore.id,
      operationType: OperationType.TRANSFER_OUT,
      quantity: -30.0,
      referenceType: 'INTERNAL_TRANSFER',
      referenceId: transferDone.referenceNo,
      balanceAfter: 250.0,
      createdBy: staff.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.stockLedger.create({
    data: {
      productId: pSteelRods.id,
      warehouseId: mainWh.id,
      locationId: locProdFloor.id,
      operationType: OperationType.TRANSFER_IN,
      quantity: 30.0,
      referenceType: 'INTERNAL_TRANSFER',
      referenceId: transferDone.referenceNo,
      balanceAfter: 30.0,
      createdBy: staff.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  // --- DEMO OPERATION 8: Ready Internal Transfer (WH/INT/0002) ---
  await prisma.internalTransfer.create({
    data: {
      referenceNo: 'WH/INT/0002',
      sourceWarehouseId: mainWh.id,
      destinationWarehouseId: secWh.id,
      status: DocumentStatus.READY,
      scheduleDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      responsible: manager.name,
      notes: 'Inter-warehouse stock balancing for office chairs',
      createdBy: manager.id,
      lines: {
        create: [
          {
            productId: pOfficeChair.id,
            sourceLocationId: locMainStore.id,
            destinationLocationId: locSecStore.id,
            quantity: 10.0,
          },
        ],
      },
    },
  });

  // --- DEMO OPERATION 9: Completed Stock Adjustment (WH/ADJ/0001) ---
  const adjustmentDone = await prisma.stockAdjustment.create({
    data: {
      referenceNo: 'WH/ADJ/0001',
      warehouseId: mainWh.id,
      locationId: locMainStore.id,
      status: DocumentStatus.DONE,
      reason: 'Physical count reconciliation: 3 kg damaged steel sheet scrapped',
      notes: 'Scrap report filed under QA-992',
      createdBy: manager.id,
      validatedBy: manager.id,
      lines: {
        create: [
          {
            productId: pSteelSheets.id,
            previousQuantity: 48.0,
            countedQuantity: 45.0,
            delta: -3.0,
          },
        ],
      },
    },
  });

  // Corresponding Adjustment Ledger Entry
  await prisma.stockLedger.create({
    data: {
      productId: pSteelSheets.id,
      warehouseId: mainWh.id,
      locationId: locMainStore.id,
      operationType: OperationType.ADJUSTMENT,
      quantity: -3.0,
      referenceType: 'ADJUSTMENT',
      referenceId: adjustmentDone.referenceNo,
      balanceAfter: 45.0,
      createdBy: manager.id,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  // -------------------------------------------------------------
  // 9. SEED NOTIFICATIONS (ALERTS & DEMO SNAPSHOTS)
  // -------------------------------------------------------------
  console.log('🔔 Seeding initial notifications & alerts...');
  await prisma.notification.createMany({
    data: [
      {
        userId: manager.id,
        type: NotificationType.LOW_STOCK,
        title: 'Low Stock Alert: Industrial Safety Helmet',
        message: 'Current stock is 12 pcs, below reorder threshold of 25 pcs.',
      },
      {
        userId: manager.id,
        type: NotificationType.LOW_STOCK,
        title: 'Low Stock Alert: Corrugated Packaging Boxes',
        message: 'Current stock is 30 boxes, below reorder threshold of 100 boxes.',
      },
      {
        userId: manager.id,
        type: NotificationType.OUT_OF_STOCK,
        title: 'Out of Stock Warning: Industrial Machine Lubricant',
        message: 'Available stock has reached 0 L across all locations.',
      },
      {
        userId: staff.id,
        type: NotificationType.OPERATION_PENDING,
        title: 'Delivery WH/OUT/0002 Waiting for Stock',
        message: 'Delivery order WH/OUT/0002 is blocked waiting for safety vests.',
      },
      {
        type: NotificationType.SYSTEM,
        title: 'Welcome to Inventra IMS',
        message: 'Inventra database initialized with live demo inventory state.',
      },
    ],
  });

  // -------------------------------------------------------------
  // 10. SUMMARY COUNT VERIFICATION
  // -------------------------------------------------------------
  const [
    userCount,
    whCount,
    locCount,
    catCount,
    uomCount,
    prodCount,
    suppCount,
    stockCount,
    receiptCount,
    deliveryCount,
    transferCount,
    adjCount,
    ledgerCount,
    notifCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.warehouse.count(),
    prisma.location.count(),
    prisma.category.count(),
    prisma.unitOfMeasure.count(),
    prisma.product.count(),
    prisma.supplier.count(),
    prisma.stockQuantity.count(),
    prisma.receipt.count(),
    prisma.delivery.count(),
    prisma.internalTransfer.count(),
    prisma.stockAdjustment.count(),
    prisma.stockLedger.count(),
    prisma.notification.count(),
  ]);

  console.log('\n======================================================');
  console.log('✅ SEEDING COMPLETE! SUMMARY OF RECORDS CREATED:');
  console.log('======================================================');
  console.log(`👤 Users:              ${userCount}`);
  console.log(`🏢 Warehouses:         ${whCount}`);
  console.log(`📍 Locations:          ${locCount}`);
  console.log(`📦 Categories:         ${catCount}`);
  console.log(`📏 Units of Measure:   ${uomCount}`);
  console.log(`🏷️ Products:           ${prodCount}`);
  console.log(`🏭 Suppliers:          ${suppCount}`);
  console.log(`📊 Stock Quantities:   ${stockCount}`);
  console.log(`📥 Receipts:           ${receiptCount}`);
  console.log(`📤 Deliveries:         ${deliveryCount}`);
  console.log(`🔄 Transfers:          ${transferCount}`);
  console.log(`⚖️ Adjustments:        ${adjCount}`);
  console.log(`📜 Stock Ledger Rows:  ${ledgerCount}`);
  console.log(`🔔 Notifications:      ${notifCount}`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
