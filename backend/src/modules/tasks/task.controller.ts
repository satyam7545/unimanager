import { Request, Response, NextFunction } from 'express';
import { TaskService } from './task.service';
import { BadRequestError } from '../../utils/errors';

export class TaskController {
  private service = new TaskService();

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { dateStart, dateEnd, status, timeSlot, projectId, assignmentId } = req.query;

      const filters = {
        ...(dateStart && { dateStart: new Date(String(dateStart)) }),
        ...(dateEnd && { dateEnd: new Date(String(dateEnd)) }),
        ...(status && { status: String(status) }),
        ...(timeSlot && { timeSlot: String(timeSlot) }),
        ...(projectId && { projectId: String(projectId) }),
        ...(projectId === 'null' && { projectId: null }),
        ...(assignmentId && { assignmentId: String(assignmentId) }),
        ...(assignmentId === 'null' && { assignmentId: null }),
      };

      const tasks = await this.service.getAllTasks(req.user.userId, filters);

      res.status(200).json({
        status: 'success',
        results: tasks.length,
        data: { tasks },
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const task = await this.service.getTaskDetails(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const task = await this.service.createTask(req.user.userId, req.body);
      res.status(201).json({
        status: 'success',
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const task = await this.service.updateTask(req.params.id, req.user.userId, req.body);
      res.status(200).json({
        status: 'success',
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      await this.service.deleteTask(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        message: 'Task deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
