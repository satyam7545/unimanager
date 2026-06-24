import { Request, Response, NextFunction } from 'express';
import { EventService } from './event.service';
import { BadRequestError } from '../../utils/errors';

export class EventController {
  private service = new EventService();

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { start, end } = req.query;

      const events = await this.service.getAllEvents(
        req.user.userId,
        start ? String(start) : undefined,
        end ? String(end) : undefined
      );

      res.status(200).json({
        status: 'success',
        results: events.length,
        data: { events },
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
      const event = await this.service.getEventDetails(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        data: { event },
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
      const event = await this.service.createEvent(req.user.userId, req.body);
      res.status(201).json({
        status: 'success',
        data: { event },
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
      const event = await this.service.updateEvent(req.params.id, req.user.userId, req.body);
      res.status(200).json({
        status: 'success',
        data: { event },
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
      await this.service.deleteEvent(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        message: 'Event deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
