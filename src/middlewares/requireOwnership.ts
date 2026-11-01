import type { Request, RequestHandler } from 'express';
import { NotFoundError } from '../errors/NotFoundError.js';
import { actor } from '../utils/http.js';

/** Restringe acceso por propietario y oculta existencia de recursos ajenos.
 * @param resolveOwner - Valor tipado de resolveOwner utilizado por esta operación.
 * @returns `RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>`, según el contrato de la operación.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
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
