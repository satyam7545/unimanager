import { Request, Response, NextFunction } from 'express';
import { ProjectService } from './project.service';
import { BadRequestError } from '../../utils/errors';

export class ProjectController {
  private service = new ProjectService();

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const projects = await this.service.getAllProjects(req.user.userId);
      res.status(200).json({
        status: 'success',
        results: projects.length,
        data: { projects },
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
      const project = await this.service.getProjectDetails(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        data: { project },
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
      const project = await this.service.createProject(req.user.userId, req.body);
      res.status(201).json({
        status: 'success',
        data: { project },
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
      const project = await this.service.updateProject(req.params.id, req.user.userId, req.body);
      res.status(200).json({
        status: 'success',
        data: { project },
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
      await this.service.deleteProject(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        message: 'Project deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
