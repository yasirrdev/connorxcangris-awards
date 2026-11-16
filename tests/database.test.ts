import {afterAll,beforeAll,expect,test,vi} from 'vitest';
import {randomBytes} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const jar=new Map<string,string>();
const mockAdmin=vi.hoisted(()=>({current:null as null | {id:string;role:'owner'|'operator';verified:boolean;recent:boolean}}));
vi.mock('../lib/admin',()=>({adminIdentity:async()=>mockAdmin.current,adminClient:async()=>null}));
vi.mock('next/cache',()=>({revalidatePath:()=>{}}));
vi.mock('next/headers',()=>({
  cookies:async()=>({get:(key:string)=>({value:jar.get(key)}),set:(key:string,value:string)=>jar.set(key,value),delete:(key:string)=>jar.delete(key)}),
  headers:async()=>new Headers({origin:'http://test.local'})
}));
let pg:EmbeddedPostgres;
let dir:string;
let query:typeof import('../lib/db').query;
let auth:typeof import('../lib/auth');
let cast:typeof import('../lib/votes').cast;
let closePool:(()=>Promise<void>)|undefined;
let eventId:string;
let category:string;
let nominee:string;
let participantId:string;
let code:string;

beforeAll(async()=>{
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
  if (!process.env.TEST_DATABASE_URL) {
    dir=await mkdtemp(join(tmpdir(),'cxc-pg-'));
    const password=randomBytes(24).toString('hex');
    pg=new EmbeddedPostgres({databaseDir:join(dir,'data'),port:55483,user:'postgres',password,persistent:true,onLog:()=>{}});
    await pg.initialise();
    await pg.start();
    process.env.DATABASE_URL='postgres://postgres:'+password+'@127.0.0.1:55483/postgres';
  }
  process.env.EVENT_SLUG='demo-2026';
  process.env.AWARDS_SECRET=randomBytes(32).toString('hex');
  ({query,closePool}=await import('../lib/db'));
  auth=await import('../lib/auth');
  ({cast}=await import('../lib/votes'));
  await query(await readFile('db/001.sql','utf8'));
  await query(await readFile('db/seed.sql','utf8'));
  eventId=(await query("UPDATE awards.event SET state='open' RETURNING id")).rows[0].id;
  const candidate=(await query('SELECT id,category_id FROM awards.nominee LIMIT 1')).rows[0];
  category=candidate.category_id;nominee=candidate.id;
  participantId=(await query("INSERT INTO awards.participant(event_id,alias) VALUES ($1,'QA') RETURNING id",[eventId])).rows[0].id;
  const {newCode,codeDigest}=await import('../lib/rules');
  code=newCode();
  await query('INSERT INTO awards.access_credential(participant_id,digest) VALUES ($1,$2)',[participantId,codeDigest(code)]);
},60000);

afterAll(async()=>{
  await closePool?.();
  if (pg) await pg.stop();
  if (dir) await rm(dir,{recursive:true,force:true,maxRetries:15,retryDelay:150});
});

function form(candidate=nominee) {
  const data=new FormData();data.set('category',category);data.set('nominee',candidate);return data;
}

