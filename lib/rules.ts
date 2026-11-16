import {createHash, createHmac, randomBytes} from 'node:crypto';

export function newCode() {
  return 'CXC-' + randomBytes(16).toString('hex').toUpperCase().match(/.{8}/g)!.join('-');
}

export function normalizeCode(raw: string) {
  const code = raw.trim().toUpperCase();
  return /^CXC(?:-[A-F0-9]{8}){4}$/.test(code) ? code : null;
}

export function codeDigest(code: string) {
  const secret = process.env.AWARDS_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) throw new Error('AWARDS_SECRET inválido');
  return createHmac('sha256', Buffer.from(secret, 'hex')).update(code).digest();
}

export const sessionDigest = (token: string) => createHash('sha256').update(token).digest();

export function during(row: {opens_at: Date | null; closes_at: Date | null}, now: Date) {
  return (!row.opens_at || row.opens_at <= now) && (!row.closes_at || row.closes_at > now);
}

