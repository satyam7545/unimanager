import { HabitRepository } from './habit.repository';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { Habit } from '@prisma/client';

export class HabitService {
  private repository = new HabitRepository();

  async getAllHabits(userId: string) {
    const { startOfToday, endOfToday } = this.getTodayBounds();
    const habits = await this.repository.findAllByUserId(userId, startOfToday, endOfToday);

    const habitsWithStreaks = await Promise.all(
      habits.map(async (habit) => {
        const logs = await this.repository.findAllLogs(habit.id);
        const streak = this.calculateStreak(logs);
        return {
          ...habit,
          isCompletedToday: habit.logs.length > 0,
          streak,
        };
      })
    );

    return habitsWithStreaks;
  }

  async createHabit(
    userId: string,
    data: {
      name: string;
      icon?: string;
      frequency?: string;
      target?: number;
    }
  ): Promise<Habit> {
    return this.repository.create(userId, {
      name: data.name,
      icon: data.icon || 'Flame',
      frequency: data.frequency || 'DAILY',
      target: data.target || 1,
    });
  }

  async toggleHabit(id: string, userId: string): Promise<{ isCompleted: boolean; streak: number }> {
    const habit = await this.repository.findById(id);
    if (!habit) {
      throw new NotFoundError('Habit not found.');
    }
    if (habit.userId !== userId) {
      throw new ForbiddenError('Access to this habit is denied.');
    }

    const { startOfToday, endOfToday } = this.getTodayBounds();
    const existingLog = await this.repository.findLogToday(id, startOfToday, endOfToday);

    if (existingLog) {
      // Toggle off: Delete log
      await this.repository.deleteLog(existingLog.id);
    } else {
      // Toggle on: Create log
      await this.repository.createLog(id);
      // Increment overall user study streak if it's a study habit
      await this.incrementUserStreak(userId);
    }

    // Recalculate streak
    const logs = await this.repository.findAllLogs(id);
    const streak = this.calculateStreak(logs);

    return {
      isCompleted: !existingLog,
      streak,
    };
  }

  async deleteHabit(id: string, userId: string): Promise<void> {
    const habit = await this.repository.findById(id);
    if (!habit) {
      throw new NotFoundError('Habit not found.');
    }
    if (habit.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this habit.');
    }
    await this.repository.delete(id);
  }

  // --- Helpers ---

  private getTodayBounds() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return { startOfToday, endOfToday };
  }

  private calculateStreak(logs: any[]): number {
    if (logs.length === 0) return 0;

    const loggedDates = new Set(
      logs.map((log) => new Date(log.completedAt).toISOString().slice(0, 10))
    );

    let streak = 0;
    const current = new Date();
    current.setHours(0, 0, 0, 0);

    const todayStr = current.toISOString().slice(0, 10);
    current.setDate(current.getDate() - 1);
    const yesterdayStr = current.toISOString().slice(0, 10);

    // If today is logged, start counting from today.
    // If not, but yesterday is logged, start counting from yesterday.
    // Otherwise, streak is broken (0).
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    if (loggedDates.has(todayStr)) {
      // Today is logged
    } else if (loggedDates.has(yesterdayStr)) {
      // Yesterday is logged, but not today (yet)
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      return 0; // broken
    }

    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (loggedDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1); // move back 1 day
      } else {
        break; // streak broke
      }
    }

    return streak;
  }

  private async incrementUserStreak(userId: string) {
    try {
      const user = await globalThis.prisma?.user.findUnique({ where: { id: userId } });
      if (!user) return;

      const lastActive = new Date(user.lastActiveAt);
      const today = new Date();
      
      const isYesterday = 
        lastActive.getDate() === today.getDate() - 1 &&
        lastActive.getMonth() === today.getMonth() &&
        lastActive.getFullYear() === today.getFullYear();
      
      const isToday = 
        lastActive.getDate() === today.getDate() &&
        lastActive.getMonth() === today.getMonth() &&
        lastActive.getFullYear() === today.getFullYear();

      let nextStreak = user.studyStreak;
      if (user.studyStreak === 0 || isYesterday) {
        nextStreak += 1;
      } else if (!isToday && !isYesterday) {
        nextStreak = 1; // broken user streak resets
      }

      await globalThis.prisma?.user.update({
        where: { id: userId },
        data: {
          studyStreak: nextStreak,
          lastActiveAt: new Date(),
        },
      });
    } catch (e) {
      // silent fail
    }
  }
}
