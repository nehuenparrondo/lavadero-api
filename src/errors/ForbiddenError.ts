import { AppError } from './AppError.js';

/** Representa un error 403 controlado por el dominio. */
export class ForbiddenError extends AppError {
  /** Permite aportar contexto público sin exponer datos internos. */
  constructor(message = 'No tenés permiso para esta acción.') {
    super(403, 'FORBIDDEN', message);
  }
}
