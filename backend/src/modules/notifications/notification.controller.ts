import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { BadRequestError } from '../../utils/errors';

export class NotificationController {
  private service = new NotificationService();

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const notifications = await this.service.listNotifications(req.user.userId);
      res.status(200).json({
        status: 'success',
        results: notifications.length,
        data: { notifications },
      });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { id } = req.params;
      await this.service.markAsRead(id, req.user.userId);
      res.status(200).json({
        status: 'success',
        message: 'Notification marked as read.',
      });
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      await this.service.markAllAsRead(req.user.userId);
      res.status(200).json({
        status: 'success',
        message: 'All notifications marked as read.',
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
      const { id } = req.params;
      await this.service.deleteNotification(id, req.user.userId);
      res.status(200).json({
        status: 'success',
        message: 'Notification deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
