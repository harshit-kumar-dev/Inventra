import { prisma } from '../config/db';

export class CategoryService {
  static async getAll() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  static async create(data: { name: string; description?: string }) {
    const existing = await prisma.category.findUnique({
      where: { name: data.name.trim() },
    });
    if (existing) {
      throw { statusCode: 409, message: 'Category with this name already exists.' };
    }

    return prisma.category.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim(),
      },
    });
  }

  static async update(id: string, data: { name?: string; description?: string }) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw { statusCode: 404, message: 'Category not found.' };
    }

    if (data.name && data.name.trim() !== category.name) {
      const existing = await prisma.category.findUnique({
        where: { name: data.name.trim() },
      });
      if (existing) {
        throw { statusCode: 409, message: 'Category with this name already exists.' };
      }
    }

    return prisma.category.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description.trim() }),
      },
    });
  }
}
