import { z } from 'zod';
import type { Provider, SocialIdentity } from './oauth.types.js';
import { getProvider } from '../../config/oauth.js';
import { AppError } from '../../errors/AppError.js';
const verifiedEmail = z.email();
/** Consulta HTTP al proveedor con timeout; solo acepta respuesta JSON exitosa. */
async function fetchJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  if (!response.ok)
    throw new AppError(
      401,
      'OAUTH_PROVIDER_ERROR',
      'El proveedor no pudo completar el acceso.',
    );
  return (await response.json()) as Record<string, unknown>;
}
/** Obtiene perfil directamente del proveedor; nunca confía en email suministrado por la app. */
async function profile(provider: Provider, token: string): Promise<SocialIdentity> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'User-Agent': 'Lavadero-App',
  };
  if (provider === 'google') {
    const p = await fetchJson('https://openidconnect.googleapis.com/v1/userinfo', { headers });
    if (p.email_verified !== true)
      throw new AppError(409, 'EMAIL_UNVERIFIED', 'El proveedor debe verificar tu email.');
    return {
      subject: z.string().parse(p.sub),
      email: verifiedEmail.parse(p.email),
      firstName: String(p.given_name ?? p.name ?? 'Cliente'),
      lastName: String(p.family_name ?? ''),
    };
  }
  if (provider === 'discord') {
    const p = await fetchJson('https://discord.com/api/v10/users/@me', { headers });
    if (p.verified !== true)
      throw new AppError(
        409,
        'EMAIL_UNVERIFIED',
        'Verificá tu email en Discord antes de continuar.',
      );
    return {
      subject: z.string().parse(p.id),
      email: verifiedEmail.parse(p.email),
      firstName: String(p.global_name ?? p.username ?? 'Cliente'),
      lastName: '',
    };
  }
  const p = await fetchJson('https://api.github.com/user', { headers });
  const response = await fetch('https://api.github.com/user/emails', {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new AppError(401, 'OAUTH_EMAIL_ERROR', 'GitHub no permitió consultar tu email.');
  const emails = z
    .array(z.object({ email: verifiedEmail, primary: z.boolean(), verified: z.boolean() }))
    .parse(await response.json());
  const email =
    emails.find((v) => v.primary && v.verified)?.email ??
    emails.find((v) => v.verified)?.email;
  if (!email)
    throw new AppError(409, 'EMAIL_UNVERIFIED', 'Agregá un email verificado en GitHub.');
  return {
    subject: String(p.id),
    email,
    firstName: String(p.name ?? p.login ?? 'Cliente'),
    lastName: '',
  };
}
/** Canjea código solo en backend con client secret y PKCE del proveedor cuando es compatible. */
export async function exchangeProvider(provider: Provider, code: string, verifier: string) {
  const config = getProvider(provider);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.callback,
  });
  if (config.pkce) body.set('code_verifier', verifier);
  const result = await fetchJson(config.token, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  return profile(provider, z.string().min(1).parse(result.access_token));
}
