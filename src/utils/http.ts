import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import type { Actor } from '../types/domain.js';
import { AppError } from '../errors/AppError.js';

/** Adapta un controller async al sobre REST estándar. */
export function endpoint(
  handler: (request: Request) => Promise<unknown>,
  status = 200,
): RequestHandler {
  return async (request, response) => {
    response.status(status).json({ data: await handler(request) });
  };
}
/** Extrae actor autenticado. @throws AppError 401 si falta sesión. */
export function actor(request: Request): Actor {
  if (!request.actor) throw new AppError(401, 'UNAUTHORIZED', 'Iniciá sesión para continuar.');
  return request.actor;
}
/** Valida un identificador decimal positivo sin perder precisión BIGINT. */
export function paramId(request: Request, name = 'id'): string {
  return z
    .string()
    .regex(/^[1-9]\d{0,18}$/u)
    .parse(request.params[name]);
}
