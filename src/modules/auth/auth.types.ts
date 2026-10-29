import type { createSession } from './session.service.js';

/** Devuelve solo el contrato de sesión; el ID interno de rotación no se publica. */
export function presentSession(session: Awaited<ReturnType<typeof createSession>>) {
  return {
    user: session.user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresIn: session.expiresIn,
  };
}
