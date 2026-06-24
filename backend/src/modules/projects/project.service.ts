import { ProjectRepository } from './project.repository';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { Project } from '@prisma/client';

export class ProjectService {
  private repository = new ProjectRepository();

  async getAllProjects(userId: string): Promise<Project[]> {
    return this.repository.findAllByUserId(userId);
  }

  async getProjectDetails(id: string, userId: string) {
    const project = await this.repository.findById(id);
    if (!project) {
      throw new NotFoundError('Project not found.');
    }
    if (project.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this project.');
    }
    return project;
  }

  async createProject(
    userId: string,
    data: {
      name: string;
      description?: string;
      githubUrl?: string | null;
    }
  ): Promise<Project> {
    return this.repository.create(userId, data);
  }

  async updateProject(
    id: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      githubUrl?: string | null;
      progress?: number;
    }
  ): Promise<Project> {
    const project = await this.repository.findById(id);
    if (!project) {
      throw new NotFoundError('Project not found.');
    }
    if (project.userId !== userId) {
      throw new ForbiddenError('Access to this project is denied.');
    }
    return this.repository.update(id, data);
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    const project = await this.repository.findById(id);
    if (!project) {
      throw new NotFoundError('Project not found.');
    }
    if (project.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this project.');
    }
    await this.repository.delete(id);
  }
}
