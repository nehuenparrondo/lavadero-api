import { AppError } from './AppError.js';

/** Representa un error 404 controlado por el dominio. */
export class NotFoundError extends AppError {
  /** Permite aportar contexto público sin exponer datos internos. */
  constructor(message = 'No se encontró el recurso.') {
    super(404, 'NOT_FOUND', message);
  }
}
