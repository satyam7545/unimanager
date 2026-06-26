import { Request, Response, NextFunction } from 'express';
import { AssignmentService } from './assignment.service';
import { BadRequestError } from '../../utils/errors';

export class AssignmentController {
  private service = new AssignmentService();

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { subjectId, priority, status, semester } = req.query;

      const filters = {
        ...(subjectId && { subjectId: String(subjectId) }),
        ...(subjectId === 'null' && { subjectId: null }),
        ...(priority && { priority: String(priority) }),
        ...(status && { status: String(status) }),
        ...(semester && { semester: String(semester) }),
      };

      const assignments = await this.service.getAllAssignments(req.user.userId, filters);

      res.status(200).json({
        status: 'success',
        results: assignments.length,
        data: { assignments },
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
      const assignment = await this.service.getAssignmentDetails(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        data: { assignment },
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
      const assignment = await this.service.createAssignment(req.user.userId, req.body);
      res.status(201).json({
        status: 'success',
        data: { assignment },
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
      const assignment = await this.service.updateAssignment(req.params.id, req.user.userId, req.body);
      res.status(200).json({
        status: 'success',
        data: { assignment },
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
      await this.service.deleteAssignment(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        message: 'Assignment deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
