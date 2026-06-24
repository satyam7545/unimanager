import { Request, Response, NextFunction } from 'express';
import { FolderService } from './folder.service';
import { BadRequestError } from '../../utils/errors';

export class FolderController {
  private service = new FolderService();

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const folders = await this.service.getAllFolders(req.user.userId);
      res.status(200).json({
        status: 'success',
        results: folders.length,
        data: { folders },
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
      const { name, parentId } = req.body;
      if (!name) {
        throw new BadRequestError('Folder name is required.');
      }
      const folder = await this.service.createFolder(req.user.userId, name, parentId);
      res.status(201).json({
        status: 'success',
        data: { folder },
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
      await this.service.deleteFolder(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        message: 'Folder deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
