import { randomUUID } from 'node:crypto';
import { AppError } from '../../errors/AppError.js';
import type { Executor } from '../../utils/db.js';
import { transaction } from '../../utils/transaction.js';
import { findUser } from '../users/users.repository.js';
import type { Identity } from '../users/users.types.js';
import { publicUser } from '../users/users.types.js';
import * as repository from './session.repository.js';
import { opaqueToken, signAccess, tokenHash } from './token.service.js';

/** Crea JWT propio y refresh opaco asociado. El caller garantiza cuenta activa.
 * @param identity - Valor tipado de identity utilizado por esta operación.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @param familyId - Familia de sesión que agrupa sus renovaciones.
 * @returns `Promise<{ user: import("../../types/domain.js").User; accessToken: string; refreshToken: string; expiresIn: number; sessionId: string; }>`, según el contrato de la operación.
 */
export async function createSession(
  identity: Identity,
  executor?: Executor,
  familyId: string = randomUUID(),
) {
  const user = publicUser(identity);
  const accessToken = await signAccess(user, familyId);
  const refreshToken = opaqueToken();
  const sessionId = await repository.insertSession(
    user.id,
    tokenHash(refreshToken),
    familyId,
    executor,
  );
  return { user, accessToken, refreshToken, expiresIn: 900, sessionId };
}
/** Rota refresh atómicamente. La revocación por reuso se confirma antes de devolver 401.
 * @param token - Token recibido; se valida o transforma antes de utilizarlo.
 * @returns `Promise<{ user: import("../../types/domain.js").User; accessToken: string; refreshToken: string; expiresIn: number; sessionId: string; }>`, según el contrato de la operación.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export async function refreshSession(token: string) {
  const result = await transaction(async (connection) => {
    const current = await repository.lockSession(tokenHash(token), connection);
    if (!current) return null;
    if (current.revokedAt || new Date(current.expiresAt + 'Z').getTime() <= Date.now()) {
      await repository.revokeFamily(current.familyId, connection);
      return null;
    }
    const identity = await findUser(current.userId, connection);
    if (!identity || !identity.isActive || identity.deletedAt) {
      await repository.revokeFamily(current.familyId, connection);
      return null;
    }
    const next = await createSession(identity, connection, current.familyId);
    await repository.rotateSession(current.id, next.sessionId, connection);
    return next;
  });
  if (!result)
    throw new AppError(401, 'INVALID_REFRESH', 'La sesión ya no es válida. Iniciá sesión.');
  return result;
}
/** Revoca la familia del dispositivo; logout repetido es idempotente.
 * @param token - Token recibido; se valida o transforma antes de utilizarlo.
 * @returns `Promise<{ loggedOut: boolean; }>`, según el contrato de la operación.
 */
export async function logoutSession(token: string) {
  await transaction(async (connection) => {
    const current = await repository.lockSession(tokenHash(token), connection);
    if (current) await repository.revokeFamily(current.familyId, connection);
  });
  return { loggedOut: true };
}
