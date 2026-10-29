import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
/** Convierte errores en contrato público, sin SQL, secretos ni trazas. */
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Revisá los campos indicados.',
        fields: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if (error instanceof AppError) {
    response
      .status(error.status)
      .json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response
      .status(400)
      .json({ error: { code: 'INVALID_JSON', message: 'El JSON es inválido.' } });
    return;
  }
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (code === 'ER_DUP_ENTRY') {
    response.status(409).json({
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'Ya existe un registro con esos datos.',
      },
    });
    return;
  }
  if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_ROW_IS_REFERENCED_2') {
    response.status(409).json({
      error: {
        code: 'RELATED_RESOURCE',
        message: 'Revisá los registros asociados a esta operación.',
      },
    });
    return;
  }
  if (code === 'ER_LOCK_DEADLOCK' || code === 'ER_LOCK_WAIT_TIMEOUT') {
    response.status(409).json({
      error: {
        code: 'CONCURRENT_UPDATE',
        message: 'Otra operación modificó estos datos. Volvé a intentar.',
      },
    });
    return;
  }
  console.error('Error interno', code ?? (error instanceof Error ? error.name : 'UNKNOWN'));
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error del servidor. Intentá nuevamente.' },
  });
};
