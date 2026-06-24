import { prisma } from '../../utils/prisma';
import { Event } from '@prisma/client';

export class EventRepository {
  async findAllByUserId(userId: string, start?: Date, end?: Date): Promise<Event[]> {
    return prisma.event.findMany({
      where: {
        userId,
        AND: [
          start ? { startAt: { gte: start } } : {},
          end ? { endAt: { lte: end } } : {},
        ],
      },
      include: {
        subject: { select: { id: true, name: true, color: true } },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async findById(id: string): Promise<Event | null> {
    return prisma.event.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async create(
    userId: string,
    data: {
      title: string;
      description?: string;
      startAt: Date;
      endAt: Date;
      color: string;
      isAllDay: boolean;
      subjectId?: string | null;
    }
  ): Promise<Event> {
    return prisma.event.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        startAt: data.startAt,
        endAt: data.endAt,
        color: data.color,
        isAllDay: data.isAllDay,
        subjectId: data.subjectId || null,
      },
      include: {
        subject: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      startAt?: Date;
      endAt?: Date;
      color?: string;
      isAllDay?: boolean;
      subjectId?: string | null;
    }
  ): Promise<Event> {
    return prisma.event.update({
      where: { id },
      data,
      include: {
        subject: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.event.delete({
      where: { id },
    });
  }
}
