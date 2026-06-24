import { Request, Response, NextFunction } from 'express';
import { BackupService } from './backup.service';
import { BadRequestError } from '../../utils/errors';

export class BackupController {
  private service = new BackupService();

  exportBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const backup = await this.service.exportData(req.user.userId);
      res.status(200).json({
        status: 'success',
        data: { backup },
      });
    } catch (error) {
      next(error);
    }
  };

  importBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { backup } = req.body;
      if (!backup) {
        throw new BadRequestError('No backup data payload provided.');
      }
      await this.service.importData(req.user.userId, backup);
      res.status(200).json({
        status: 'success',
        message: 'Database state restored successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
