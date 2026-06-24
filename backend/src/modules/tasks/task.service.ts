import { TaskRepository, TaskFilters } from './task.repository';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { Task } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export class TaskService {
  private repository = new TaskRepository();

  async getAllTasks(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
    return this.repository.findAllByUserId(userId, filters);
  }

  async getTaskDetails(id: string, userId: string): Promise<Task> {
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundError('Task not found.');
    }
    if (task.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this task.');
    }
    return task;
  }

  async createTask(
    userId: string,
    data: {
      title: string;
      status: string;
      priority: string;
      date?: string | null;
      timeSlot: string;
      projectId?: string | null;
      assignmentId?: string | null;
      parentId?: string | null;
      columnId?: string;
    }
  ): Promise<Task> {
    // Validate project ownership
    if (data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: data.projectId } });
      if (!project || project.userId !== userId) {
        throw new NotFoundError('Project not found or access denied.');
      }
    }

    // Validate assignment ownership
    if (data.assignmentId) {
      const assignment = await prisma.assignment.findUnique({ where: { id: data.assignmentId } });
      if (!assignment || assignment.userId !== userId) {
        throw new NotFoundError('Assignment not found or access denied.');
      }
    }

    // Validate parent task ownership
    if (data.parentId) {
      const parentTask = await prisma.task.findUnique({ where: { id: data.parentId } });
      if (!parentTask || parentTask.userId !== userId) {
        throw new NotFoundError('Parent task not found or access denied.');
      }
    }

    const task = await this.repository.create(userId, {
      ...data,
      date: data.date ? new Date(data.date) : null,
    });

    if (task.projectId) {
      await this.syncProjectProgress(task.projectId);
    }
    return task;
  }

  async updateTask(
    id: string,
    userId: string,
    data: {
      title?: string;
      status?: string;
      priority?: string;
      date?: string | null;
      timeSlot?: string;
      projectId?: string | null;
      assignmentId?: string | null;
      parentId?: string | null;
      order?: number;
      columnId?: string;
    }
  ): Promise<Task> {
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundError('Task not found.');
    }
    if (task.userId !== userId) {
      throw new ForbiddenError('Access to this task is denied.');
    }

    // Validate project ownership
    if (data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: data.projectId } });
      if (!project || project.userId !== userId) {
        throw new NotFoundError('Project not found or access denied.');
      }
    }

    // Validate assignment ownership
    if (data.assignmentId) {
      const assignment = await prisma.assignment.findUnique({ where: { id: data.assignmentId } });
      if (!assignment || assignment.userId !== userId) {
        throw new NotFoundError('Assignment not found or access denied.');
      }
    }

    const { date, ...rest } = data;
    const updatedTask = await this.repository.update(id, {
      ...rest,
      ...(date !== undefined ? { date: date ? new Date(date) : null } : {}),
    });

    // Recalculate progress for the old project and new project if swapped
    if (task.projectId) {
      await this.syncProjectProgress(task.projectId);
    }
    if (updatedTask.projectId && updatedTask.projectId !== task.projectId) {
      await this.syncProjectProgress(updatedTask.projectId);
    }

    return updatedTask;
  }

  async deleteTask(id: string, userId: string): Promise<void> {
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundError('Task not found.');
    }
    if (task.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this task.');
    }
    await this.repository.delete(id);

    if (task.projectId) {
      await this.syncProjectProgress(task.projectId);
    }
  }

  // --- Progress Syncer Helper ---
  private async syncProjectProgress(projectId: string): Promise<void> {
    try {
      const totalTasks = await prisma.task.count({
        where: { projectId },
      });

      const completedTasks = await prisma.task.count({
        where: { projectId, status: 'DONE' },
      });

      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      await prisma.project.update({
        where: { id: projectId },
        data: { progress },
      });
    } catch (e) {
      console.error(`Failed to sync project progress for project ${projectId}:`, e);
    }
  }
}
