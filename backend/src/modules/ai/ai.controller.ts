import { Request, Response, NextFunction } from 'express';
import { AIService } from './ai.service';
import { BadRequestError } from '../../utils/errors';

export class AIController {
  private service = new AIService();

  getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const settings = await this.service.getSettings(req.user.userId);
      res.status(200).json({
        status: 'success',
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  };

  saveSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const settings = await this.service.saveSettings(req.user.userId, req.body);
      res.status(200).json({
        status: 'success',
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  };

  listConversations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const conversations = await this.service.listConversations(req.user.userId);
      res.status(200).json({
        status: 'success',
        results: conversations.length,
        data: { conversations },
      });
    } catch (error) {
      next(error);
    }
  };

  createConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const conversation = await this.service.createConversation(req.user.userId);
      res.status(201).json({
        status: 'success',
        data: { conversation },
      });
    } catch (error) {
      next(error);
    }
  };

  deleteConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      await this.service.deleteConversation(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        message: 'Conversation deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  getMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const messages = await this.service.getMessages(req.params.id, req.user.userId);
      res.status(200).json({
        status: 'success',
        results: messages.length,
        data: { messages },
      });
    } catch (error) {
      next(error);
    }
  };

  sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { content, includeRag } = req.body;
      const message = await this.service.sendMessage(
        req.user.userId,
        req.params.id,
        content,
        includeRag ?? true
      );
      res.status(201).json({
        status: 'success',
        data: { message },
      });
    } catch (error) {
      next(error);
    }
  };

  streamMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { content, includeRag } = req.body;
      const conversationId = req.params.id;

      // Set headers for Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const sendSse = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const message = await this.service.streamMessage(
        req.user.userId,
        conversationId,
        content,
        includeRag ?? true,
        (chunk: string) => {
          sendSse('chunk', { chunk });
        },
        (context: string) => {
          sendSse('context', { context });
        }
      );

      sendSse('done', { message });
      res.end();
    } catch (error: any) {
      if (res.headersSent) {
        res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
        res.end();
      } else {
        next(error);
      }
    }
  };

  summarizePDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      if (!req.file) {
        throw new BadRequestError('No PDF file uploaded.');
      }
      const summary = await this.service.summarizePDF(req.user.userId, req.file);
      res.status(200).json({
        status: 'success',
        data: { summary },
      });
    } catch (error) {
      next(error);
    }
  };

  ocrImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      if (!req.file) {
        throw new BadRequestError('No image file uploaded.');
      }
      const text = await this.service.ocrImage(req.user.userId, req.file);
      res.status(200).json({
        status: 'success',
        data: { text },
      });
    } catch (error) {
      next(error);
    }
  };

  generateStudyPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { availableHours, weakSubjects, examIds } = req.body;
      const plan = await this.service.generateStudyPlan(req.user.userId, {
        availableHours: availableHours ? Number(availableHours) : 4,
        weakSubjects: Array.isArray(weakSubjects) ? weakSubjects : [],
        examIds: Array.isArray(examIds) ? examIds : [],
      });
      res.status(200).json({
        status: 'success',
        data: { plan },
      });
    } catch (error) {
      next(error);
    }
  };

  assignmentAssistant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { assignmentId } = req.body;
      if (!assignmentId) {
        throw new BadRequestError('Assignment ID is required.');
      }
      const tasks = await this.service.assignmentAssistant(req.user.userId, assignmentId);
      res.status(200).json({
        status: 'success',
        data: { tasks },
      });
    } catch (error) {
      next(error);
    }
  };

  generateRevisionNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { content, noteId } = req.body;
      const notes = await this.service.generateRevisionNotes(req.user.userId, { content, noteId });
      res.status(200).json({
        status: 'success',
        data: { notes },
      });
    } catch (error) {
      next(error);
    }
  };

  generateFlashcards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { topic, content, noteId } = req.body;
      const flashcards = await this.service.generateFlashcards(req.user.userId, { topic, content, noteId });
      res.status(200).json({
        status: 'success',
        data: { flashcards },
      });
    } catch (error) {
      next(error);
    }
  };

  generateQuiz = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { topic, content, noteId, questionCount } = req.body;
      const quiz = await this.service.generateQuiz(req.user.userId, {
        topic,
        content,
        noteId,
        questionCount: questionCount ? Number(questionCount) : 5,
      });
      res.status(200).json({
        status: 'success',
        data: { quiz },
      });
    } catch (error) {
      next(error);
    }
  };

  projectAssistant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new BadRequestError('User session context missing.');
      }
      const { projectId } = req.body;
      if (!projectId) {
        throw new BadRequestError('Project ID is required.');
      }
      const tasks = await this.service.projectAssistant(req.user.userId, projectId);
      res.status(200).json({
        status: 'success',
        data: { tasks },
      });
    } catch (error) {
      next(error);
    }
  };
}
