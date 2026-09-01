import { prisma } from '../../utils/prisma';

export class NotificationRepository {
  async listNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async deleteNotification(id: string, userId: string) {
    return prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  async createNotification(userId: string, title: string, message: string) {
    return prisma.notification.create({
      data: {
        userId,
        title,
        message,
        isRead: false,
      },
    });
  }

  async createManyNotifications(data: {userId: string, title: string, message: string, isRead: boolean}[]) {
      return prisma.notification.createMany({ data });
  }

  async findNotificationByTitle(userId: string, title: string) {
    return prisma.notification.findFirst({
      where: {
        userId,
        title,
      },
    });
  }

  async findNotificationsByTitles(userId: string, titles: string[], minCreatedAt?: Date) {
      const whereClause: any = {
          userId,
          title: { in: titles },
      };
      if (minCreatedAt) {
          whereClause.createdAt = { gte: minCreatedAt };
      }
      return prisma.notification.findMany({
          where: whereClause,
          select: { title: true },
      });
  }
}
