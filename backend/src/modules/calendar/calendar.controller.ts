import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { BadRequestError } from '../../utils/errors';

export class CalendarController {
  getEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const userId = req.user.userId;
      const { start, end } = req.query;

      if (!start || !end) {
        throw new BadRequestError('Start and end date queries are required.');
      }

      const startDate = new Date(String(start));
      const endDate = new Date(String(end));

      // Perform parallel DB lookups across Events, Assignments, and Tasks
      const [events, assignments, tasks] = await Promise.all([
        prisma.event.findMany({
          where: {
            userId,
            startAt: { gte: startDate },
            endAt: { lte: endDate }
          },
          include: { subject: { select: { name: true, color: true } } }
        }),
        prisma.assignment.findMany({
          where: {
            userId,
            deadline: { gte: startDate, lte: endDate }
          },
          include: { subject: { select: { name: true, color: true } } }
        }),
        prisma.task.findMany({
          where: {
            userId,
            date: { gte: startDate, lte: endDate }
          },
          include: { project: { select: { name: true } } }
        })
      ]);

      // Map to Unified Calendar Event Schema
      const unifiedEvents = [
        ...events.map(ev => ({
          id: ev.id,
          title: ev.title,
          description: ev.description,
          type: 'EVENT',
          start: ev.startAt,
          end: ev.endAt,
          color: ev.color,
          isAllDay: ev.isAllDay,
          subjectName: ev.subject?.name,
          subjectColor: ev.subject?.color
        })),
        ...assignments.map(as => ({
          id: as.id,
          title: `📝 Assignment: ${as.title}`,
          description: as.description,
          type: 'ASSIGNMENT',
          start: as.deadline,
          end: as.deadline,
          color: as.subject?.color || '#EF4444', // default red for assignment
          isAllDay: true,
          status: as.status,
          priority: as.priority,
          subjectName: as.subject?.name,
          subjectColor: as.subject?.color
        })),
        ...tasks.map(tk => ({
          id: tk.id,
          title: `✓ Task: ${tk.title}`,
          description: null,
          type: 'TASK',
          start: tk.date!,
          end: tk.date!,
          color: '#8B5CF6', // default violet for tasks
          isAllDay: true,
          status: tk.status,
          priority: tk.priority,
          subjectName: tk.project?.name,
          subjectColor: '#8B5CF6'
        }))
      ];

      res.status(200).json({
        status: 'success',
        results: unifiedEvents.length,
        data: { events: unifiedEvents }
      });
    } catch (error) {
      next(error);
    }
  };
}
