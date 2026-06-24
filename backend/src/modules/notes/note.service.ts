import { NoteRepository, NoteFilters } from './note.repository';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { Note } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export class NoteService {
  private repository = new NoteRepository();

  async getAllNotes(userId: string, filters: NoteFilters = {}): Promise<Note[]> {
    return this.repository.findAllByUserId(userId, filters);
  }

  async getNoteDetails(id: string, userId: string): Promise<Note> {
    const note = await this.repository.findById(id);
    if (!note) {
      throw new NotFoundError('Note not found.');
    }
    if (note.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this note.');
    }
    return note;
  }

  async createNote(
    userId: string,
    data: {
      title: string;
      content: string;
      isRichText?: boolean;
      folderId?: string | null;
      subjectId?: string | null;
    }
  ): Promise<Note> {
    // 1. Validate parent folder ownership
    if (data.folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: data.folderId } });
      if (!folder || folder.userId !== userId) {
        throw new NotFoundError('Folder not found or access denied.');
      }
    }

    // 2. Validate subject ownership
    if (data.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
      if (!subject || subject.userId !== userId) {
        throw new NotFoundError('Subject not found or access denied.');
      }
    }

    return this.repository.create(userId, data);
  }

  async updateNote(
    id: string,
    userId: string,
    data: {
      title?: string;
      content?: string;
      isRichText?: boolean;
      isPinned?: boolean;
      isFavorite?: boolean;
      folderId?: string | null;
      subjectId?: string | null;
    },
    tags?: string[]
  ): Promise<Note> {
    // 1. Fetch note to verify ownership
    const note = await this.repository.findById(id);
    if (!note) {
      throw new NotFoundError('Note not found.');
    }
    if (note.userId !== userId) {
      throw new ForbiddenError('Access to this note is denied.');
    }

    // 2. Validate parent folder ownership
    if (data.folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: data.folderId } });
      if (!folder || folder.userId !== userId) {
        throw new NotFoundError('Folder not found or access denied.');
      }
    }

    // 3. Validate subject ownership
    if (data.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
      if (!subject || subject.userId !== userId) {
        throw new NotFoundError('Subject not found or access denied.');
      }
    }

    // 4. Handle tag creations and mapping if tags list is passed
    let tagIds: string[] | undefined = undefined;
    if (tags) {
      tagIds = await this.repository.findOrCreateTags(userId, tags);
    }

    return this.repository.update(id, data, tagIds);
  }

  async deleteNote(id: string, userId: string): Promise<void> {
    const note = await this.repository.findById(id);
    if (!note) {
      throw new NotFoundError('Note not found.');
    }
    if (note.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this note.');
    }
    await this.repository.delete(id);
  }
}
