import type { Request, Response } from 'express';
import { z } from 'zod';
import * as service from './oauth.service.js';
import { providerSchema, authorizeSchema, oauthExchangeSchema } from './oauth.schema.js';
import { presentSession } from './auth.types.js';
/** Disponibilidad de botones sociales. */
export async function providers() {
  return service.listProviders();
}
/** Inicio OAuth con state/PKCE validado. */
export async function authorize(r: Request, s: Response) {
  s.redirect(
    await service.authorize(
      providerSchema.parse(r.params.provider),
      authorizeSchema.parse(r.query),
    ),
  );
}
/** Callback HTTPS validado, después redirección allowlisted al cliente. */
export async function callback(r: Request, s: Response) {
  const input = z
    .object({
      state: z.string().min(16).max(256),
      code: z.string().max(2048).optional(),
      error: z.string().max(256).optional(),
    })
    .parse(r.query);
  s.redirect(await service.callback(providerSchema.parse(r.params.provider), input));
}
/** Canje final de grant y verifier por sesión propia. */
export function exchange(r: Request) {
  return service.exchange(r.body as z.infer<typeof oauthExchangeSchema>).then(presentSession);
}
