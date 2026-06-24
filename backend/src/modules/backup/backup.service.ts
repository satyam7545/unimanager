import { prisma } from '../../utils/prisma';
import { BadRequestError } from '../../utils/errors';

export class BackupService {
  // Export User Database to structured JSON
  async exportData(userId: string) {
    const [
      subjects,
      folders,
      tags,
      notes,
      assignments,
      tasks,
      projects,
      habits,
      events,
      resources,
      notifications,
      aiSettings,
      attachments,
    ] = await Promise.all([
      prisma.subject.findMany({ where: { userId } }),
      prisma.folder.findMany({ where: { userId } }),
      prisma.tag.findMany({ where: { userId } }),
      prisma.note.findMany({ where: { userId }, include: { tags: { select: { id: true } } } }),
      prisma.assignment.findMany({ where: { userId } }),
      prisma.task.findMany({ where: { userId } }),
      prisma.project.findMany({ where: { userId } }),
      prisma.habit.findMany({ where: { userId }, include: { logs: true } }),
      prisma.event.findMany({ where: { userId } }),
      prisma.resource.findMany({ where: { userId } }),
      prisma.notification.findMany({ where: { userId } }),
      prisma.aISetting.findMany({ where: { userId } }),
      prisma.attachment.findMany({ where: { userId } }),
    ]);

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      userId,
      data: {
        subjects,
        folders,
        tags,
        notes,
        assignments,
        tasks,
        projects,
        habits,
        events,
        resources,
        notifications,
        aiSettings: aiSettings.map((s) => ({
          ...s,
          apiKey: null,
        })),
        attachments,
      },
    };
  }

  // Import JSON Dump and overwrite user's database records
  async importData(userId: string, dump: any) {
    if (!dump || dump.version !== '1.0.0' || !dump.data) {
      throw new BadRequestError('Invalid backup file structure or unsupported version.');
    }

    const {
      subjects = [],
      folders = [],
      tags = [],
      notes = [],
      assignments = [],
      tasks = [],
      projects = [],
      habits = [],
      events = [],
      resources = [],
      notifications = [],
      aiSettings = [],
      attachments = [],
    } = dump.data;

    // Run clean-up and import operations inside a database transaction to prevent corruption on failure
    await prisma.$transaction(async (tx) => {
      // 1. CLEAR existing records in correct child-to-parent order to satisfy constraints
      await tx.habitLog.deleteMany({ where: { habit: { userId } } });
      await tx.task.deleteMany({ where: { userId } });
      await tx.attachment.deleteMany({ where: { userId } });
      await tx.note.deleteMany({ where: { userId } });
      await tx.resource.deleteMany({ where: { userId } });
      await tx.event.deleteMany({ where: { userId } });
      await tx.assignment.deleteMany({ where: { userId } });
      await tx.project.deleteMany({ where: { userId } });
      await tx.habit.deleteMany({ where: { userId } });
      await tx.tag.deleteMany({ where: { userId } });
      await tx.folder.deleteMany({ where: { userId } });
      await tx.subject.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.aISetting.deleteMany({ where: { userId } });

      // 2. RE-CREATE independent parent tables
      // Re-create AI Settings
      for (const settings of aiSettings) {
        await tx.aISetting.create({
          data: {
            id: settings.id,
            provider: settings.provider,
            apiKey: settings.apiKey,
            endpoint: settings.endpoint,
            model: settings.model,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            systemPrompt: settings.systemPrompt,
            userId,
          },
        });
      }

      // Re-create Notifications
      for (const notif of notifications) {
        await tx.notification.create({
          data: {
            id: notif.id,
            title: notif.title,
            message: notif.message,
            isRead: notif.isRead,
            userId,
            createdAt: new Date(notif.createdAt),
          },
        });
      }

      // Re-create Course Subjects
      for (const sub of subjects) {
        await tx.subject.create({
          data: {
            id: sub.id,
            name: sub.name,
            color: sub.color,
            userId,
            createdAt: new Date(sub.createdAt),
          },
        });
      }

      // Re-create Folders (Pass 1: Insert without parentId to satisfy constraints)
      for (const fold of folders) {
        await tx.folder.create({
          data: {
            id: fold.id,
            name: fold.name,
            parentId: null,
            userId,
            createdAt: new Date(fold.createdAt),
          },
        });
      }

      // Re-create Tags
      for (const t of tags) {
        await tx.tag.create({
          data: {
            id: t.id,
            name: t.name,
            color: t.color,
            userId,
            createdAt: new Date(t.createdAt),
          },
        });
      }

      // Re-create Projects
      for (const proj of projects) {
        await tx.project.create({
          data: {
            id: proj.id,
            name: proj.name,
            description: proj.description,
            githubUrl: proj.githubUrl,
            progress: proj.progress,
            userId,
            createdAt: new Date(proj.createdAt),
          },
        });
      }

      // Re-create Habits & Logs
      for (const h of habits) {
        await tx.habit.create({
          data: {
            id: h.id,
            name: h.name,
            icon: h.icon,
            frequency: h.frequency,
            target: h.target,
            userId,
            createdAt: new Date(h.createdAt),
          },
        });

        for (const log of h.logs || []) {
          await tx.habitLog.create({
            data: {
              id: log.id,
              habitId: h.id,
              completedAt: new Date(log.completedAt),
              value: log.value,
              createdAt: new Date(log.createdAt),
            },
          });
        }
      }

      // Re-create Assignments
      for (const ass of assignments) {
        await tx.assignment.create({
          data: {
            id: ass.id,
            title: ass.title,
            description: ass.description,
            priority: ass.priority,
            status: ass.status,
            deadline: new Date(ass.deadline),
            subjectId: ass.subjectId,
            userId,
            createdAt: new Date(ass.createdAt),
          },
        });
      }

      // Re-create Events
      for (const ev of events) {
        await tx.event.create({
          data: {
            id: ev.id,
            title: ev.title,
            description: ev.description,
            startAt: new Date(ev.startAt),
            endAt: new Date(ev.endAt),
            color: ev.color,
            isAllDay: ev.isAllDay,
            subjectId: ev.subjectId,
            userId,
            createdAt: new Date(ev.createdAt),
          },
        });
      }

      // Re-create Resources
      for (const r of resources) {
        await tx.resource.create({
          data: {
            id: r.id,
            title: r.title,
            type: r.type,
            url: r.url,
            subjectId: r.subjectId,
            userId,
            createdAt: new Date(r.createdAt),
          },
        });
      }

      // Re-create Notes and Many-To-Many Tags linkage
      for (const n of notes) {
        await tx.note.create({
          data: {
            id: n.id,
            title: n.title,
            content: n.content,
            isRichText: n.isRichText,
            isPinned: n.isPinned,
            isFavorite: n.isFavorite,
            folderId: n.folderId,
            subjectId: n.subjectId,
            userId,
            createdAt: new Date(n.createdAt),
            tags: {
              connect: (n.tags || []).map((t: any) => ({ id: t.id })),
            },
          },
        });
      }

      // Re-create Attachments
      for (const att of attachments) {
        await tx.attachment.create({
          data: {
            id: att.id,
            fileName: att.fileName,
            fileType: att.fileType,
            filePath: att.filePath,
            fileSize: att.fileSize,
            noteId: att.noteId,
            projectId: att.projectId,
            assignmentId: att.assignmentId,
            userId,
            createdAt: new Date(att.createdAt),
          },
        });
      }

      // Re-create Tasks (Pass 1: Insert setting parentId to null to prevent self-reference block)
      for (const task of tasks) {
        await tx.task.create({
          data: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            order: task.order,
            columnId: task.columnId,
            projectId: task.projectId,
            assignmentId: task.assignmentId,
            parentId: null,
            date: task.date ? new Date(task.date) : null,
            timeSlot: task.timeSlot,
            userId,
            createdAt: new Date(task.createdAt),
          },
        });
      }

      // 3. SECOND PASS UPDATES: Link child relations for self-referential tables
      // Link Folders parentId pointers
      for (const fold of folders) {
        if (fold.parentId) {
          await tx.folder.update({
            where: { id: fold.id },
            data: { parentId: fold.parentId },
          });
        }
      }

      // Link Tasks parentId pointers
      for (const task of tasks) {
        if (task.parentId) {
          await tx.task.update({
            where: { id: task.id },
            data: { parentId: task.parentId },
          });
        }
      }
    });
  }
}
