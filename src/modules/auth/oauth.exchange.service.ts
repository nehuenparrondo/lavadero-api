import type { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import type { Executor } from '../../utils/db.js';
import { comparePassword } from '../../utils/password.js';
import { transaction } from '../../utils/transaction.js';
import { findUser } from '../users/users.repository.js';
import type { Identity } from '../users/users.types.js';
import * as repo from './oauth.grants.repository.js';
import { linkSocial } from './oauth.repository.js';
import type { oauthExchangeSchema } from './oauth.schema.js';
import { assertGrantChallenge } from './pkce.js';
import { createSession } from './session.service.js';
import { tokenHash } from './token.service.js';
/** Confirma propiedad local sin confiar únicamente en la coincidencia de email. */
async function confirmLink(
  grant: repo.OAuthGrant,
  identity: Identity,
  password: string | undefined,
  hash: Buffer,
  connection: Executor,
) {
  if (!grant.linkProvider) return;
  if (grant.linkAttempts >= 5)
    return new AppError(
      401,
      'OAUTH_LINK_LOCKED',
      'Se agotaron los intentos. Volvé a iniciar el acceso social.',
    );
  if (!password)
    return new AppError(
      409,
      'OAUTH_LINK_REQUIRED',
      'Ese correo ya tiene una cuenta. Confirmá su contraseña para vincularla.',
    );
  if (!identity.passwordHash || !(await comparePassword(password, identity.passwordHash))) {
    await repo.failedLink(hash, connection);
    return new AppError(401, 'INVALID_CREDENTIALS', 'La contraseña no es correcta.');
  }
  await linkSocial(identity.id, grant.linkProvider, grant.linkSubject!, connection);
}
/** Canje PKCE y vinculación opcional; errores con intentos deben salir tras el commit.
 * @param input - Entrada validada por el esquema del caso de uso.
 * @returns `Promise<{ user: import("../../types/domain.js").User; accessToken: string; refreshToken: string; expiresIn: number; sessionId: string; }>`, según el contrato de la operación.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export async function exchange(input: z.infer<typeof oauthExchangeSchema>) {
  const result = await transaction(async (connection) => {
    const hash = tokenHash(input.code);
    const grant = await repo.lockGrant(hash, connection);
    assertGrantChallenge(grant?.codeChallenge, input.codeVerifier);
    if (!grant) throw new AppError(401, 'INVALID_OAUTH_CODE', 'El acceso social venció.');
    const identity = await findUser(String(grant.userId), connection, true);
    if (!identity || !identity.isActive || identity.deletedAt)
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Cuenta desactivada.');
    const error = await confirmLink(grant, identity, input.password, hash, connection);
    if (error) return error;
    await repo.consumeGrant(hash, connection);
    return createSession(identity, connection);
  });
  if (result instanceof AppError) throw result;
  return result;
}
