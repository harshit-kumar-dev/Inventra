import { prisma } from '../config/db';

export class ProductService {
  /**
   * List/Search products with location-stock aggregation and pagination
   */
  static async getProducts(query: {
    search?: string;
    categoryId?: string;
    active?: 'true' | 'false' | 'all';
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.active === 'true') {
      where.active = true;
    } else if (query.active === 'false') {
      where.active = false;
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true } },
          uom: { select: { id: true, name: true, symbol: true } },
          stockQuantities: {
            include: {
              location: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  warehouse: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    // Format products with aggregated stock counts and low-stock / out-of-stock indicators
    const formattedProducts = products.map((p) => {
      const totalStock = p.stockQuantities.reduce((acc, sq) => acc + sq.quantity, 0);

      let stockStatus: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'NORMAL';
      if (totalStock <= 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (totalStock <= p.reorderLevel) {
        stockStatus = 'LOW_STOCK';
      }

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        perUnitCost: p.perUnitCost,
        reorderLevel: p.reorderLevel,
        active: p.active,
        category: p.category,
        uom: p.uom,
        totalStock,
        stockStatus,
        stockByLocation: p.stockQuantities.map((sq) => ({
          locationId: sq.location.id,
          locationName: sq.location.name,
          locationCode: sq.location.code,
          warehouseName: sq.location.warehouse.name,
          warehouseCode: sq.location.warehouse.code,
          quantity: sq.quantity,
        })),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return {
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single product with detailed stock by location and recent ledger movements
   */
  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        uom: true,
        stockQuantities: {
          include: {
            location: {
              include: { warehouse: true },
            },
          },
        },
        ledgerEntries: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            location: { select: { id: true, name: true, code: true } },
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!product) {
      throw { statusCode: 404, message: 'Product not found.' };
    }

    const totalStock = product.stockQuantities.reduce((acc, sq) => acc + sq.quantity, 0);

    let stockStatus: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'NORMAL';
    if (totalStock <= 0) {
      stockStatus = 'OUT_OF_STOCK';
    } else if (totalStock <= product.reorderLevel) {
      stockStatus = 'LOW_STOCK';
    }

    return {
      ...product,
      totalStock,
      stockStatus,
    };
  }

  /**
   * Create product
   */
  static async createProduct(data: {
    name: string;
    sku: string;
    description?: string;
    perUnitCost?: number;
    categoryId: string;
    uomId: string;
    reorderLevel?: number;
    active?: boolean;
  }) {
    const normalizedSku = data.sku.trim().toUpperCase();

    // Check SKU uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku: normalizedSku },
    });
    if (existingSku) {
      throw { statusCode: 409, message: `Product with SKU '${normalizedSku}' already exists.` };
    }

    // Verify Category exists
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw { statusCode: 400, message: 'Specified Category does not exist.' };
    }

    // Verify Unit of Measure exists
    const uom = await prisma.unitOfMeasure.findUnique({ where: { id: data.uomId } });
    if (!uom) {
      throw { statusCode: 400, message: 'Specified Unit of Measure does not exist.' };
    }

    return prisma.product.create({
      data: {
        name: data.name.trim(),
        sku: normalizedSku,
        description: data.description?.trim(),
        perUnitCost: data.perUnitCost || 0.0,
        categoryId: data.categoryId,
        uomId: data.uomId,
        reorderLevel: data.reorderLevel !== undefined ? data.reorderLevel : 10.0,
        active: data.active !== undefined ? data.active : true,
      },
      include: {
        category: true,
        uom: true,
      },
    });
  }

  /**
   * Update product
   */
  static async updateProduct(
    id: string,
    data: {
      name?: string;
      sku?: string;
      description?: string;
      perUnitCost?: number;
      categoryId?: string;
      uomId?: string;
      reorderLevel?: number;
      active?: boolean;
    }
  ) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw { statusCode: 404, message: 'Product not found.' };
    }

    if (data.sku) {
      const normalizedSku = data.sku.trim().toUpperCase();
      if (normalizedSku !== product.sku) {
        const existing = await prisma.product.findUnique({
          where: { sku: normalizedSku },
        });
        if (existing) {
          throw { statusCode: 409, message: `Product with SKU '${normalizedSku}' already exists.` };
        }
      }
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw { statusCode: 400, message: 'Category not found.' };
    }

    if (data.uomId) {
      const uom = await prisma.unitOfMeasure.findUnique({ where: { id: data.uomId } });
      if (!uom) throw { statusCode: 400, message: 'Unit of Measure not found.' };
    }

    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.sku && { sku: data.sku.trim().toUpperCase() }),
        ...(data.description !== undefined && { description: data.description?.trim() }),
        ...(data.perUnitCost !== undefined && { perUnitCost: data.perUnitCost }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.uomId && { uomId: data.uomId }),
        ...(data.reorderLevel !== undefined && { reorderLevel: data.reorderLevel }),
        ...(data.active !== undefined && { active: data.active }),
      },
      include: {
        category: true,
        uom: true,
      },
    });
  }

  /**
   * Toggle active status
   */
  static async toggleProductStatus(id: string, active: boolean) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw { statusCode: 404, message: 'Product not found.' };
    }

    return prisma.product.update({
      where: { id },
      data: { active },
      include: { category: true, uom: true },
    });
  }
}
