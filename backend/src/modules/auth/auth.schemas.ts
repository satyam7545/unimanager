import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters long'),
    name: z
      .string({ required_error: 'Name is required' })
      .min(2, 'Name must be at least 2 characters long'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' }),
  }),
});

export const refreshSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({ required_error: 'Refresh token cookie is required' }),
  }).optional(), // handled manually in cookie parsers, but nice for Zod reference
});
