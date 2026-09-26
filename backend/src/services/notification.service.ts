import { prisma, NotificationType } from '../config/db';

export class NotificationService {
  /**
   * Get notifications for a user or broadcast system alerts
   */
  static async getNotifications(userId?: string) {
    const where: any = userId
      ? { OR: [{ userId }, { userId: null }] }
      : {};

    const [unreadCount, notifications] = await Promise.all([
      prisma.notification.count({
        where: { ...where, readAt: null },
      }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    return {
      unreadCount,
      notifications,
    };
  }

  /**
   * Mark single notification as read
   */
  static async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId?: string) {
    const where: any = userId
      ? { OR: [{ userId }, { userId: null }], readAt: null }
      : { readAt: null };

    return prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    });
  }

  /**
   * Create notification idempotently
   */
  static async createNotification(data: {
    userId?: string;
    type: NotificationType;
    title: string;
    message: string;
  }) {
    // Avoid creating duplicate unread notifications with same title in last 24h
    const existing = await prisma.notification.findFirst({
      where: {
        title: data.title,
        readAt: null,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.notification.create({
      data: {
        userId: data.userId || null,
        type: data.type,
        title: data.title,
        message: data.message,
      },
    });
  }
}
