import { SubjectRepository } from './subject.repository';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { Subject } from '@prisma/client';

export class SubjectService {
  private repository = new SubjectRepository();

  async getAllSubjects(userId: string, filters: { semester?: string } = {}): Promise<Subject[]> {
    return this.repository.findAllByUserId(userId, filters);
  }

  async getSubjectDetails(id: string, userId: string) {
    const subject = await this.repository.findByIdAndUser(id, userId);
    if (!subject) {
      throw new NotFoundError('Subject not found or access denied.');
    }
    return subject;
  }

  async createSubject(userId: string, name: string, color: string, semester?: string | null): Promise<Subject> {
    return this.repository.create(userId, name, color, semester);
  }

  async updateSubject(id: string, userId: string, name?: string, color?: string, semester?: string | null): Promise<Subject> {
    const subject = await this.repository.findById(id);
    if (!subject) {
      throw new NotFoundError('Subject not found.');
    }
    if (subject.userId !== userId) {
      throw new ForbiddenError('You do not have permission to update this subject.');
    }
    return this.repository.update(id, name, color, semester);
  }

  async deleteSubject(id: string, userId: string): Promise<void> {
    const subject = await this.repository.findById(id);
    if (!subject) {
      throw new NotFoundError('Subject not found.');
    }
    if (subject.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this subject.');
    }
    await this.repository.delete(id);
  }
}
