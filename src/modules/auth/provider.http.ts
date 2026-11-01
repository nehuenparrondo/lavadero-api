import { AppError } from '../../errors/AppError.js';
/** Consulta HTTP al proveedor con timeout; solo acepta respuesta JSON exitosa.
 * @param url - Valor tipado de url utilizado por esta operación.
 * @param init - Valor tipado de init utilizado por esta operación.
 * @returns `Promise<Record<string, unknown>>`, según el contrato de la operación.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export async function fetchJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  if (!response.ok)
    throw new AppError(
      401,
      'OAUTH_PROVIDER_ERROR',
      'El proveedor no pudo completar el acceso.',
    );
  return (await response.json()) as Record<string, unknown>;
}
