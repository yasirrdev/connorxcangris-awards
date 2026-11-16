import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {access, mkdir, readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import {prepareDemo} from './demo-fixture.mjs';

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve('next/package.json'));
nextRequire('@next/env').loadEnvConfig(process.cwd(), true);

const demo = process.argv.includes('--test-data');
const directory = resolve(demo ? '.local-pg/test-edition' : '.local-pg/dev');
const data = resolve(directory, 'data');
const secretsFile = resolve(directory, 'secrets.json');
const hex = size => randomBytes(size).toString('hex');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function localSecrets() {
  await mkdir(directory, {recursive:true});
  if (!await exists(secretsFile)) {
    if (await exists(data)) throw new Error('Existe una base local sin su archivo de configuración.');
    await writeFile(secretsFile, JSON.stringify({password:hex(24), secret:hex(32)}), {flag:'wx',mode:0o600});
  }
  const config = JSON.parse(await readFile(secretsFile,'utf8'));
  if (!/^[a-f0-9]{48}$/.test(config.password) || !/^[a-f0-9]{64}$/.test(config.secret))
    throw new Error('La configuración de la base local es inválida.');
  return config;
}

async function initializeDatabase(connectionString) {
  const client = new pg.Client({connectionString,connectionTimeoutMillis:4000});
  await client.connect();
  try {
    const {rows:[schema]} = await client.query("SELECT to_regnamespace('awards') IS NOT NULL AS installed");
    if (!schema.installed) {
      const files = await Promise.all(['db/001.sql','db/seed.sql'].map(file=>readFile(file,'utf8')));
      const sql = files.map(file=>file.trim().replace(/^BEGIN;\s*/, '').replace(/\s*COMMIT;$/, ''));
      await client.query('BEGIN;\n'+sql.join('\n')+'\nCOMMIT;');
    }
    if (demo) return;
    const result = await client.query('SELECT name FROM awards.event WHERE slug=$1',[process.env.EVENT_SLUG ?? 'demo-2026']);
    console.info(result.rowCount ? 'PostgreSQL local listo. Edición encontrada.' : 'PostgreSQL local listo. Revisa EVENT_SLUG para seleccionar una edición.');
  } finally {
    await client.end();
  }
}

async function run() {
  let postgres;
  let started = false;
  let child;
  const interrupt = () => child?.kill();
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);
  try {
    if (demo || !process.env.DATABASE_URL?.trim()) {
      const port = Number(process.env.AWARDS_LOCAL_DB_PORT || (demo ? 55436 : 55432));
      if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Puerto PostgreSQL local inválido.');
      const {password,secret} = await localSecrets();
      postgres = new EmbeddedPostgres({
        databaseDir:data,port,password,user:'postgres',authMethod:'scram-sha-256',persistent:true,
        postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}
      });
      if (!await exists(data)) await postgres.initialise();
      await postgres.start();
      started = true;
      process.env.DATABASE_URL = 'postgres://postgres:'+password+'@127.0.0.1:'+port+'/postgres';
      process.env.AWARDS_SECRET ||= secret;
      if (demo) {
        process.env.AWARDS_ISOLATED_DEV = '1';
        process.env.EVENT_SLUG = 'pruebas-2026';
        process.env.AWARDS_SECRET = secret;
        process.env.SUPABASE_URL = '';
        process.env.SUPABASE_PUBLISHABLE_KEY = '';
      }
      await initializeDatabase(process.env.DATABASE_URL);
      if (demo) await prepareDemo(process.env.DATABASE_URL,secret,directory);
      if (process.argv.includes('--seed-only')) return;
    }
    const args = ['dev','--webpack',...process.argv.slice(2).filter(arg=>arg!=='--test-data')];
    child = spawn(process.execPath,[require.resolve('next/dist/bin/next'),...args],{stdio:'inherit'});
    try {
      process.exitCode = await new Promise((resolve,reject)=>{
        child.once('error',reject);
        child.once('exit',code=>resolve(code ?? 0));
      });
    } finally {
      process.off('SIGINT',interrupt);
      process.off('SIGTERM',interrupt);
    }
  } catch {
    console.error('No se pudo preparar el entorno local. Revisa si el puerto de PostgreSQL está ocupado, la configuración local o la guía en README.md.');
    process.exitCode = 1;
  } finally {
    if (started) await postgres.stop();
  }
}

await run();




