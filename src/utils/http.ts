import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError.js';
import type { Actor } from '../types/domain.js';

/** Adapta un controller async al sobre REST estándar.
 * @param handler - Valor tipado de handler utilizado por esta operación.
 * @param status - Valor tipado de status utilizado por esta operación.
 * @returns `RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>`, según el contrato de la operación.
 */
export function endpoint(
  handler: (request: Request) => Promise<unknown>,
  status = 200,
): RequestHandler {
  return async (request, response) => {
    response.status(status).json({ data: await handler(request) });
  };
}
/** Extrae actor autenticado. @throws AppError 401 si falta sesión.
 * @param request - Valor tipado de request utilizado por esta operación.
 * @returns `Actor`, según el contrato de la operación.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export function actor(request: Request): Actor {
  if (!request.actor) throw new AppError(401, 'UNAUTHORIZED', 'Iniciá sesión para continuar.');
  return request.actor;
}
/** Valida un identificador decimal positivo sin perder precisión BIGINT.
 * @param request - Valor tipado de request utilizado por esta operación.
 * @param name - Valor tipado de name utilizado por esta operación.
 * @returns `string`, según el contrato de la operación.
 */
export function paramId(request: Request, name = 'id'): string {
  return z
    .string()
    .regex(/^[1-9]\d{0,18}$/u)
    .parse(request.params[name]);
}
