import { Request, Response, NextFunction } from 'express';
import { SubjectService } from './subject.service';
import { BadRequestError } from '../../utils/errors';

export class SubjectController {
  private service = new SubjectService();

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { semester } = req.query;
      const filters = {
        ...(semester && { semester: String(semester) }),
      };
      const subjects = await this.service.getAllSubjects(req.user.userId, filters);
      res.status(200).json({
        status: 'success',
        results: subjects.length,
        data: { subjects },
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
      const subject = await this.service.getSubjectDetails(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        data: { subject },
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
      const { name, color, semester } = req.body;
      const subject = await this.service.createSubject(req.user.userId, name, color, semester);
      res.status(201).json({
        status: 'success',
        data: { subject },
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
      const { name, color, semester } = req.body;
      const subject = await this.service.updateSubject(req.params.id, req.user.userId, name, color, semester);
      res.status(200).json({
        status: 'success',
        data: { subject },
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
      await this.service.deleteSubject(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        message: 'Subject deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
