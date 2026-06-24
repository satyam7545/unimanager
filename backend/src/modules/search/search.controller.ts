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
          }
        });
        return;
      }

      // Query database in parallel for responsiveness
      const [notes, tasks, assignments, projects, subjects] = await Promise.all([
        prisma.note.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: query } },
              { content: { contains: query } }
            ]
          },
          take: 5,
          select: { id: true, title: true }
        }),
        prisma.task.findMany({
          where: {
            userId,
            title: { contains: query }
          },
          take: 5,
          select: { id: true, title: true, status: true, date: true }
        }),
        prisma.assignment.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: query } },
              { description: { contains: query } }
            ]
          },
          take: 5,
          select: { id: true, title: true, status: true, deadline: true }
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
          select: { id: true, name: true, color: true }
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
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
