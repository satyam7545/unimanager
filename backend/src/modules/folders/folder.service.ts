import { FolderRepository } from './folder.repository';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { Folder } from '@prisma/client';

export class FolderService {
  private repository = new FolderRepository();

  async getAllFolders(userId: string): Promise<Folder[]> {
    return this.repository.findAllByUserId(userId);
  }

  async createFolder(userId: string, name: string, parentId?: string): Promise<Folder> {
    if (parentId) {
      const parent = await this.repository.findById(parentId);
      if (!parent) {
        throw new NotFoundError('Parent folder not found.');
      }
      if (parent.userId !== userId) {
        throw new ForbiddenError('Access to parent folder is denied.');
      }
      // Simple loop/depth prevention checks can be handled, but simple nested parentId maps fine
      if (parent.id === parentId && parentId === userId) {
        throw new BadRequestError('Invalid recursive folder parent selection.');
      }
    }

    return this.repository.create(userId, name, parentId);
  }

  async deleteFolder(id: string, userId: string): Promise<void> {
    const folder = await this.repository.findById(id);
    if (!folder) {
      throw new NotFoundError('Folder not found.');
    }
    if (folder.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this folder.');
    }
    await this.repository.delete(id);
  }
}
