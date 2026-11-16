import {cookies, headers} from 'next/headers';
import {randomBytes} from 'node:crypto';
import {isLocalDevelopmentOrigin} from './dev-origins';
import {query, slug, transaction} from './db';
import {codeDigest, normalizeCode, sessionDigest} from './rules';

const secure = process.env.NODE_ENV === 'production';
export const cookieName = secure ? '__Host-cxc' : 'cxc';

export async function sameOrigin() {
  const expected = process.env.APP_ORIGIN;
  const request = await headers();
  const origin = request.get('origin');
  if (process.env.NODE_ENV === 'development' && origin && isLocalDevelopmentOrigin(origin,request.get('host'))) return;
  if (!expected || origin !== URL.parse(expected)?.origin) throw new Error('Origen inválido');
}

export async function rate(scope: string, subject: string, limit: number) {
  const result = await query(`INSERT INTO awards.rate_limit(scope,subject,bucket,hits)
  VALUES ($1,$2,floor(extract(epoch FROM now())/60),1)
  ON CONFLICT(scope,subject,bucket) DO UPDATE SET hits=awards.rate_limit.hits+1
  WHERE awards.rate_limit.hits < $3 RETURNING hits`, [scope,subject,limit]);
  return result.rowCount === 1;
}

export async function sourceLimit(scope: string) {
  const h = await headers();
  const ip = (process.env.VERCEL ? h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : null) ?? 'local';
  return await rate(scope, codeDigest('rate:'+ip).toString('hex'), 10) && await rate(scope, 'global', 120);
}

export async function token() {
  const value = (await cookies()).get(cookieName)?.value;
  return value && /^[a-f0-9]{64}$/.test(value) ? sessionDigest(value) : null;
}

export const identitySQL = `SELECT p.id, p.alias, p.event_id, c.revoked_at, c.expires_at AS code_expiry,
  s.expires_at AS session_expiry FROM awards.session s
  JOIN awards.access_credential c ON c.id=s.credential_id
  JOIN awards.participant p ON p.id=c.participant_id
  JOIN awards.event e ON e.id=p.event_id
  WHERE s.digest=$1 AND e.slug=$2`;

export function validIdentity(row: {revoked_at: Date|null; code_expiry: Date|null; session_expiry: Date} | undefined, now: Date) {
  return !!row && !row.revoked_at && (!row.code_expiry || row.code_expiry > now) && row.session_expiry > now;
}

export async function participant() {
  const digest = await token();
  if (!digest) return null;
  const row = (await query(identitySQL, [digest,slug()])).rows[0];
  return validIdentity(row,new Date()) ? row : null;
}

export async function signIn(raw: string) {
  if (!(await sourceLimit('participant-login'))) return false;
  const normalized = normalizeCode(raw);
  const digest = codeDigest(normalized ?? 'invalid');
  const prior = await token();
  const newToken = randomBytes(32).toString('hex');
  const success = await transaction(async db => {
    const found = await db.query(`SELECT c.id, p.id AS participant_id FROM awards.access_credential c
      JOIN awards.participant p ON p.id=c.participant_id JOIN awards.event e ON e.id=p.event_id
      WHERE e.slug=$2 AND c.digest=$1 AND c.revoked_at IS NULL
      AND (c.expires_at IS NULL OR c.expires_at>clock_timestamp()) FOR SHARE OF c`, [digest,slug()]);
    if (!normalized || !found.rows[0]) return false;
    if (prior) await db.query('DELETE FROM awards.session WHERE digest=$1',[prior]);
    await db.query("INSERT INTO awards.session VALUES ($1,$2,clock_timestamp()+interval '12 hours')",
      [sessionDigest(newToken),found.rows[0].id]);
    await db.query('UPDATE awards.participant SET accessed_at=coalesce(accessed_at,now()) WHERE id=$1',[found.rows[0].participant_id]);
    return true;
  });
  if (!success) console.info(JSON.stringify({event:'participant_login_denied'}));
  if (success) (await cookies()).set(cookieName,newToken,{secure,httpOnly:true,sameSite:'lax',path:'/',maxAge:43200});
  return success;
}

export async function signOut() {
  const digest = await token();
  if (digest) await query('DELETE FROM awards.session WHERE digest=$1',[digest]);
  (await cookies()).delete(cookieName);
}


