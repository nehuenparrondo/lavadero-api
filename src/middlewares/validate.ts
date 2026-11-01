import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/** Valida y elimina campos no admitidos antes de llegar al controller.
 * @param schema - Valor tipado de schema utilizado por esta operación.
 * @returns `RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>`, según el contrato de la operación.
 */
export function validate(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    request.body = schema.parse(request.body);
    next();
  };
}
