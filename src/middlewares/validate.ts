import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/** Valida y elimina campos no admitidos antes de llegar al controller. */
export function validate(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    request.body = schema.parse(request.body);
    next();
  };
}
