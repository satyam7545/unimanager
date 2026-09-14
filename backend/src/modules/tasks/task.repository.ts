import { prisma } from '../../utils/prisma';
import { Task } from '@prisma/client';

export interface TaskFilters {
  dateStart?: Date;
  dateEnd?: Date;
  status?: string;
  timeSlot?: string;
  projectId?: string | null;
  assignmentId?: string | null;
  subjectId?: string | null;
}

export class TaskRepository {
  async findAllByUserId(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
    const { dateStart, dateEnd, status, timeSlot, projectId, assignmentId, subjectId } = filters;

    return prisma.task.findMany({
      where: {
        userId,
        AND: [
          dateStart && dateEnd
            ? {
                date: {
                  gte: dateStart,
                  lte: dateEnd,
                },
              }
            : {},
          status ? { status } : {},
          timeSlot ? { timeSlot } : {},
          projectId !== undefined ? { projectId } : {},
          assignmentId !== undefined ? { assignmentId } : {},
          subjectId !== undefined ? { subjectId } : {},
        ],
      },
      include: {
        project: { select: { id: true, name: true } },
        assignment: { select: { id: true, title: true } },
        subject: { select: { id: true, name: true, color: true } },
      },
      orderBy: { order: 'asc' },
    });
  }

  async findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        assignment: { select: { id: true, title: true } },
        subject: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async create(
    userId: string,
    data: {
      title: string;
      status: string;
      priority: string;
      date?: Date | null;
      timeSlot: string;
      projectId?: string | null;
      assignmentId?: string | null;
      subjectId?: string | null;
      parentId?: string | null;
      columnId?: string;
      estimatedMinutes?: number | null;
      actualMinutes?: number | null;
    }
  ): Promise<Task> {
    return prisma.task.create({
      data: {
        userId,
        title: data.title,
        status: data.status,
        priority: data.priority,
        date: data.date || null,
        timeSlot: data.timeSlot,
        projectId: data.projectId || null,
        assignmentId: data.assignmentId || null,
        subjectId: data.subjectId || null,
        parentId: data.parentId || null,
        columnId: data.columnId || 'ideas',
        estimatedMinutes: data.estimatedMinutes ?? 30,
        actualMinutes: data.actualMinutes ?? null,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignment: { select: { id: true, title: true } },
        subject: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      status?: string;
      priority?: string;
      date?: Date | null;
      timeSlot?: string;
      projectId?: string | null;
      assignmentId?: string | null;
      subjectId?: string | null;
      parentId?: string | null;
      order?: number;
      columnId?: string;
      estimatedMinutes?: number | null;
      actualMinutes?: number | null;
    }
  ): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, name: true } },
        assignment: { select: { id: true, title: true } },
        subject: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.task.delete({
      where: { id },
    });
  }
}
