import { z } from 'zod';

export const createNoteSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Note title is required' })
      .min(1, 'Note title cannot be empty')
      .max(100, 'Note title must be under 100 characters'),
    content: z.string().default(''),
    isRichText: z.boolean().optional().default(false),
    folderId: z.string().nullable().optional(),
    subjectId: z.string().nullable().optional(),
  }),
});

export const updateNoteSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Note ID is required' }),
  }),
  body: z.object({
    title: z
      .string()
      .min(1, 'Note title cannot be empty')
      .max(100, 'Note title must be under 100 characters')
      .optional(),
    content: z.string().optional(),
    isRichText: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    isFavorite: z.boolean().optional(),
    folderId: z.string().nullable().optional(),
    subjectId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(), // Names of tags to associate
  }),
});
