import type { RequestHandler } from 'express';

/** Devuelve salud del proceso sin depender de MySQL. */
export const getHealth: RequestHandler = (_request, response) => {
  response.json({ status: 'ok', service: 'lavadero-api', version: '1.0.0' });
};

/** Construye readiness con dependencia inyectada para verificar fallos reales en tests. */
export function createReadiness(check: () => Promise<void>): RequestHandler {
  return async (_request, response) => {
    try {
      await check();
      response.json({ status: 'ready', database: 'up' });
    } catch {
      response.status(503).json({ status: 'not_ready', database: 'down' });
    }
  };
}
