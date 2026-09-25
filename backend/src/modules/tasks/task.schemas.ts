import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Task title is required' })
      .min(1, 'Task title cannot be empty')
      .max(100, 'Task title must be under 100 characters'),
    status: z.enum(['TODO', 'IN_PROGRESS', 'TESTING', 'DONE']).optional().default('TODO'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
    date: z.string().datetime().nullable().optional(),
    timeSlot: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']).optional().default('AFTERNOON'),
    projectId: z.string().nullable().optional(),
    assignmentId: z.string().nullable().optional(),
    subjectId: z.string().nullable().optional(),
    parentId: z.string().nullable().optional(),
    columnId: z.string().optional(),
    estimatedMinutes: z.number().int().min(1).max(720).optional().default(30),
    actualMinutes: z.number().int().min(0).optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Task ID is required' }),
  }),
  body: z.object({
    title: z
      .string()
      .min(1, 'Task title cannot be empty')
      .max(100, 'Task title must be under 100 characters')
      .optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'TESTING', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    date: z.string().datetime().nullable().optional(),
    timeSlot: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']).optional(),
    projectId: z.string().nullable().optional(),
    assignmentId: z.string().nullable().optional(),
    subjectId: z.string().nullable().optional(),
    parentId: z.string().nullable().optional(),
    order: z.number().int().optional(),
    columnId: z.string().optional(),
    estimatedMinutes: z.number().int().min(1).max(720).optional(),
    actualMinutes: z.number().int().min(0).optional(),
  }),
});

export const focusCompleteSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Task ID is required' }),
  }),
  body: z.object({
    actualMinutes: z.number().int().min(1).max(720),
    status: z.enum(['TODO', 'IN_PROGRESS', 'TESTING', 'DONE']).optional().default('DONE'),
  }),
});

export const rescheduleTaskSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Task ID is required' }),
  }),
  body: z.object({
    date: z.string(),
    timeSlot: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']).optional(),
  }),
});
