import { z } from 'zod';

export const saveAISettingSchema = z.object({
  body: z.object({
    provider: z.enum(['openai', 'gemini', 'claude', 'deepseek', 'ollama', 'lmstudio']),
    apiKey: z.string().nullable().optional(),
    endpoint: z.string().nullable().optional(),
    model: z.string().nullable().optional(),
    temperature: z.number().min(0).max(2).optional().default(0.7),
    maxTokens: z.number().int().min(1).optional().default(2048),
    systemPrompt: z.string().nullable().optional(),
  }),
});

export const sendMessageSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Conversation ID is required' }),
  }),
  body: z.object({
    content: z
      .string({ required_error: 'Message content is required' })
      .min(1, 'Message cannot be empty'),
    includeRag: z.boolean().optional().default(true),
  }),
});
