import pg from 'pg';

type UnavailableReason = 'configuration' | 'connection' | 'schema';

export class DatabaseUnavailable extends Error {
  constructor(readonly reason: UnavailableReason) {
    super('Base de datos no disponible');
    this.name = 'DatabaseUnavailable';
  }
}

let pool: pg.Pool | undefined;

function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL?.trim();
  const url = connectionString && URL.parse(connectionString);
  if (!url || !['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) {
    throw new DatabaseUnavailable('configuration');
  }
  pool = new pg.Pool({connectionString, max:4, connectionTimeoutMillis:3500});
  pool.on('error',()=>console.error(JSON.stringify({event:'database_idle_connection_failed'})));
  return pool;
}

async function connect() {
  const activePool = getPool();
  try {
    return await activePool.connect();
  } catch {
    throw new DatabaseUnavailable('connection');
  }
}

function normalizeQueryError(error:unknown) {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  if (code === '42P01' || code === '3F000') return new DatabaseUnavailable('schema');
  if (code?.startsWith('08') || /^(57P0[123]|ECONNRESET|EPIPE|ETIMEDOUT)$/.test(code ?? '') ||
      (error instanceof Error && error.message === 'Connection terminated unexpectedly')) {
    return new DatabaseUnavailable('connection');
  }
  return error;
}

export const slug = () => process.env.EVENT_SLUG ?? 'demo-2026';

export async function query(sql:string, values:unknown[] = []) {
  const client = await connect();
  try {
    const result = await client.query(sql,values);
    client.release();
    return result;
  } catch (error) {
    client.release(true);
    throw normalizeQueryError(error);
  }
}

export async function transaction<T>(work:(client:pg.PoolClient)=>Promise<T>):Promise<T> {
  const client = await connect();
  let discard = false;
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      discard = true;
    }
    throw normalizeQueryError(error);
  } finally {
    client.release(discard);
  }
}

export async function event() {
  return (await query('SELECT e.*, s.intro, s.show_percentages FROM awards.event e LEFT JOIN awards.event_settings s ON s.event_id=e.id WHERE slug=$1', [slug()])).rows[0];
}

export async function closePool() {
  const activePool = pool;
  pool = undefined;
  await activePool?.end();
}

