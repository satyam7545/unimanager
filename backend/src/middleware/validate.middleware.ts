import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // Assign parsed data back to req to ensure type-safe properties in controllers
      let targetSchema: any = schema;
      while (targetSchema && '_def' in targetSchema) {
        if (targetSchema._def.typeName === 'ZodEffects') {
          targetSchema = targetSchema._def.schema;
        } else {
          break;
        }
      }

      if (targetSchema && targetSchema.shape) {
        if ('body' in targetSchema.shape) {
          req.body = parsed.body;
        }
        if ('query' in targetSchema.shape) {
          req.query = parsed.query;
        }
        if ('params' in targetSchema.shape) {
          req.params = parsed.params;
        }
      } else {
        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) req.query = parsed.query;
        if (parsed.params !== undefined) req.params = parsed.params;
      }
      
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: 'fail',
          message: 'Validation failed',
          errors: error.errors.map((err) => ({
            field: err.path.slice(1).join('.'),
            message: err.message,
          })),
        });
        return;
      }
      return next(error);
    }
  };
};
