import { rows, execute } from '../../utils/db.js';
import type { Executor } from '../../utils/db.js';
import type { OAuthState, Provider } from './oauth.types.js';
import type { RowDataPacket } from 'mysql2/promise';
/** Persiste estado opaco con vencimiento corto. */
export async function saveState(
  hash: Buffer,
  v: {
    provider: Provider;
    clientState: string;
    redirectUri: string;
    clientChallenge: string;
    providerVerifier: string;
  },
) {
  await execute('DELETE FROM oauth_states WHERE expires_at<UTC_TIMESTAMP(3)');
  await execute(
    `INSERT INTO oauth_states(state_hash,provider,client_state,redirect_uri,client_challenge,provider_verifier,expires_at)
 VALUES(?,?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 10 MINUTE))`,
    [hash, v.provider, v.clientState, v.redirectUri, v.clientChallenge, v.providerVerifier],
  );
}
/** Bloquea/consume estado una vez antes de contactar al proveedor. */
export async function takeState(hash: Buffer, executor: Executor) {
  const state = (
    await rows<OAuthState>(
      `SELECT provider,client_state clientState,redirect_uri redirectUri,client_challenge clientChallenge,
 provider_verifier providerVerifier FROM oauth_states WHERE state_hash=? AND expires_at>UTC_TIMESTAMP(3) FOR UPDATE`,
      [hash],
      executor,
    )
  )[0];
  if (state) await execute('DELETE FROM oauth_states WHERE state_hash=?', [hash], executor);
  return state;
}
/** Busca identidad externa por sujeto estable del proveedor. */
export async function findSocial(provider: Provider, subject: string, executor: Executor) {
  return (
    await rows<RowDataPacket>(
      'SELECT CAST(user_id AS CHAR) userId FROM social_accounts WHERE provider=? AND provider_subject=?',
      [provider, subject],
      executor,
    )
  )[0];
}
/** Vincula email verificado a la identidad ya existente. */
export function linkSocial(
  id: string,
  provider: Provider,
  subject: string,
  executor: Executor,
) {
  return execute(
    'INSERT INTO social_accounts(user_id,provider,provider_subject) VALUES(?,?,?)',
    [id, provider, subject],
    executor,
  );
}
/** Código de retorno efímero con hash; no persiste el código legible. */
export function saveGrant(hash: Buffer, id: string, challenge: string, executor: Executor) {
  return execute(
    `INSERT INTO oauth_grants(code_hash,user_id,code_challenge,expires_at)
 VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 60 SECOND))`,
    [hash, id, challenge],
    executor,
  );
}
/** Bloquea código para validación PKCE antes de consumirlo. */
export async function lockGrant(hash: Buffer, executor: Executor) {
  return (
    await rows<RowDataPacket>(
      `SELECT CAST(user_id AS CHAR) userId,code_challenge codeChallenge
 FROM oauth_grants WHERE code_hash=? AND consumed_at IS NULL AND expires_at>UTC_TIMESTAMP(3) FOR UPDATE`,
      [hash],
      executor,
    )
  )[0];
}
/** Consume grant luego de validar el verifier. */
export function consumeGrant(hash: Buffer, executor: Executor) {
  return execute(
    'UPDATE oauth_grants SET consumed_at=UTC_TIMESTAMP(3) WHERE code_hash=?',
    [hash],
    executor,
  );
}
