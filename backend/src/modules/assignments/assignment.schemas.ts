import { z } from 'zod';

export const createAssignmentSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .min(1, 'Title cannot be empty')
      .max(100, 'Title must be under 100 characters'),
    description: z.string().optional().default(''),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional().default('PENDING'),
    deadline: z.string({ required_error: 'Deadline is required' }).datetime('Invalid date format'),
    subjectId: z.string().nullable().optional(),
  }),
});

export const updateAssignmentSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Assignment ID is required' }),
  }),
  body: z.object({
    title: z
      .string()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title must be under 100 characters')
      .optional(),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
    deadline: z.string().datetime('Invalid date format').optional(),
    subjectId: z.string().nullable().optional(),
  }),
});
