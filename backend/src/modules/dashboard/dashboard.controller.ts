import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { BadRequestError } from '../../utils/errors';
import { intelligenceService } from './intelligence.service';

export class DashboardController {
  getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const userId = req.user.userId;
      const { semester } = req.query;

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
        allActiveTasks,
        allActiveAssignments,
        allSubjects,
        upcomingEvents,
        todaysClasses,
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
        // 2. All active tasks with subject/assignment relationships
        prisma.task.findMany({
          where: {
            userId,
            status: { not: 'DONE' }
          },
          include: {
            subject: { select: { id: true, name: true, color: true } },
            assignment: { select: { id: true, title: true, deadline: true, subjectId: true } },
            project: { select: { id: true, name: true } }
          },
          orderBy: { updatedAt: 'desc' }
        }),
        // 3. All active assignments
        prisma.assignment.findMany({
          where: {
            userId,
            status: { not: 'COMPLETED' },
            ...(semester && {
              OR: [
                { semester: String(semester) },
                { subject: { semester: String(semester) } }
              ]
            })
          },
          include: {
            subject: { select: { id: true, name: true, color: true } }
          },
          orderBy: { deadline: 'asc' }
        }),
        // 4. Subjects with their assignments, tasks, and events for health analysis
        prisma.subject.findMany({
          where: {
            userId,
            ...(semester && { semester: String(semester) })
          },
          include: {
            assignments: true,
            tasks: true,
            events: true,
          }
        }),
        // 5. Upcoming events (exams, classes, etc.)
        prisma.event.findMany({
          where: {
            userId,
            startAt: { gte: startOfToday }
          },
          include: {
            subject: { select: { id: true, name: true, color: true } }
          },
          orderBy: { startAt: 'asc' },
          take: 15
        }),
        // 6. Today's events/classes specifically
        prisma.event.findMany({
          where: {
            userId,
            startAt: { gte: startOfToday, lte: endOfToday }
          },
          include: {
            subject: { select: { id: true, name: true, color: true } }
          },
          orderBy: { startAt: 'asc' }
        }),
        // 7. Recent projects
        prisma.project.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: 3
        }),
        // 8. Task counts for productivity calculations (past 7 days)
        prisma.task.groupBy({
          by: ['status'],
          where: {
            userId,
            updatedAt: { gte: sevenDaysAgo }
          },
          _count: { _all: true }
        }),
        // 9. Habit streaks / count
        prisma.habit.findMany({
          where: { userId },
          include: {
            logs: {
              where: { completedAt: { gte: sevenDaysAgo } }
            }
          }
        }),
        // 10. Count of completed tasks in previous week
        prisma.task.count({
          where: {
            userId,
            status: { in: ['DONE', 'COMPLETED'] },
            updatedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }
          }
        }),
        // 11. Day completed counts (past 7 days)
        ...dayQueries
      ]);

      // Filter upcoming exams
      const upcomingExams = upcomingEvents.filter(e => intelligenceService.isExamEvent(e));

      // Calculate priority algorithms
      const prioritizedTasks = intelligenceService.prioritizeTasks(allActiveTasks, upcomingExams);
      const prioritizedAssignments = intelligenceService.prioritizeAssignments(allActiveAssignments, upcomingExams);

      // What should I work on right now? recommendation
      const whatToWorkOnNow = intelligenceService.getWhatToWorkOnNow(
        prioritizedTasks,
        prioritizedAssignments,
        upcomingExams
      );

      // Semester Health
      const semesterHealth = intelligenceService.getSemesterHealth(allSubjects);

      // Workload vs Capacity Analysis
      const workloadMetrics = intelligenceService.getWorkloadAnalysis(
        allActiveTasks,
        allActiveAssignments,
        upcomingEvents
      );

      // Overdue Recovery List
      const overdueItems = intelligenceService.getOverdueRecovery(
        allActiveTasks,
        allActiveAssignments
      );

      // Tasks scheduled for today specifically (or in-progress)
      const todaysTasks = prioritizedTasks.filter(t => {
        if (t.status === 'IN_PROGRESS') return true;
        if (t.date) {
          const tDate = new Date(t.date);
          return tDate >= startOfToday && tDate <= endOfToday;
        }
        return false;
      });

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

      // Calculate Weekly Study Hours: actual completed task minutes or fallback
      const taskStudyHrs = completedCount * 1.5;
      const weeklyStudyHours = Number(taskStudyHrs.toFixed(1)) || 0.0;

      // Calculate daily study hours for the past 7 days using query results
      const dailyStudyHours = dayCompletedCounts.map((count, index) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - index));
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        return {
          day: dayName,
          hrs: Number((count * 1.5).toFixed(1))
        };
      });

      // Week-over-week trend
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
          prioritizedTasks: prioritizedTasks.slice(0, 10),
          allActiveTasksCount: allActiveTasks.length,
          upcomingAssignments: prioritizedAssignments.slice(0, 5),
          allActiveAssignmentsCount: allActiveAssignments.length,
          upcomingEvents: upcomingEvents.slice(0, 5),
          todaysClasses,
          upcomingExams: upcomingExams.map(ex => {
            const daysAway = Math.max(0, Math.ceil((new Date(ex.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            return {
              id: ex.id,
              title: ex.title,
              date: ex.startAt,
              daysAway,
              subject: ex.subject
            };
          }),
          whatToWorkOnNow,
          semesterHealth,
          workloadMetrics,
          overdueItems,
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
