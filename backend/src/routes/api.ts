import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import subjectRoutes from '../modules/subjects/subject.routes';
import folderRoutes from '../modules/folders/folder.routes';
import noteRoutes from '../modules/notes/note.routes';
import assignmentRoutes from '../modules/assignments/assignment.routes';
import taskRoutes from '../modules/tasks/task.routes';
import eventRoutes from '../modules/events/event.routes';
import calendarRoutes from '../modules/calendar/calendar.routes';
import projectRoutes from '../modules/projects/project.routes';
import habitRoutes from '../modules/habits/habit.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import aiRoutes from '../modules/ai/ai.routes';
import notificationRoutes from '../modules/notifications/notification.routes';
import backupRoutes from '../modules/backup/backup.routes';
import searchRoutes from '../modules/search/search.routes';
import attachmentRoutes from '../modules/attachments/attachment.routes';

const router = Router();

// Mount modules
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/subjects', subjectRoutes);
router.use('/folders', folderRoutes);
router.use('/notes', noteRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/tasks', taskRoutes);
router.use('/events', eventRoutes);
router.use('/calendar', calendarRoutes);
router.use('/projects', projectRoutes);
router.use('/habits', habitRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/ai', aiRoutes);
router.use('/notifications', notificationRoutes);
router.use('/backup', backupRoutes);
router.use('/search', searchRoutes);
router.use('/attachments', attachmentRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'UniManager API is healthy and operational.',
    timestamp: new Date().toISOString(),
  });
});

export default router;
