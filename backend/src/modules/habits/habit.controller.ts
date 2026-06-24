import { Request, Response, NextFunction } from 'express';
import { HabitService } from './habit.service';
import { BadRequestError } from '../../utils/errors';

export class HabitController {
  private service = new HabitService();

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const habits = await this.service.getAllHabits(req.user.userId);
      res.status(200).json({
        status: 'success',
        results: habits.length,
        data: { habits },
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
      const { name, icon, frequency, target } = req.body;
      if (!name) {
        throw new BadRequestError('Habit name is required.');
      }
      const habit = await this.service.createHabit(req.user.userId, { name, icon, frequency, target });
      res.status(201).json({
        status: 'success',
        data: { habit },
      });
    } catch (error) {
      next(error);
    }
  };

  toggle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const result = await this.service.toggleHabit(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        data: result,
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
      await this.service.deleteHabit(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        message: 'Habit deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
