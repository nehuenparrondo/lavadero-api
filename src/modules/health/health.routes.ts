import { Router } from 'express';
import { createReadiness, getHealth } from './health.controller.js';

/** Expone sondas públicas sin incluir datos sensibles. */
export function createHealthRoutes(check: () => Promise<void>) {
  const router = Router();
  router.get('/health', getHealth);
  router.get('/ready', createReadiness(check));
  return router;
}
