import { AssignmentRepository, AssignmentFilters } from './assignment.repository';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { Assignment } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export class AssignmentService {
  private repository = new AssignmentRepository();

  async getAllAssignments(userId: string, filters: AssignmentFilters = {}): Promise<Assignment[]> {
    return this.repository.findAllByUserId(userId, filters);
  }

  async getAssignmentDetails(id: string, userId: string): Promise<Assignment> {
    const assignment = await this.repository.findById(id);
    if (!assignment) {
      throw new NotFoundError('Assignment not found.');
    }
    if (assignment.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this assignment.');
    }
    return assignment;
  }

  async createAssignment(
    userId: string,
    data: {
      title: string;
      description?: string;
      priority: string;
      status: string;
      deadline: string;
      subjectId?: string | null;
      semester?: string | null;
    }
  ): Promise<Assignment> {
    // Validate subject ownership
    if (data.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
      if (!subject || subject.userId !== userId) {
        throw new NotFoundError('Subject not found or access denied.');
      }
    }

    return this.repository.create(userId, {
      ...data,
      deadline: new Date(data.deadline),
    });
  }

  async updateAssignment(
    id: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      deadline?: string;
      subjectId?: string | null;
      semester?: string | null;
    }
  ): Promise<Assignment> {
    const assignment = await this.repository.findById(id);
    if (!assignment) {
      throw new NotFoundError('Assignment not found.');
    }
    if (assignment.userId !== userId) {
      throw new ForbiddenError('Access to this assignment is denied.');
    }

    // Validate subject ownership
    if (data.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
      if (!subject || subject.userId !== userId) {
        throw new NotFoundError('Subject not found or access denied.');
      }
    }

    const { deadline, ...rest } = data;
    return this.repository.update(id, {
      ...rest,
      ...(deadline ? { deadline: new Date(deadline) } : {}),
    });
  }

  async deleteAssignment(id: string, userId: string): Promise<void> {
    const assignment = await this.repository.findById(id);
    if (!assignment) {
      throw new NotFoundError('Assignment not found.');
    }
    if (assignment.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this assignment.');
    }
    await this.repository.delete(id);
  }
}
