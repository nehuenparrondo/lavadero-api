import { Router } from 'express';
import { createReadiness, getHealth } from './health.controller.js';

/** Expone sondas públicas sin incluir datos sensibles.
 * @param check - Valor tipado de check utilizado por esta operación.
 * @returns `import("express-serve-static-core").Router`, según el contrato de la operación.
 */
export function createHealthRoutes(check: () => Promise<void>) {
  const router = Router();
  router.get('/health', getHealth);
  router.get('/ready', createReadiness(check));
  return router;
}
