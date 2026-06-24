import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors';
import fs from 'fs';
import path from 'path';

export class AttachmentController {
  upload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const userId = req.user.userId;

      if (!req.file) {
        throw new BadRequestError('No file uploaded.');
      }

      const { noteId, assignmentId, projectId } = req.body;

      if (!noteId && !assignmentId && !projectId) {
        throw new BadRequestError('Attachment must be linked to a note, assignment, or project.');
      }

      // Validate Note ownership if noteId is provided
      if (noteId) {
        const note = await prisma.note.findUnique({ where: { id: noteId } });
        if (!note) {
          throw new NotFoundError('Note not found.');
        }
        if (note.userId !== userId) {
          throw new ForbiddenError('Access to this note is denied.');
        }
      }

      // Validate Assignment ownership if assignmentId is provided
      if (assignmentId) {
        const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
        if (!assignment) {
          throw new NotFoundError('Assignment not found.');
        }
        if (assignment.userId !== userId) {
          throw new ForbiddenError('Access to this assignment is denied.');
        }
      }

      // Validate Project ownership if projectId is provided
      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          throw new NotFoundError('Project not found.');
        }
        if (project.userId !== userId) {
          throw new ForbiddenError('Access to this project is denied.');
        }
      }

      // Ensure upload directory exists
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate unique file name
      const uniqueFilename = `${Date.now()}-${req.file.originalname}`;
      const filePathOnDisk = path.join(uploadDir, uniqueFilename);

      // Write the file to disk
      await fs.promises.writeFile(filePathOnDisk, req.file.buffer);

      const fileUrlPath = `/uploads/${uniqueFilename}`;

      // Create database record
      const attachment = await prisma.attachment.create({
        data: {
          userId,
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          filePath: fileUrlPath,
          noteId: noteId || null,
          assignmentId: assignmentId || null,
          projectId: projectId || null,
        },
      });

      res.status(201).json({
        status: 'success',
        data: { attachment },
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
      const userId = req.user.userId;
      const { id } = req.params;

      const attachment = await prisma.attachment.findUnique({ where: { id } });
      if (!attachment) {
        throw new NotFoundError('Attachment not found.');
      }

      if (attachment.userId !== userId) {
        throw new ForbiddenError('Access to this attachment is denied.');
      }

      // Delete file from disk
      const filename = path.basename(attachment.filePath);
      const filePathOnDisk = path.join(process.cwd(), 'uploads', filename);

      if (fs.existsSync(filePathOnDisk)) {
        await fs.promises.unlink(filePathOnDisk);
      }

      // Delete database record
      await prisma.attachment.delete({ where: { id } });

      res.status(200).json({
        status: 'success',
        message: 'Attachment deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
