import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { BadRequestError } from '../../utils/errors';

export class DashboardController {
  getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const userId = req.user.userId;

      // Define date boundaries for "today"
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // Define boundaries for "this week" (past 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Define boundaries for "last week" (7 to 14 days ago)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      // Generate day queries for past 7 days to run in parallel
      const dayQueries = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        return prisma.task.count({
          where: {
            userId,
            status: { in: ['DONE', 'COMPLETED'] },
            updatedAt: { gte: d, lt: nextDay }
          }
        });
      });

      // Perform parallel querying for optimal responsiveness
      const [
        user,
        todaysTasks,
        upcomingAssignments,
        upcomingEvents,
        recentProjects,
        taskStats,
        habitStats,
        lastWeekCompletedCount,
        ...dayCompletedCounts
      ] = await Promise.all([
        // 1. User details for study streaks
        prisma.user.findUnique({
          where: { id: userId },
          select: { studyStreak: true, name: true }
        }),
        // 2. Tasks scheduled for today
        prisma.task.findMany({
          where: {
            userId,
            status: { not: 'DONE' },
            OR: [
              { date: { gte: startOfToday, lte: endOfToday } },
              { status: 'IN_PROGRESS' }
            ]
          },
          include: {
            project: { select: { id: true, name: true } },
            assignment: { select: { id: true, title: true } }
          },
          orderBy: { priority: 'desc' }
        }),
        // 3. Upcoming assignments (deadlines)
        prisma.assignment.findMany({
          where: {
            userId,
            status: { not: 'COMPLETED' },
            deadline: { gte: new Date() }
          },
          include: {
            subject: { select: { id: true, name: true, color: true } }
          },
          orderBy: { deadline: 'asc' },
          take: 5
        }),
        // 4. Upcoming events (exams / study sessions)
        prisma.event.findMany({
          where: {
            userId,
            startAt: { gte: new Date() }
          },
          include: {
            subject: { select: { id: true, name: true, color: true } }
          },
          orderBy: { startAt: 'asc' },
          take: 5
        }),
        // 5. Recent projects
        prisma.project.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: 3
        }),
        // 6. Task counts for productivity calculations (past 7 days)
        prisma.task.groupBy({
          by: ['status'],
          where: {
            userId,
            updatedAt: { gte: sevenDaysAgo }
          },
          _count: { _all: true }
        }),
        // 7. Habit streaks / count
        prisma.habit.findMany({
          where: { userId },
          include: {
            logs: {
              where: { completedAt: { gte: sevenDaysAgo } }
            }
          }
        }),
        // 8. Count of completed tasks in the previous week (7 to 14 days ago)
        prisma.task.count({
          where: {
            userId,
            status: { in: ['DONE', 'COMPLETED'] },
            updatedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }
          }
        }),
        // 9. Day completed counts (past 7 days)
        ...dayQueries
      ]);

      // Calculate Productivity Score based on completed tasks vs total tasks
      let completedCount = 0;
      let totalCount = 0;
      
      taskStats.forEach((group) => {
        const count = group._count._all;
        totalCount += count;
        if (group.status === 'DONE' || group.status === 'COMPLETED') {
          completedCount += count;
        }
      });

      const productivityScore = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

      // Calculate Weekly Study Hours: count of completed tasks * 1.5h
      const taskStudyHrs = completedCount * 1.5;
      const weeklyStudyHours = Number(taskStudyHrs.toFixed(1)) || 0.0;

      // Calculate daily study hours for the past 7 days using the query results
      const dailyStudyHours = dayCompletedCounts.map((count, index) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - index));
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        return {
          day: dayName,
          hrs: Number((count * 1.5).toFixed(1))
        };
      });

      // Calculate week-over-week trend percentage
      let studyHoursTrend = 0;
      const thisWeekCompleted = completedCount;
      const lastWeekCompleted = lastWeekCompletedCount;
      if (lastWeekCompleted > 0) {
        studyHoursTrend = Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100);
      } else if (thisWeekCompleted > 0) {
        studyHoursTrend = 100;
      }

      res.status(200).json({
        status: 'success',
        data: {
          name: user?.name || 'Student',
          studyStreak: user?.studyStreak || 0,
          todaysTasks,
          upcomingAssignments,
          upcomingEvents,
          recentProjects,
          weeklyStudyHours,
          productivityScore,
          studyHoursTrend,
          dailyStudyHours,
          habitStats: habitStats.map(h => ({
            id: h.id,
            name: h.name,
            icon: h.icon,
            completions: h.logs.length,
            target: h.target
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
