import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Project name is required' })
      .min(2, 'Project name must be at least 2 characters')
      .max(100, 'Project name must be under 100 characters'),
    description: z.string().optional().default(''),
    githubUrl: z
      .string()
      .url('Please provide a valid URL')
      .optional()
      .or(z.literal(''))
      .nullable(),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Project ID is required' }),
  }),
  body: z.object({
    name: z
      .string()
      .min(2, 'Project name must be at least 2 characters')
      .max(100, 'Project name must be under 100 characters')
      .optional(),
    description: z.string().optional(),
    githubUrl: z
      .string()
      .url('Please provide a valid URL')
      .optional()
      .or(z.literal(''))
      .nullable(),
    progress: z.number().min(0).max(100).optional(),
  }),
});
