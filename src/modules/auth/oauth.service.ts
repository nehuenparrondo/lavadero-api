import { createHash, timingSafeEqual } from 'node:crypto';
import type { z } from 'zod';
import { authEnv } from '../../config/authEnv.js';
import { getProvider, providerAvailability } from '../../config/oauth.js';
import { transaction } from '../../utils/transaction.js';
import { AppError } from '../../errors/AppError.js';
import { findByEmail, findUser, insertUser } from '../users/users.repository.js';
import { createSession } from './session.service.js';
import { opaqueToken, tokenHash } from './token.service.js';
import * as repo from './oauth.repository.js';
import { exchangeProvider } from './provider.service.js';
import type { Provider, SocialIdentity, OAuthState } from './oauth.types.js';
import type { authorizeSchema, oauthExchangeSchema } from './oauth.schema.js';
/** PKCE SHA-256 base64url, compatible con AuthSession. */
export function pkceChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}
/** Metadatos públicos, solo habilitado/deshabilitado por proveedor. */
export function listProviders() {
  return providerAvailability();
}
/** Prepara redirección al proveedor y vincula state/redirect/client PKCE de la app. */
export async function authorize(provider: Provider, input: z.infer<typeof authorizeSchema>) {
  if (
    !authEnv.OAUTH_REDIRECT_URIS.split(',')
      .map((v) => v.trim())
      .includes(input.redirect_uri)
  )
    throw new AppError(400, 'INVALID_REDIRECT', 'La redirección móvil no está autorizada.');
  const config = getProvider(provider);
  const state = opaqueToken();
  const verifier = opaqueToken();
  await repo.saveState(tokenHash(state), {
    provider,
    clientState: input.state,
    redirectUri: input.redirect_uri,
    clientChallenge: input.code_challenge,
    providerVerifier: verifier,
  });
  const url = new URL(config.authorize);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callback,
    response_type: 'code',
    scope: config.scope,
    state,
  }).toString();
  if (config.pkce) {
    url.searchParams.set('code_challenge', pkceChallenge(verifier));
    url.searchParams.set('code_challenge_method', 'S256');
  }
  return url.toString();
}
/** Encuentra o vincula una identidad verificada; usuarios nuevos siempre Cliente. */
async function issueGrant(provider: Provider, profile: SocialIdentity, state: OAuthState) {
  return transaction(async (connection) => {
    const social = await repo.findSocial(provider, profile.subject, connection);
    let identity = social
      ? await findUser(String(social.userId), connection)
      : await findByEmail(profile.email, connection);
    if (!identity) {
      const id = await insertUser(
        {
          ...profile,
          firstName: profile.firstName.slice(0, 80),
          lastName: profile.lastName.slice(0, 80),
        },
        null,
        'client',
        connection,
      );
      identity = await findUser(id, connection);
    }
    if (!identity || !identity.isActive || identity.deletedAt)
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Esta cuenta no está activa.');
    if (!social)
      await repo.linkSocial(String(identity.id), provider, profile.subject, connection);
    const code = opaqueToken();
    await repo.saveGrant(
      tokenHash(code),
      String(identity.id),
      state.clientChallenge,
      connection,
    );
    const url = new URL(state.redirectUri);
    url.searchParams.set('code', code);
    url.searchParams.set('state', state.clientState);
    return url.toString();
  });
}
/** Consume callback del proveedor y entrega solamente código efímero al deep link. */
export async function callback(
  provider: Provider,
  input: { state: string; code?: string | undefined; error?: string | undefined },
) {
  const state = await transaction((connection) =>
    repo.takeState(tokenHash(input.state), connection),
  );
  if (!state || state.provider !== provider)
    throw new AppError(
      400,
      'INVALID_OAUTH_STATE',
      'La solicitud social venció o ya se utilizó.',
    );
  if (input.error || !input.code) {
    const url = new URL(state.redirectUri);
    url.searchParams.set('error', 'access_denied');
    url.searchParams.set('state', state.clientState);
    return url.toString();
  }
  return issueGrant(
    provider,
    await exchangeProvider(provider, input.code, state.providerVerifier),
    state,
  );
}
/** Intercambia grant con verifier; rechaza reuso y nunca devuelve JWT en una URL. */
export async function exchange(input: z.infer<typeof oauthExchangeSchema>) {
  return transaction(async (connection) => {
    const grant = await repo.lockGrant(tokenHash(input.code), connection);
    const actual = Buffer.from(pkceChallenge(input.codeVerifier));
    const expected = Buffer.from(String(grant?.codeChallenge ?? ''));
    if (!grant || actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new AppError(
        401,
        'INVALID_OAUTH_CODE',
        'El acceso social venció o no corresponde a este dispositivo.',
      );
    const identity = await findUser(String(grant.userId), connection);
    if (!identity || !identity.isActive || identity.deletedAt)
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Cuenta desactivada.');
    await repo.consumeGrant(tokenHash(input.code), connection);
    return createSession(identity, connection);
  });
}
