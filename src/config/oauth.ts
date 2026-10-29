import { authEnv } from './authEnv.js';
import type { Provider } from '../modules/auth/oauth.types.js';
import { AppError } from '../errors/AppError.js';
/** Metadatos de autorización y credenciales privadas de los tres proveedores. */
const providers = {
  google: {
    clientId: authEnv.GOOGLE_CLIENT_ID,
    clientSecret: authEnv.GOOGLE_CLIENT_SECRET,
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    pkce: true,
  },
  github: {
    clientId: authEnv.GITHUB_CLIENT_ID,
    clientSecret: authEnv.GITHUB_CLIENT_SECRET,
    authorize: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    pkce: true,
  },
  discord: {
    clientId: authEnv.DISCORD_CLIENT_ID,
    clientSecret: authEnv.DISCORD_CLIENT_SECRET,
    authorize: 'https://discord.com/oauth2/authorize',
    token: 'https://discord.com/api/oauth2/token',
    scope: 'identify email',
    pkce: false,
  },
} as const;
/** Indica qué botones pueden iniciar OAuth sin revelar secretos. */
export function providerAvailability() {
  return Object.entries(providers).map(([provider, v]) => ({
    provider,
    enabled: Boolean(v.clientId && v.clientSecret && authEnv.PUBLIC_API_URL),
  }));
}
/** Configuración de proveedor. @throws AppError 503 si no fue habilitado. */
export function getProvider(provider: Provider) {
  const value = providers[provider];
  if (!value.clientId || !value.clientSecret || !authEnv.PUBLIC_API_URL)
    throw new AppError(
      503,
      'OAUTH_NOT_CONFIGURED',
      'Este acceso social todavía no está habilitado.',
    );
  return {
    ...value,
    clientId: value.clientId,
    clientSecret: value.clientSecret,
    callback: `${authEnv.PUBLIC_API_URL.replace(/\/$/u, '')}/api/v1/auth/oauth/${provider}/callback`,
  };
}
