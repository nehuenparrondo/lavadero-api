import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';

/** Centraliza errores; jamás devuelve SQL, trazas ni credenciales al cliente. */
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
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
  response
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Error del servidor.' } });
};
