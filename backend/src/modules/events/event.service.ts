import { EventRepository } from './event.repository';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { Event } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export class EventService {
  private repository = new EventRepository();

  async getAllEvents(userId: string, start?: string, end?: string): Promise<Event[]> {
    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;
    return this.repository.findAllByUserId(userId, startDate, endDate);
  }

  async getEventDetails(id: string, userId: string): Promise<Event> {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }
    if (event.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this event.');
    }
    return event;
  }

  async createEvent(
    userId: string,
    data: {
      title: string;
      description?: string;
      startAt: string;
      endAt: string;
      color: string;
      isAllDay: boolean;
      subjectId?: string | null;
    }
  ): Promise<Event> {
    // Validate subject ownership
    if (data.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
      if (!subject || subject.userId !== userId) {
        throw new NotFoundError('Subject not found or access denied.');
      }
    }

    return this.repository.create(userId, {
      ...data,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
    });
  }

  async updateEvent(
    id: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      startAt?: string;
      endAt?: string;
      color?: string;
      isAllDay?: boolean;
      subjectId?: string | null;
    }
  ): Promise<Event> {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }
    if (event.userId !== userId) {
      throw new ForbiddenError('Access to this event is denied.');
    }

    // Validate subject ownership
    if (data.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
      if (!subject || subject.userId !== userId) {
        throw new NotFoundError('Subject not found or access denied.');
      }
    }

    const { startAt, endAt, ...rest } = data;
    return this.repository.update(id, {
      ...rest,
      ...(startAt ? { startAt: new Date(startAt) } : {}),
      ...(endAt ? { endAt: new Date(endAt) } : {}),
    });
  }

  async deleteEvent(id: string, userId: string): Promise<void> {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }
    if (event.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this event.');
    }
    await this.repository.delete(id);
  }
}
