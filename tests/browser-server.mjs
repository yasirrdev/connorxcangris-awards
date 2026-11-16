import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import {Client} from 'pg';

const directory=await mkdtemp(join(tmpdir(),'cxc-e2e-'));
const password=process.env.CXC_TEST_DB_PASSWORD;
const secret=process.env.CXC_TEST_SECRET;
if (!password || !secret) throw new Error('Control de entorno E2E ausente');
const port=Number(process.env.CXC_TEST_DB_PORT);
const database='postgres://postgres:'+password+'@127.0.0.1:'+port+'/postgres';
const startupLogs=[];
const postgres=new EmbeddedPostgres({databaseDir:join(directory,'data'),port,password,user:'postgres',persistent:true,onLog:message=>startupLogs.push(message),onError:message=>startupLogs.push(message)});
let child;
let started=false;
let stopping=false;
async function stop(code) {
  if(stopping) return;
  stopping=true;
  child?.kill();
  if(started) await postgres.stop();
  await rm(directory,{force:true,recursive:true,maxRetries:15,retryDelay:150});
  process.exit(code);
}
process.on('SIGINT',()=>void stop(0));
process.on('SIGTERM',()=>void stop(0));
try {
  await postgres.initialise();
  await postgres.start();
  started=true;
  const client=new Client({connectionString:database});
  await client.connect();
  try {
    await client.query(await readFile('db/001.sql','utf8'));
    await client.query(await readFile('db/seed.sql','utf8'));
    await client.query("UPDATE awards.event SET state='open'");
  } finally {
    await client.end();
  }
  const mode=process.env.CXC_PRODUCTION_TEST ? ['start'] : ['dev','--webpack'];
  child=spawn(process.execPath,['node_modules/next/dist/bin/next',...mode,'--hostname','127.0.0.1','--port','3157'],{
    stdio:'inherit',
    env:{...process.env,AWARDS_ISOLATED_DEV:'1',APP_ORIGIN:'http://127.0.0.1:3157',AWARDS_SECRET:secret,DATABASE_URL:database,EVENT_SLUG:'demo-2026',SUPABASE_URL:'',SUPABASE_PUBLISHABLE_KEY:''}
  });
  child.on('exit',code=>void stop(code ?? 1));
} catch(error) {
  console.error(error ?? startupLogs.slice(-12).join("\n"));
  await stop(1);
}




