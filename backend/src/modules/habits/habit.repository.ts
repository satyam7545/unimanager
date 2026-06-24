import { prisma } from '../../utils/prisma';
import { Habit, HabitLog } from '@prisma/client';

export class HabitRepository {
  async findAllByUserId(userId: string, startOfToday: Date, endOfToday: Date) {
    return prisma.habit.findMany({
      where: { userId },
      include: {
        logs: {
          where: {
            completedAt: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string): Promise<Habit | null> {
    return prisma.habit.findUnique({
      where: { id },
    });
  }

  async create(
    userId: string,
    data: {
      name: string;
      icon: string;
      frequency: string;
      target: number;
    }
  ): Promise<Habit> {
    return prisma.habit.create({
      data: {
        userId,
        name: data.name,
        icon: data.icon,
        frequency: data.frequency,
        target: data.target,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.habit.delete({
      where: { id },
    });
  }

  // --- Log Toggle Helpers ---

  async findLogToday(habitId: string, startOfToday: Date, endOfToday: Date): Promise<HabitLog | null> {
    return prisma.habitLog.findFirst({
      where: {
        habitId,
        completedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });
  }

  async createLog(habitId: string): Promise<HabitLog> {
    return prisma.habitLog.create({
      data: {
        habitId,
      },
    });
  }

  async deleteLog(id: string): Promise<void> {
    await prisma.habitLog.delete({
      where: { id },
    });
  }

  // Fetch all logs to calculate streaks
  async findAllLogs(habitId: string): Promise<HabitLog[]> {
    return prisma.habitLog.findMany({
      where: { habitId },
      orderBy: { completedAt: 'desc' },
    });
  }
}
