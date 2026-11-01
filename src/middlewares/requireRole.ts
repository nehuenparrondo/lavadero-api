import type { RequestHandler } from 'express';
import { ForbiddenError } from '../errors/ForbiddenError.js';
import type { Role } from '../types/domain.js';

/** Restringe una ruta a roles vigentes, después de authenticate.
 * @param roles - Valor tipado de roles utilizado por esta operación.
 * @returns `RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>`, según el contrato de la operación.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.actor || !roles.includes(request.actor.role)) throw new ForbiddenError();
    next();
  };
}
