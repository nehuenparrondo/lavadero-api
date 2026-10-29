import type { Request } from 'express';
import type { z } from 'zod';
import * as service from './auth.service.js';
import * as sessions from './session.service.js';
import type { registerSchema, loginSchema, refreshSchema } from './auth.schema.js';
import { presentSession } from './auth.types.js';

/** Registra cuenta pública sin permisos elegibles. */
export function register(request: Request) {
  return service.register(request.body as z.infer<typeof registerSchema>).then(presentSession);
}
/** Inicia sesión email/contraseña. */
export function login(request: Request) {
  return service.login(request.body as z.infer<typeof loginSchema>).then(presentSession);
}
/** Renueva sesión mediante rotación de refresh. */
export function refresh(request: Request) {
  return sessions
    .refreshSession((request.body as z.infer<typeof refreshSchema>).refreshToken)
    .then(presentSession);
}
/** Revoca la sesión del dispositivo. */
export function logout(request: Request) {
  return sessions.logoutSession((request.body as z.infer<typeof refreshSchema>).refreshToken);
}
