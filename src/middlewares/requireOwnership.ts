import type { Request, RequestHandler } from 'express';
import { actor } from '../utils/http.js';
import { NotFoundError } from '../errors/NotFoundError.js';

/** Restringe acceso por propietario y oculta existencia de recursos ajenos. */
export function requireOwnership(
  resolveOwner: (request: Request) => Promise<string | undefined>,
): RequestHandler {
  return async (request, _response, next) => {
    const current = actor(request);
    if (current.role !== 'admin' && (await resolveOwner(request)) !== current.id)
      throw new NotFoundError();
    next();
  };
}
