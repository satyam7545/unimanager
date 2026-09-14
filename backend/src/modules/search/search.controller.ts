import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { BadRequestError } from '../../utils/errors';

export class SearchController {
  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const userId = req.user.userId;
      const query = (req.query.q as string || '').trim();

      if (!query) {
        res.status(200).json({
          status: 'success',
          data: {
            notes: [],
            tasks: [],
            assignments: [],
            projects: [],
            subjects: [],
            events: [],
          }
        });
        return;
      }

      // Query database in parallel for ultra-fast responsiveness
      const [notes, tasks, assignments, projects, subjects, events] = await Promise.all([
        prisma.note.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: query } },
              { content: { contains: query } }
            ]
          },
          take: 6,
          select: {
            id: true,
            title: true,
            subject: { select: { id: true, name: true, color: true } },
            folder: { select: { id: true, name: true } },
            updatedAt: true,
          }
        }),
        prisma.task.findMany({
          where: {
            userId,
            title: { contains: query }
          },
          take: 6,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            date: true,
            subject: { select: { id: true, name: true, color: true } },
            assignment: { select: { id: true, title: true } }
          }
        }),
        prisma.assignment.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: query } },
              { description: { contains: query } }
            ]
          },
          take: 6,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            deadline: true,
            subject: { select: { id: true, name: true, color: true } }
          }
        }),
        prisma.project.findMany({
          where: {
            userId,
            OR: [
              { name: { contains: query } },
              { description: { contains: query } }
            ]
          },
          take: 5,
          select: { id: true, name: true, progress: true }
        }),
        prisma.subject.findMany({
          where: {
            userId,
            name: { contains: query }
          },
          take: 5,
          select: { id: true, name: true, color: true, semester: true }
        }),
        prisma.event.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: query } },
              { description: { contains: query } }
            ]
          },
          take: 6,
          select: {
            id: true,
            title: true,
            eventType: true,
            startAt: true,
            endAt: true,
            color: true,
            subject: { select: { id: true, name: true, color: true } }
          }
        })
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          notes,
          tasks,
          assignments,
          projects,
          subjects,
          events,
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
