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
      if (aiSettings.length > 0) {
        await tx.aISetting.createMany({
          data: aiSettings.map((settings: any) => ({
            id: settings.id,
            provider: settings.provider,
            apiKey: settings.apiKey,
            endpoint: settings.endpoint,
            model: settings.model,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            systemPrompt: settings.systemPrompt,
            userId,
          })),
        });
      }

      // Re-create Notifications
      if (notifications.length > 0) {
        await tx.notification.createMany({
          data: notifications.map((notif: any) => ({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            isRead: notif.isRead,
            userId,
            createdAt: new Date(notif.createdAt),
          })),
        });
      }

      // Re-create Course Subjects
      if (subjects.length > 0) {
        await tx.subject.createMany({
          data: subjects.map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            color: sub.color,
            userId,
            createdAt: new Date(sub.createdAt),
          })),
        });
      }

      // Re-create Folders (Pass 1: Insert without parentId to satisfy constraints)
      if (folders.length > 0) {
        await tx.folder.createMany({
          data: folders.map((fold: any) => ({
            id: fold.id,
            name: fold.name,
            parentId: null,
            userId,
            createdAt: new Date(fold.createdAt),
          })),
        });
      }

      // Re-create Tags
      if (tags.length > 0) {
        await tx.tag.createMany({
          data: tags.map((t: any) => ({
            id: t.id,
            name: t.name,
            color: t.color,
            userId,
            createdAt: new Date(t.createdAt),
          })),
        });
      }

      // Re-create Projects
      if (projects.length > 0) {
        await tx.project.createMany({
          data: projects.map((proj: any) => ({
            id: proj.id,
            name: proj.name,
            description: proj.description,
            githubUrl: proj.githubUrl,
            progress: proj.progress,
            userId,
            createdAt: new Date(proj.createdAt),
          })),
        });
      }

      // Re-create Habits & Logs
      if (habits.length > 0) {
        await tx.habit.createMany({
          data: habits.map((h: any) => ({
            id: h.id,
            name: h.name,
            icon: h.icon,
            frequency: h.frequency,
            target: h.target,
            userId,
            createdAt: new Date(h.createdAt),
          })),
        });

        const allHabitLogs = habits.flatMap((h: any) =>
          (h.logs || []).map((log: any) => ({
            id: log.id,
            habitId: h.id,
            completedAt: new Date(log.completedAt),
            value: log.value,
            createdAt: new Date(log.createdAt),
          }))
        );

        if (allHabitLogs.length > 0) {
          await tx.habitLog.createMany({
            data: allHabitLogs,
          });
        }
      }

      // Re-create Assignments
      if (assignments.length > 0) {
        await tx.assignment.createMany({
          data: assignments.map((ass: any) => ({
            id: ass.id,
            title: ass.title,
            description: ass.description,
            priority: ass.priority,
            status: ass.status,
            deadline: new Date(ass.deadline),
            subjectId: ass.subjectId,
            userId,
            createdAt: new Date(ass.createdAt),
          })),
        });
      }

      // Re-create Events
      if (events.length > 0) {
        await tx.event.createMany({
          data: events.map((ev: any) => ({
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
          })),
        });
      }

      // Re-create Resources
      if (resources.length > 0) {
        await tx.resource.createMany({
          data: resources.map((r: any) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            url: r.url,
            subjectId: r.subjectId,
            userId,
            createdAt: new Date(r.createdAt),
          })),
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
      if (attachments.length > 0) {
        await tx.attachment.createMany({
          data: attachments.map((att: any) => ({
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
          })),
        });
      }

      // Re-create Tasks (Pass 1: Insert setting parentId to null to prevent self-reference block)
      if (tasks.length > 0) {
        await tx.task.createMany({
          data: tasks.map((task: any) => ({
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
          })),
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
