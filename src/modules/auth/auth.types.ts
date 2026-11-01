import type { createSession } from './session.service.js';

/** Devuelve solo el contrato de sesión; el ID interno de rotación no se publica.
 * @param session - Valor tipado de session utilizado por esta operación.
 * @returns `{ user: import("../../types/domain.js").User; accessToken: string; refreshToken: string; expiresIn: number; }`, según el contrato de la operación.
 */
export function presentSession(session: Awaited<ReturnType<typeof createSession>>) {
  return {
    user: session.user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresIn: session.expiresIn,
  };
}
