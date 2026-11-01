import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, client } from './support/context.js';
import { pkceChallenge } from '../src/modules/auth/oauth.service.js';
import { randomUUID } from 'node:crypto';
import { database } from '../src/config/database.js';

test('PKCE coincide con el vector de referencia RFC 7636', () => {
  assert.equal(
    pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  );
});
for (const provider of ['google', 'github', 'discord'])
  test(`OAuth ${provider}: vinculación verificada, PKCE, grant de un uso y state`, async (t) => {
    const existing = await client();
    await database!.execute('UPDATE users SET password_hash=NULL WHERE id=?', [
      existing.user.id,
    ]);
    t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      let payload: unknown;
      if (url.includes('token')) payload = { access_token: 'mock-provider-token' };
      else if (url.includes('userinfo'))
        payload = {
          sub: 'google-fixture',
          email: existing.user.email,
          email_verified: true,
          given_name: 'Social',
        };
      else if (url.includes('discord.com'))
        payload = {
          id: 'discord-fixture',
          email: existing.user.email,
          verified: true,
          username: 'Social',
        };
      else if (url.endsWith('/user/emails'))
        payload = [{ email: existing.user.email, primary: true, verified: true }];
      else payload = { id: 222, name: 'Social' };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const verifier = 'a'.repeat(64);
    const state = 'client-state-'.repeat(3);
    const start = await api('get', `/auth/oauth/${provider}/authorize`)
      .query({
        redirect_uri: 'lavadero://oauth',
        state,
        code_challenge: pkceChallenge(verifier),
        code_challenge_method: 'S256',
        response_type: 'code',
      })
      .expect(302);
    const providerState = new URL(start.headers.location!).searchParams.get('state')!;
    const callback = await api('get', `/auth/oauth/${provider}/callback`)
      .query({ state: providerState, code: 'provider-code' })
      .expect(302);
    const result = new URL(callback.headers.location!);
    assert.equal(result.searchParams.get('state'), state);
    assert.ok(!result.searchParams.has('accessToken'));
    const code = result.searchParams.get('code')!;
    await api('post', '/auth/oauth/exchange', undefined, {
      code,
      codeVerifier: 'b'.repeat(64),
    }).expect(401);
    const session = await api('post', '/auth/oauth/exchange', undefined, {
      code,
      codeVerifier: verifier,
    }).expect(200);
    assert.equal(session.body.data.user.id, existing.user.id);
    assert.equal(session.body.data.user.role, 'client');
    await api('post', '/auth/oauth/exchange', undefined, {
      code,
      codeVerifier: verifier,
    }).expect(401);
    await api('get', `/auth/oauth/${provider}/callback`)
      .query({ state: providerState, code: 'provider-code' })
      .expect(400);
  });

test('OAuth no vincula automáticamente un correo registrado con contraseña', async (t) => {
  const existing = await client();
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const payload = String(input).includes('token')
      ? { access_token: 'mock-provider-token' }
      : {
          sub: randomUUID(),
          email: existing.user.email,
          email_verified: true,
          given_name: 'Social',
        };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  const start = await api('get', '/auth/oauth/google/authorize')
    .query({
      redirect_uri: 'lavadero://oauth',
      state: randomUUID(),
      code_challenge: pkceChallenge('a'.repeat(64)),
      code_challenge_method: 'S256',
      response_type: 'code',
    })
    .expect(302);
  const state = new URL(start.headers.location!).searchParams.get('state')!;
  const result = await api('get', '/auth/oauth/google/callback')
    .query({ state, code: 'provider-code' })
    .expect(409);
  assert.equal(result.body.error.code, 'LOCAL_ACCOUNT_EXISTS');
  const [links] = await database!.query(
    'SELECT user_id FROM social_accounts WHERE user_id=?',
    [existing.user.id],
  );
  assert.deepEqual(links, []);
  await api('get', '/users/me', existing.accessToken).expect(200);
});
test('redirect arbitrario y callback state inventado no se aceptan', async () => {
  await api('get', '/auth/oauth/google/authorize')
    .query({
      redirect_uri: 'evil://return',
      state: 'x'.repeat(32),
      code_challenge: 'x'.repeat(43),
      code_challenge_method: 'S256',
      response_type: 'code',
    })
    .expect(400);
  await api('get', '/auth/oauth/google/callback')
    .query({ state: 'fake'.repeat(10), code: 'fake' })
    .expect(400);
});