test('private login, time windows, 50 duplicate requests and revocation',async()=>{
  expect(await cast(form())).toBe('invalid');
  expect(await auth.signIn('incorrecto')).toBe(false);
  await query("UPDATE awards.access_credential SET expires_at=now()-interval '1 second'");
  expect(await auth.signIn(code)).toBe(false);
  await query('UPDATE awards.access_credential SET expires_at=NULL');
  expect(await auth.signIn(code)).toBe(true);
  expect(await auth.participant()).toMatchObject({id:participantId});
  expect(await cast(form('00000000-0000-4000-8000-000000000000'))).toBe('invalid');
  await query("UPDATE awards.event SET state='closed'");
  expect(await cast(form())).toBe('closed');
  await query("UPDATE awards.event SET state='open'");
  await query('UPDATE awards.category SET closes_at=now()');
  expect(await cast(form())).toBe('closed');
  await query('UPDATE awards.category SET closes_at=NULL');
  const results=await Promise.all(Array.from({length:50},()=>cast(form())));
  expect(results.every(r=>r==='recorded')).toBe(true);
  expect((await query('SELECT count(*)::int AS total FROM awards.vote')).rows[0].total).toBe(1);
  await expect(query('DELETE FROM awards.vote')).rejects.toMatchObject({code:'55000'});
  const {publishedResults}=await import('../lib/results');
  expect(await publishedResults(eventId)).toEqual([]);
  await query("UPDATE awards.event SET state='gala'");
  expect(await publishedResults(eventId)).toEqual([]);
  await query('UPDATE awards.category SET published_at=now()');
  expect((await publishedResults(eventId)).reduce((sum,r)=>sum+r.votes,0)).toBe(1);
  const {change}=await import('../app/admin/actions');
  process.env.APP_ORIGIN='http://otro.local';
  await expect(change({message:''},new FormData())).rejects.toThrow('Origen inválido');
  await query('UPDATE awards.access_credential SET revoked_at=now()');
  expect(await auth.participant()).toBeNull();
  expect(await auth.signIn(code)).toBe(false);
  await auth.signOut();
  expect(jar.size).toBe(0);
},30000);



test('privileged code issuance requires active owner, MFA and recent verification',async()=>{
  process.env.APP_ORIGIN='http://test.local';
  const {change}=await import('../app/admin/actions');
  const form=new FormData();
  form.set('operation','issue');form.set('target',participantId);form.set('expires','');
  expect((await change({message:''},form)).code).toBeUndefined();
  const id='67375ced-43ba-492e-b449-c886a8577b11';
  await query("INSERT INTO awards.admin_user VALUES ($1,'owner',true)",[id]);
  mockAdmin.current={id,role:'operator',verified:true,recent:true};
  expect((await change({message:''},form)).code).toBeUndefined();
  mockAdmin.current={id,role:'owner',verified:true,recent:false};
  expect((await change({message:''},form)).code).toBeUndefined();
  mockAdmin.current={id,role:'owner',verified:true,recent:true};
  const issued=await change({message:''},form);
  expect(issued.code).toMatch(/^CXC-/);
  expect((await query("SELECT count(*)::int AS total FROM awards.audit_log WHERE action='issue'")).rows[0].total).toBe(1);
  expect(await auth.signIn(issued.code!)).toBe(true);
  await auth.signOut();
});

test('runtime role can lock ballot rows and cannot update votes or administrators',async()=>{
  await query('CREATE ROLE awards_runtime NOLOGIN');
  await query(await readFile('db/grants.sql','utf8'));
  const {transaction}=await import('../lib/db');
  await transaction(async db=>{
    await db.query('SET LOCAL ROLE awards_runtime');
    await db.query(auth.identitySQL+' FOR SHARE OF s,c',[Buffer.alloc(32),'demo-2026']);
    await db.query('SELECT id FROM awards.event FOR SHARE');
    await db.query('SELECT id FROM awards.category FOR SHARE');
    await db.query('SELECT id FROM awards.nominee FOR SHARE');
  });
  for(const sql of ['UPDATE awards.vote SET created_at=now()','UPDATE awards.admin_user SET role=role']){
    await expect(transaction(async db=>{
      await db.query('SET LOCAL ROLE awards_runtime');
      await db.query(sql);
    })).rejects.toMatchObject({code:'42501'});
  }
});


test('the actual edition starts closed without demo categories or public results',async()=>{
  const sql=await readFile('db/production-edition.sql','utf8');
  await query(sql);
  await query(sql);
  const edition=await query(
    "SELECT e.id,e.state,s.show_percentages FROM awards.event e JOIN awards.event_settings s ON s.event_id=e.id WHERE e.slug='connorxcangris-awards-2026'"
  );
  expect(edition.rows).toHaveLength(1);
  expect(edition.rows[0]).toMatchObject({state:'upcoming',show_percentages:false});
  expect((await query('SELECT id FROM awards.category WHERE event_id=$1',[edition.rows[0].id])).rows).toEqual([]);
  const {publishedResults}=await import('../lib/results');
  expect(await publishedResults(edition.rows[0].id)).toEqual([]);
});
