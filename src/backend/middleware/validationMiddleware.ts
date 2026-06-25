/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateRequest(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }
      res.status(400).json({ error: 'Invalid request payload' });
    }
  };
}

// Security sanitizer middleware to prevent HTML/Script injection in body parameters
export function sanitizePayload(req: Request, res: Response, next: NextFunction): void {
  const sanitize = (val: any): any => {
    if (typeof val === 'string') {
      // Basic HTML tag stripping
      return val
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // Remove script blocks
        .replace(/<\/?[^>]+(>|$)/g, '') // Strip standard HTML tags
        .trim();
    }
    if (Array.isArray(val)) {
      return val.map(sanitize);
    }
    if (typeof val === 'object' && val !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(val)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return val;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  next();
}
