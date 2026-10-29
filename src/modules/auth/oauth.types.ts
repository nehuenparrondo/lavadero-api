import type { RowDataPacket } from 'mysql2/promise';
/** Proveedores OAuth admitidos. URLs nunca se reciben del usuario. */
export type Provider = 'google' | 'discord' | 'github';
/** Identidad obtenida directamente del proveedor, con email verificado. */
export interface SocialIdentity {
  subject: string;
  email: string;
  firstName: string;
  lastName: string;
}
/** Estado interno efímero vinculado a la solicitud AuthSession del dispositivo. */
export interface OAuthState extends RowDataPacket {
  provider: Provider;
  clientState: string;
  redirectUri: string;
  clientChallenge: string;
  providerVerifier: string;
}
