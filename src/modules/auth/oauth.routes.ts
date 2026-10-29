import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../../middlewares/validate.js';
import { endpoint } from '../../utils/http.js';
import * as c from './oauth.controller.js';
import { oauthExchangeSchema } from './oauth.schema.js';
/** Inicio, retorno y canje de códigos sociales; todos limitados por origen. */
export function createOAuthRoutes() {
  const r = Router();
  r.use(
    rateLimit({ windowMs: 600000, limit: 60, standardHeaders: true, legacyHeaders: false }),
  );
  r.get('/providers', endpoint(c.providers));
  r.get('/oauth/:provider/authorize', c.authorize);
  r.get('/oauth/:provider/callback', c.callback);
  r.post('/oauth/exchange', validate(oauthExchangeSchema), endpoint(c.exchange));
  return r;
}
