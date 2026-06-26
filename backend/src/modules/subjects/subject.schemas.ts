import { z } from 'zod';

export const createSubjectSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Subject name is required' })
      .min(2, 'Subject name must be at least 2 characters')
      .max(50, 'Subject name must be under 50 characters'),
    color: z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color string')
      .optional()
      .default('#8B5CF6'),
    semester: z.string().nullable().optional(),
  }),
});

export const updateSubjectSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Subject ID is required' }),
  }),
  body: z.object({
    name: z
      .string()
      .min(2, 'Subject name must be at least 2 characters')
      .max(50, 'Subject name must be under 50 characters')
      .optional(),
    color: z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color string')
      .optional(),
    semester: z.string().nullable().optional(),
  }),
});
