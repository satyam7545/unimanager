import { prisma } from '../../utils/prisma';
import { Subject } from '@prisma/client';

export class SubjectRepository {
  async findAllByUserId(userId: string): Promise<Subject[]> {
    return prisma.subject.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<Subject | null> {
    return prisma.subject.findUnique({
      where: { id },
    });
  }

  async findByIdAndUser(id: string, userId: string): Promise<Subject | null> {
    return prisma.subject.findFirst({
      where: { id, userId },
      include: {
        notes: {
          select: { id: true, title: true, content: true, isPinned: true, isFavorite: true, updatedAt: true, attachments: true },
        },
        assignments: {
          select: { id: true, title: true, description: true, deadline: true, status: true, priority: true, attachments: true },
        },
        resources: true,
      },
    });
  }

  async create(userId: string, name: string, color: string): Promise<Subject> {
    return prisma.subject.create({
      data: {
        userId,
        name,
        color,
      },
    });
  }

  async update(id: string, name?: string, color?: string): Promise<Subject> {
    return prisma.subject.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.subject.delete({
      where: { id },
    });
  }
}
