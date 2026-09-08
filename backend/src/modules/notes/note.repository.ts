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
    // 1. Clean and deduplicate the input tag names
    const trimmedNames = tagNames.map(n => n.trim()).filter(n => n.length > 0);
    const uniqueNames = [...new Set(trimmedNames)];

    if (uniqueNames.length === 0) {
      return [];
    }

    // 2. Fetch existing tags in one query
    const existingTags = await prisma.tag.findMany({
      where: {
        userId,
        name: { in: uniqueNames }
      }
    });

    const existingNames = new Set(existingTags.map(t => t.name));

    // 3. Find missing tags
    const missingNames = uniqueNames.filter(name => !existingNames.has(name));

    // 4. Create missing tags in bulk
    if (missingNames.length > 0) {
      await prisma.tag.createMany({
        data: missingNames.map(name => ({
          name,
          userId,
          color: '#8B5CF6'
        })),
        skipDuplicates: true // In case of concurrent creations
      });

      // Fetch the newly created tags to get their IDs
      const newTags = await prisma.tag.findMany({
        where: {
          userId,
          name: { in: missingNames }
        }
      });

      existingTags.push(...newTags);
    }

    // 5. Map back to original order and format
    const tagMap = new Map(existingTags.map(t => [t.name, t.id]));

    return trimmedNames
      .map(name => tagMap.get(name))
      .filter((id): id is string => id !== undefined);
  }
}
