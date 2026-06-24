import { prisma } from '../../utils/prisma';
import { Project } from '@prisma/client';

export class ProjectRepository {
  async findAllByUserId(userId: string): Promise<Project[]> {
    return prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
        },
        attachments: true,
      },
    });
  }

  async create(
    userId: string,
    data: {
      name: string;
      description?: string;
      githubUrl?: string | null;
    }
  ): Promise<Project> {
    return prisma.project.create({
      data: {
        userId,
        name: data.name,
        description: data.description || null,
        githubUrl: data.githubUrl || null,
        progress: 0.0,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      githubUrl?: string | null;
      progress?: number;
    }
  ): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data,
      include: {
        tasks: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({
      where: { id },
    });
  }
}
