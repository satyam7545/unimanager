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

    if (upcomingAssignments.length > 0) {
      const assignmentTitles = upcomingAssignments.map((a) => `Assignment Reminder: ${a.title}`);
      const existingAssignmentNotifs = await this.repository.findNotificationsByTitles(userId, assignmentTitles);
      const existingAssignmentTitles = new Set(existingAssignmentNotifs.map((n) => n.title));

      const newAssignmentNotifs = [];
      for (const assignment of upcomingAssignments) {
        const title = `Assignment Reminder: ${assignment.title}`;
        if (!existingAssignmentTitles.has(title)) {
          const deadlineStr = new Date(assignment.deadline).toLocaleString();
          newAssignmentNotifs.push({
            userId,
            title,
            message: `The assignment "${assignment.title}" is due in less than 24 hours! Deadline: ${deadlineStr}. Make sure to complete and submit it.`,
            isRead: false,
          });
          existingAssignmentTitles.add(title);
        }
      }

      if (newAssignmentNotifs.length > 0) {
        await this.repository.createManyNotifications(newAssignmentNotifs);
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

    if (upcomingExams.length > 0) {
      const examTitles = upcomingExams.map((e) => `Exam Reminder: ${e.title}`);
      const existingExamNotifs = await this.repository.findNotificationsByTitles(userId, examTitles);
      const existingExamTitles = new Set(existingExamNotifs.map((n) => n.title));

      const newExamNotifs = [];
      for (const exam of upcomingExams) {
        const title = `Exam Reminder: ${exam.title}`;
        if (!existingExamTitles.has(title)) {
          const timeStr = new Date(exam.startAt).toLocaleString();
          newExamNotifs.push({
            userId,
            title,
            message: `Your exam "${exam.title}" is starting in less than 48 hours! Date/Time: ${timeStr}. Review your notes and prepare.`,
            isRead: false,
          });
          existingExamTitles.add(title);
        }
      }

      if (newExamNotifs.length > 0) {
        await this.repository.createManyNotifications(newExamNotifs);
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

    const incompleteHabits = dailyHabits.filter(habit => habit.logs.length < habit.target);

    if (incompleteHabits.length > 0) {
      const habitTitles = incompleteHabits.map((h) => `Habit Reminder: ${h.name}`);
      const existingHabitNotifs = await this.repository.findNotificationsByTitles(userId, habitTitles, startOfToday);
      const existingHabitTitles = new Set(existingHabitNotifs.map((n) => n.title));

      const newHabitNotifs = [];
      for (const habit of incompleteHabits) {
        const title = `Habit Reminder: ${habit.name}`;
        if (!existingHabitTitles.has(title)) {
          newHabitNotifs.push({
            userId,
            title,
            message: `Remember to log your daily target for "${habit.name}" today to protect your streak!`,
            isRead: false,
          });
          existingHabitTitles.add(title);
        }
      }

      if (newHabitNotifs.length > 0) {
        await this.repository.createManyNotifications(newHabitNotifs);
      }
    }
  }
}
