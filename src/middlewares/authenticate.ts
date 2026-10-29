import type { RequestHandler } from 'express';
import { verifyAccess } from '../modules/auth/token.service.js';
import { findUser } from '../modules/users/users.repository.js';
import { AppError } from '../errors/AppError.js';
import { isFamilyActive } from '../modules/auth/session.repository.js';

/** Verifica JWT y permisos actuales; desactivar o cambiar rol invalida inmediatamente el access. */
export const authenticate: RequestHandler = async (request, _response, next) => {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer '))
    throw new AppError(401, 'UNAUTHORIZED', 'Iniciá sesión para continuar.');
  const token = await verifyAccess(header.slice(7));
  const user = token.sub ? await findUser(token.sub) : undefined;
  if (
    !user ||
    !user.isActive ||
    user.deletedAt ||
    token.version !== user.authVersion ||
    token.role !== user.role
  ) {
    throw new AppError(401, 'SESSION_REVOKED', 'La sesión fue revocada. Volvé a ingresar.');
  }
  if (
    typeof token.family !== 'string' ||
    !(await isFamilyActive(String(user.id), token.family))
  )
    throw new AppError(401, 'SESSION_REVOKED', 'La sesión fue cerrada. Volvé a ingresar.');
  request.actor = {
    id: String(user.id),
    role: user.role,
    authVersion: user.authVersion,
    canRecordPayments: Boolean(user.canRecordPayments),
  };
  next();
};
