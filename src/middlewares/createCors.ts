import cors from 'cors';
import { AppError } from '../errors/AppError.js';

/** Permite orígenes web exactos y apps nativas, que no envían cabecera Origin. */
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
