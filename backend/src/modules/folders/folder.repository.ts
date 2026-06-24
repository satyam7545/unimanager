import { prisma } from '../../utils/prisma';
import { Folder } from '@prisma/client';

export class FolderRepository {
  async findAllByUserId(userId: string): Promise<Folder[]> {
    return prisma.folder.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<Folder | null> {
    return prisma.folder.findUnique({
      where: { id },
    });
  }

  async create(userId: string, name: string, parentId?: string): Promise<Folder> {
    return prisma.folder.create({
      data: {
        userId,
        name,
        parentId: parentId || null,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.folder.delete({
      where: { id },
    });
  }
}
