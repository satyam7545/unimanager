import { NotificationRepository } from './notification.repository';
import { prisma } from '../../utils/prisma';

export class NotificationService {
  private repository = new NotificationRepository();

  async listNotifications(userId: string) {
    // Proactively scan and generate reminders before returning notifications list
    await this.generateReminders(userId);
    return this.repository.listNotifications(userId);
  }

  async markAsRead(id: string, userId: string) {
    return this.repository.markAsRead(id, userId);
  }

  async markAllAsRead(userId: string) {
    return this.repository.markAllAsRead(userId);
  }

  async deleteNotification(id: string, userId: string) {
    return this.repository.deleteNotification(id, userId);
  }

  // Reminder Checker Logic
  async generateReminders(userId: string): Promise<void> {
    const now = new Date();
    
    // 1. Assignment Reminders (due in next 24 hours)
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        userId,
        status: { not: 'COMPLETED' },
        deadline: {
          gt: now,
          lte: tomorrow,
        },
      },
    });

    for (const assignment of upcomingAssignments) {
      const title = `Assignment Reminder: ${assignment.title}`;
      const existing = await this.repository.findNotificationByTitle(userId, title);
      if (!existing) {
        const deadlineStr = new Date(assignment.deadline).toLocaleString();
        await this.repository.createNotification(
          userId,
          title,
          `The assignment "${assignment.title}" is due in less than 24 hours! Deadline: ${deadlineStr}. Make sure to complete and submit it.`
        );
      }
    }

    // 2. Exam Reminders (events containing "exam" in title in the next 48 hours)
    const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const upcomingEvents = await prisma.event.findMany({
      where: {
        userId,
        startAt: {
          gt: now,
          lte: inTwoDays,
        },
      },
    });

    const upcomingExams = upcomingEvents.filter((exam) =>
      exam.title.toLowerCase().includes('exam')
    );

    for (const exam of upcomingExams) {
      const title = `Exam Reminder: ${exam.title}`;
      const existing = await this.repository.findNotificationByTitle(userId, title);
      if (!existing) {
        const timeStr = new Date(exam.startAt).toLocaleString();
        await this.repository.createNotification(
          userId,
          title,
          `Your exam "${exam.title}" is starting in less than 48 hours! Date/Time: ${timeStr}. Review your notes and prepare.`
        );
      }
    }

    // 3. Habit Reminders (unlogged daily habits)
    // Check if daily habits are uncompleted today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const dailyHabits = await prisma.habit.findMany({
      where: {
        userId,
        frequency: 'DAILY',
      },
      include: {
        logs: {
          where: {
            completedAt: {
              gte: startOfToday,
            },
          },
        },
      },
    });

    for (const habit of dailyHabits) {
      const isCompletedToday = habit.logs.length >= habit.target;
      if (!isCompletedToday) {
        const title = `Habit Reminder: ${habit.name}`;
        // Verify if a notification was already sent today for this habit
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            title,
            createdAt: {
              gte: startOfToday,
            },
          },
        });

        if (!existing) {
          await this.repository.createNotification(
            userId,
            title,
            `Remember to log your daily target for "${habit.name}" today to protect your streak!`
          );
        }
      }
    }
  }
}
