import {createHmac,randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import pg from 'pg';

export async function prepareDemo(connectionString, secret, directory) {
  const db=new pg.Client({connectionString});
  const invitations=[];
  await db.connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('cxc-test-edition'))");
    const created=await db.query("INSERT INTO awards.event(slug,name,edition,state) VALUES ('pruebas-2026','ConnorxCangris Awards · Pruebas',2026,'open') ON CONFLICT(slug) DO NOTHING RETURNING id");
    if(created.rowCount){
      const id=created.rows[0].id;
      await db.query("INSERT INTO awards.event_settings(event_id,intro) VALUES ($1,'Edición local de pruebas con datos ficticios.')",[id]);
      for(const [index,name] of ['Meme del año','Momento más gracioso','Personaje del año','Mejor vídeo','Momento más absurdo'].entries()){
        const category=await db.query('INSERT INTO awards.category(event_id,name,position,active) VALUES ($1,$2,$3,true) RETURNING id',[id,name,index]);
        for(let i=1;i<=4;i++) await db.query("INSERT INTO awards.nominee(category_id,name,description) VALUES ($1,$2,'Candidatura ficticia')",[category.rows[0].id,'Nominación '+i+' · '+name]);
      }
      for(let i=1;i<=3;i++){
        const alias='Participante de prueba '+i;
        const user=await db.query('INSERT INTO awards.participant(event_id,alias) VALUES ($1,$2) RETURNING id',[id,alias]);
        const code='CXC-'+randomBytes(16).toString('hex').toUpperCase().match(/.{8}/g).join('-');
        const digest=createHmac('sha256',Buffer.from(secret,'hex')).update(code).digest();
        await db.query('INSERT INTO awards.access_credential(participant_id,digest) VALUES ($1,$2)',[user.rows[0].id,digest]);
        invitations.push(alias+' | '+code);
      }
      await writeFile(directory+'/invitaciones-prueba.txt',invitations.join('\n')+'\n',{mode:0o600});
    }
    await db.query('COMMIT');
    const {rows:[counts]}=await db.query(`SELECT
      (SELECT count(*)::int FROM awards.participant WHERE event_id=e.id) AS participantes,
      (SELECT count(*)::int FROM awards.category WHERE event_id=e.id) AS categorias,
      (SELECT count(*)::int FROM awards.nominee n JOIN awards.category c ON c.id=n.category_id WHERE c.event_id=e.id) AS nominaciones
      FROM awards.event e WHERE e.slug='pruebas-2026'`);
    console.info('Edición de pruebas:',counts);
  }catch(error){
    await db.query('ROLLBACK').catch(()=>{});
    throw error;
  }finally{await db.end();}
}

