import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const urlSchema = z.object({
  url: z
    .string()
    .url()
    .regex(
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
      'Must be a valid YouTube URL'
    ),
});

export function validateUrl(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const result = urlSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Invalid YouTube URL',
      details: result.error.flatten().fieldErrors,
    });
  }
  next();
}
