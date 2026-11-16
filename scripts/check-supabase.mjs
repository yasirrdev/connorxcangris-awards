import {createRequire} from 'node:module';
import pg from 'pg';

const require = createRequire(import.meta.url);
createRequire(require.resolve('next/package.json'))('@next/env').loadEnvConfig(process.cwd(), true);
const project = 'xxmmcnlwcuqxlsyxrrvc';
const source = process.env.DATABASE_URL?.trim() ?? '';
const url = URL.parse(source);
if (!url || !(url.hostname === 'db.'+project+'.supabase.co' || (url.hostname.endsWith('.pooler.supabase.com') && url.username.endsWith('.'+project)))) {
  console.error('URL inválida o proyecto PostgreSQL sin confirmar.');
  process.exitCode = 1;
} else {
  url.searchParams.set('sslmode','verify-full');
  const client = new pg.Client({connectionString:url.href,connectionTimeoutMillis:8000});
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const tls = await client.query('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()');
    const objects = await client.query("SELECT c.relname AS name, c.relkind AS kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='awards' ORDER BY c.relname");
    const constraints = await client.query("SELECT conname FROM pg_constraint WHERE connamespace=to_regnamespace('awards') ORDER BY conname");
    const extras = await client.query("SELECT to_regnamespace('awards') IS NOT NULL AS schema_exists, to_regrole('awards_runtime') IS NOT NULL AS runtime_exists, to_regprocedure('awards.prevent_vote_change()') IS NOT NULL AS vote_guard");
    const edition = objects.rows.some(row=>row.name==='event' && row.kind==='r')
      ? await client.query("SELECT state FROM awards.event WHERE slug=$1",[process.env.EVENT_SLUG]) : {rows:[]};
    console.log(JSON.stringify({clientTlsVerified:client.connection.stream.authorized===true,backendReportsTls:tls.rows[0]?.ssl,objects:objects.rows,constraints:constraints.rows,configuration:extras.rows[0],edition:edition.rows}));
    await client.query('ROLLBACK');
  } catch(error) {
    console.error('Comprobación PostgreSQL fallida:',error.code ?? 'CONNECTION_ERROR');
    process.exitCode = 1;
  } finally {
    await client.end().catch(()=>{});
  }
}



