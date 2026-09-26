import { prisma, Role } from '../config/db';
import { hashPassword } from '../utils/auth';

export class UserService {
  /**
   * Get all users with optional filtering
   */
  static async getAll(search?: string, role?: Role) {
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { loginId: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        loginId: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdReceipts: true,
            createdDeliveries: true,
            createdTransfers: true,
            createdAdjustments: true,
            ledgerEntries: true,
          },
        },
      },
    });

    return users;
  }

  /**
   * Get single user by ID
   */
  static async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        loginId: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdReceipts: true,
            createdDeliveries: true,
            createdTransfers: true,
            createdAdjustments: true,
            ledgerEntries: true,
          },
        },
      },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    return user;
  }

  /**
   * Create a new user (Admin provisioned)
   */
  static async create(data: {
    name: string;
    loginId: string;
    email: string;
    password: string;
    role?: Role;
  }) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedLoginId = data.loginId.trim();

    if (normalizedLoginId.length < 4 || normalizedLoginId.length > 20) {
      throw { statusCode: 400, message: 'Login ID must be between 4 and 20 characters.' };
    }

    if (data.password.length < 6) {
      throw { statusCode: 400, message: 'Password must be at least 6 characters long.' };
    }

    // Check duplicates
    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw { statusCode: 409, message: 'A user with this email address already exists.' };
    }

    const existingLoginId = await prisma.user.findUnique({
      where: { loginId: normalizedLoginId },
    });
    if (existingLoginId) {
      throw { statusCode: 409, message: 'This Login ID is already taken. Please choose another.' };
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        loginId: normalizedLoginId,
        email: normalizedEmail,
        passwordHash,
        role: data.role || Role.WAREHOUSE_STAFF,
      },
      select: {
        id: true,
        name: true,
        loginId: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Update user information & role
   */
  static async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      role?: Role;
      password?: string;
    }
  ) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const updateData: any = {};

    if (data.name) {
      updateData.name = data.name.trim();
    }

    if (data.email) {
      const normalizedEmail = data.email.trim().toLowerCase();
      if (normalizedEmail !== existing.email) {
        const duplicate = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (duplicate) {
          throw { statusCode: 409, message: 'A user with this email address already exists.' };
        }
        updateData.email = normalizedEmail;
      }
    }

    if (data.role) {
      updateData.role = data.role;
    }

    if (data.password && data.password.trim().length > 0) {
      if (data.password.length < 6) {
        throw { statusCode: 400, message: 'New password must be at least 6 characters long.' };
      }
      updateData.passwordHash = await hashPassword(data.password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        loginId: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Delete a user (cannot delete own account)
   */
  static async delete(id: string, requesterUserId?: string) {
    if (requesterUserId && requesterUserId === id) {
      throw { statusCode: 400, message: 'You cannot delete your own admin account.' };
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    await prisma.user.delete({
      where: { id },
    });

    return { success: true, message: 'User deleted successfully' };
  }
}
