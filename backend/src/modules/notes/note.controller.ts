import { Request, Response, NextFunction } from 'express';
import { NoteService } from './note.service';
import { BadRequestError } from '../../utils/errors';

export class NoteController {
  private service = new NoteService();

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }

      const { search, folderId, subjectId, isPinned, isFavorite, semester } = req.query;

      const filters = {
        ...(search && { search: String(search) }),
        ...(folderId && { folderId: String(folderId) }),
        ...(folderId === 'null' && { folderId: null }),
        ...(subjectId && { subjectId: String(subjectId) }),
        ...(subjectId === 'null' && { subjectId: null }),
        ...(isPinned !== undefined && { isPinned: isPinned === 'true' }),
        ...(isFavorite !== undefined && { isFavorite: isFavorite === 'true' }),
        ...(semester && { semester: String(semester) }),
      };

      const notes = await this.service.getAllNotes(req.user.userId, filters);

      res.status(200).json({
        status: 'success',
        results: notes.length,
        data: { notes },
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
      const note = await this.service.getNoteDetails(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        data: { note },
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
      const note = await this.service.createNote(req.user.userId, req.body);
      res.status(201).json({
        status: 'success',
        data: { note },
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
      const { title, content, isRichText, isPinned, isFavorite, folderId, subjectId, semester, tags } = req.body;
      
      const note = await this.service.updateNote(
        req.params.id,
        req.user.userId,
        { title, content, isRichText, isPinned, isFavorite, folderId, subjectId, semester },
        tags
      );

      res.status(200).json({
        status: 'success',
        data: { note },
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
      await this.service.deleteNote(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        message: 'Note deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
