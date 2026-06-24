import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .min(1, 'Title cannot be empty')
      .max(100, 'Title must be under 100 characters'),
    description: z.string().optional().default(''),
    startAt: z.string({ required_error: 'Start time is required' }).datetime(),
    endAt: z.string({ required_error: 'End time is required' }).datetime(),
    color: z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color string')
      .optional()
      .default('#3B82F6'),
    isAllDay: z.boolean().optional().default(false),
    subjectId: z.string().nullable().optional(),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Event ID is required' }),
  }),
  body: z.object({
    title: z
      .string()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title must be under 100 characters')
      .optional(),
    description: z.string().optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    color: z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color string')
      .optional(),
    isAllDay: z.boolean().optional(),
    subjectId: z.string().nullable().optional(),
  }),
});
