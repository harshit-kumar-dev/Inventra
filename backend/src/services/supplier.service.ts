import { prisma } from '../config/db';

export class SupplierService {
  static async getAll() {
    return prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { receipts: true },
        },
      },
    });
  }

  static async getById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        receipts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            referenceNo: true,
            status: true,
            scheduleDate: true,
            createdAt: true,
          },
        },
      },
    });

    if (!supplier) {
      throw { statusCode: 404, message: 'Supplier not found.' };
    }

    return supplier;
  }

  static async create(data: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    const existing = await prisma.supplier.findUnique({
      where: { name: data.name.trim() },
    });
    if (existing) {
      throw { statusCode: 409, message: 'Supplier with this name already exists.' };
    }

    return prisma.supplier.create({
      data: {
        name: data.name.trim(),
        contactName: data.contactName?.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim(),
        address: data.address?.trim(),
      },
    });
  }

  static async update(
    id: string,
    data: {
      name?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
    }
  ) {
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw { statusCode: 404, message: 'Supplier not found.' };
    }

    if (data.name && data.name.trim() !== supplier.name) {
      const existing = await prisma.supplier.findUnique({
        where: { name: data.name.trim() },
      });
      if (existing) {
        throw { statusCode: 409, message: 'Supplier with this name already exists.' };
      }
    }

    return prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.contactName !== undefined && { contactName: data.contactName.trim() }),
        ...(data.email !== undefined && { email: data.email.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone.trim() }),
        ...(data.address !== undefined && { address: data.address.trim() }),
      },
    });
  }
}
