import express from 'express';
import './config/validation.js';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
import { createCors } from './middlewares/createCors.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from './errors/NotFoundError.js';
import { createHealthRoutes } from './modules/health/health.routes.js';
import { createApiRoutes } from './routes.js';
import { createInformationRoutes } from './modules/health/information.routes.js';

/** Dependencias de infraestructura que no contienen lógica de negocio. */
interface AppOptions {
  origins: readonly string[];
  checkDatabase: () => Promise<void>;
}

/** Compone Express. No abre puertos ni conecta MySQL al importarse. */
export function createApp(options: AppOptions) {
  const app = express();
  const contract = JSON.parse(readFileSync('docs/openapi.json', 'utf8')) as Record<
    string,
    unknown
  >;
  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet(), createCors(options.origins), express.json({ limit: '32kb' }));
  app.use(createHealthRoutes(options.checkDatabase));
  app.use(createInformationRoutes());
  app.get('/api/v1', (_request, response) => response.json({ version: 'v1', stage: 10 }));
  app.use('/api/v1', createApiRoutes());
  app.get('/api/openapi.json', (_request, response) => response.json(contract));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(contract));
  app.use((_request, _response, next) => next(new NotFoundError()));
  app.use(errorHandler);
  return app;
}
