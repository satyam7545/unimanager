import { prisma } from '../../utils/prisma';
import { Assignment } from '@prisma/client';

export interface AssignmentFilters {
  subjectId?: string | null;
  priority?: string;
  status?: string;
  semester?: string | null;
}

export class AssignmentRepository {
  async findAllByUserId(userId: string, filters: AssignmentFilters = {}): Promise<Assignment[]> {
    const { subjectId, priority, status, semester } = filters;

    return prisma.assignment.findMany({
      where: {
        userId,
        AND: [
          subjectId !== undefined ? { subjectId } : {},
          priority ? { priority } : {},
          status ? { status } : {},
          semester ? {
            OR: [
              { semester },
              { subject: { semester } },
            ],
          } : {},
        ],
      },
      include: {
        subject: { select: { id: true, name: true, color: true, semester: true } },
        attachments: true,
      },
      orderBy: { deadline: 'asc' },
    });
  }

  async findById(id: string): Promise<Assignment | null> {
    return prisma.assignment.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, color: true, semester: true } },
        attachments: true,
      },
    });
  }

  async create(
    userId: string,
    data: {
      title: string;
      description?: string;
      priority: string;
      status: string;
      deadline: Date;
      subjectId?: string | null;
      semester?: string | null;
    }
  ): Promise<Assignment> {
    return prisma.assignment.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        status: data.status,
        deadline: data.deadline,
        subjectId: data.subjectId || null,
        semester: data.semester || null,
      },
      include: {
        subject: { select: { id: true, name: true, color: true, semester: true } },
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      deadline?: Date;
      subjectId?: string | null;
      semester?: string | null;
    }
  ): Promise<Assignment> {
    return prisma.assignment.update({
      where: { id },
      data,
      include: {
        subject: { select: { id: true, name: true, color: true, semester: true } },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.assignment.delete({
      where: { id },
    });
  }
}
