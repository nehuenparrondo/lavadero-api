import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp({ origins: ['https://app.example.com'], checkDatabase: async () => {} });
test('liveness no expone infraestructura ni credenciales', async () => {
  const result = await request(app).get('/health').expect(200);
  assert.deepEqual(result.body, { status: 'ok', service: 'lavadero-api', version: '0.1.0' });
  assert.equal(result.headers['x-powered-by'], undefined);
});
test('readiness propaga caída MySQL como 503', async () => {
  const down = createApp({
    origins: [],
    checkDatabase: async () => {
      throw new Error('secret');
    },
  });
  const result = await request(down).get('/ready').expect(503);
  assert.deepEqual(result.body, { status: 'not_ready', database: 'down' });
});
test('readiness responde 200 si MySQL está disponible', async () => {
  await request(app).get('/ready').expect(200);
});
test('CORS rechaza un origen ajeno y acepta el origen configurado', async () => {
  await request(app).get('/health').set('Origin', 'https://evil.example').expect(403);
  const result = await request(app).get('/health').set('Origin', 'https://app.example.com');
  assert.equal(result.headers['access-control-allow-origin'], 'https://app.example.com');
});
test('recursos desconocidos responden un error uniforme', async () => {
  const result = await request(app).get('/api/v1/users').expect(404);
  assert.equal(result.body.error.code, 'NOT_FOUND');
});
test('Swagger y su contrato son accesibles sin app móvil', async () => {
  await request(app).get('/api/docs/').expect(200);
  const result = await request(app).get('/api/openapi.json').expect(200);
  assert.equal(result.body.openapi, '3.0.3');
});
test('JSON mal formado devuelve 400', async () => {
  await request(app)
    .post('/api/v1')
    .set('Content-Type', 'application/json')
    .send('{')
    .expect(400);
});
