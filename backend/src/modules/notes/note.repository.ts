import { prisma } from '../../utils/prisma';
import { Note } from '@prisma/client';

export interface NoteFilters {
  search?: string;
  folderId?: string | null;
  subjectId?: string | null;
  isPinned?: boolean;
  isFavorite?: boolean;
  semester?: string | null;
}

export class NoteRepository {
  async findAllByUserId(userId: string, filters: NoteFilters = {}): Promise<Note[]> {
    const { search, folderId, subjectId, isPinned, isFavorite, semester } = filters;

    return prisma.note.findMany({
      where: {
        userId,
        AND: [
          search
            ? {
                OR: [
                  { title: { contains: search } },
                  { content: { contains: search } },
                ],
              }
            : {},
          folderId !== undefined ? { folderId } : {},
          subjectId !== undefined ? { subjectId } : {},
          isPinned !== undefined ? { isPinned } : {},
          isFavorite !== undefined ? { isFavorite } : {},
          semester ? {
            OR: [
              { semester },
              { subject: { semester } },
            ],
          } : {},
        ],
      },
      include: {
        tags: true,
        subject: { select: { id: true, name: true, color: true, semester: true } },
        attachments: true,
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  async findById(id: string): Promise<Note | null> {
    return prisma.note.findUnique({
      where: { id },
      include: {
        tags: true,
        subject: { select: { id: true, name: true, color: true, semester: true } },
        attachments: true,
      },
    });
  }

  async create(
    userId: string,
    data: {
      title: string;
      content: string;
      isRichText?: boolean;
      folderId?: string | null;
      subjectId?: string | null;
      semester?: string | null;
    }
  ): Promise<Note> {
    return prisma.note.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        isRichText: data.isRichText ?? false,
        folderId: data.folderId || null,
        subjectId: data.subjectId || null,
        semester: data.semester || null,
      },
      include: {
        tags: true,
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      content?: string;
      isRichText?: boolean;
      isPinned?: boolean;
      isFavorite?: boolean;
      folderId?: string | null;
      subjectId?: string | null;
      semester?: string | null;
    },
    tagIds?: string[]
  ): Promise<Note> {
    return prisma.note.update({
      where: { id },
      data: {
        ...data,
        ...(tagIds && {
          tags: {
            set: tagIds.map((tagId) => ({ id: tagId })),
          },
        }),
      },
      include: {
        tags: true,
        subject: { select: { id: true, name: true, color: true, semester: true } },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.note.delete({
      where: { id },
    });
  }

  // --- Tag Helpers ---

  async findOrCreateTags(userId: string, tagNames: string[]): Promise<string[]> {
    const ids: string[] = [];

    for (const name of tagNames) {
      const trimmed = name.trim();
      if (!trimmed) continue;

      let tag = await prisma.tag.findFirst({
        where: { name: trimmed, userId },
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: { name: trimmed, userId, color: '#8B5CF6' },
        });
      }

      ids.push(tag.id);
    }

    return ids;
  }
}
