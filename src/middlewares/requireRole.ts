import type { RequestHandler } from 'express';
import type { Role } from '../types/domain.js';
import { ForbiddenError } from '../errors/ForbiddenError.js';

/** Restringe una ruta a roles vigentes, después de authenticate. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.actor || !roles.includes(request.actor.role)) throw new ForbiddenError();
    next();
  };
}
