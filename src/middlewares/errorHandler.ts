import type { ErrorRequestHandler } from 'express';
import { publicError } from '../errors/publicError.js';
/** Único punto de respuesta de errores; conserva el contrato uniforme de la API.
 * @param error - Valor tipado de error utilizado por esta operación.
 * @param _request - Petición del middleware; el error público no depende de su contenido.
 * @param response - Respuesta HTTP donde se escribe el contrato uniforme de error.
 * @param _next - Callback de Express; este manejador termina la respuesta de error.
 * @returns `void`, según el contrato de la operación.
 */
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  const result = publicError(error);
  response.status(result.status).json({ error: result.error });
};
