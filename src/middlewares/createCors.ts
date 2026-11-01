import cors from 'cors';
import { AppError } from '../errors/AppError.js';

/** Permite orígenes web exactos y apps nativas, que no envían cabecera Origin.
 * @param origins - Valor tipado de origins utilizado por esta operación.
 * @returns `(req: cors.CorsRequest, res: { statusCode?: number | undefined; setHeader(key: string, value: string): any; end(): any; }, next: (err?: any) => any) => void`, según el contrato de la operación.
 */
export function createCors(origins: readonly string[]) {
  return cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Origen web no autorizado.'));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
}
