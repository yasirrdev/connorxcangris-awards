'use server';
import {z} from 'zod';
import sharp from 'sharp';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {adminClient,adminIdentity} from '../../lib/admin';
import {rate,sameOrigin,sourceLimit} from '../../lib/auth';
import {slug,transaction} from '../../lib/db';
import {codeDigest,newCode} from '../../lib/rules';

type Result={message:string;code?:string};
const generic='No se pudo completar la operación.';
export async function adminLogin(_:Result,form:FormData):Promise<Result> {
  await sameOrigin();
  const client=await adminClient(true);
  const email=z.email().safeParse(form.get('email'));
  const password=z.string().min(1).max(256).safeParse(form.get('password'));
  if (!client || !email.success || !password.success || !await sourceLimit('admin-login')) return {message:generic};
  const {error}=await client.auth.signInWithPassword({email:email.data,password:password.data});
  if(error || !await adminIdentity(true)) {
    if(!error) await client.auth.signOut({scope:'local'});
    return {message:generic};
  }
  redirect('/admin');
}

export async function adminLogout() {
  await sameOrigin();
  await (await adminClient(true))?.auth.signOut({scope:'local'});
  redirect('/admin');
}

export async function verifyMfa(_:Result,form:FormData):Promise<Result> {
  await sameOrigin();
  const admin=await adminIdentity(true);
  const code=z.string().regex(/^\d{6}$/).safeParse(form.get('otp'));
  if(!admin || !code.success || !await rate('admin-mfa',admin.id,8)) return {message:generic};
  const {data}=await admin.client.auth.mfa.listFactors();
  const requested=z.uuid().safeParse(form.get('factor'));
  const factor=data?.all.find(f=>f.factor_type==='totp' && f.id===requested.data) ?? data?.totp[0];
  if(!factor) return {message:'Configura un factor TOTP verificado en Supabase.'};
  const {error}=await admin.client.auth.mfa.challengeAndVerify({factorId:factor.id,code:code.data});
  if(error) return {message:generic};
  redirect('/admin');
}

export async function enrollMfa():Promise<{message:string;factor?:string;secret?:string}> {
  await sameOrigin();
  const admin=await adminIdentity(true);
  if(!admin || !await rate('admin-enroll',admin.id,3)) return {message:generic};
  const {data}=await admin.client.auth.mfa.listFactors();
  if(!data || data.totp.length) return {message:generic};
  for(const factor of data.all.filter(f=>f.status==='unverified')) {
    const {error}=await admin.client.auth.mfa.unenroll({factorId:factor.id});
    if(error) return {message:generic};
  }
  const enrollment=await admin.client.auth.mfa.enroll({factorType:'totp',issuer:'ConnorxCangris Awards'});
  if(enrollment.error) return {message:generic};
  return {message:'',factor:enrollment.data.id,secret:enrollment.data.totp.secret};
}

const required=z.string().trim().min(1).max(160);
const description=z.string().trim().max(2500);
const url=z.union([z.literal('').transform(()=>null),z.url({protocol:/^https$/}).max(1200),z.string().regex(/^\/media\/[a-f0-9-]{36}$/)]);
const date=z.union([z.literal('').transform(()=>null),z.iso.datetime({offset:true}).transform(value=>new Date(value))]);
const id=z.uuid();
const nominal=z.object({name:required,description,image:url});
const windowFields=z.object({opens:date,closes:date});
const schema=z.discriminatedUnion('operation',[
  z.object({operation:z.literal('participant'),name:z.string().trim().max(160)}),
  z.object({operation:z.literal('issue'),target:id,expires:date}),
  z.object({operation:z.literal('revoke'),target:id}),
  nominal.extend({operation:z.literal('category'),target:id.or(z.literal('')),position:z.coerce.number().int().min(0).max(10000),active:z.boolean()}).merge(windowFields),
  nominal.extend({operation:z.literal('nominee'),category:id,target:id.or(z.literal('')),media:url}),
  windowFields.extend({operation:z.literal('event'),name:required,edition:z.coerce.number().int().min(2000).max(9999),
    state:z.enum(['upcoming','open','closed','gala','finished']),gala:date,intro:description,percentages:z.boolean()}),
  z.object({operation:z.literal('publish'),target:id.or(z.literal('all'))})
]);

export async function change(_:Result,form:FormData):Promise<Result> {
  await sameOrigin();
  const admin=await adminIdentity(true);
  if (!admin?.verified) return {message:generic};
  const input=schema.safeParse({...Object.fromEntries(form),active:form.get('active')==='on',percentages:form.get('percentages')==='on'});
  if (!input.success) return {message:'Revisa los campos. Usa fechas ISO con zona horaria y enlaces HTTPS.'};
  const item=input.data;
  if (['issue','revoke','event','publish'].includes(item.operation) && (admin.role!=='owner' || !admin.recent)) return {message:'Esta operación requiere rol propietario y una verificación TOTP reciente.'};
  if ('opens' in item && item.opens && item.closes && item.opens >= item.closes) return {message:'El cierre debe ser posterior a la apertura.'};
  let image:Buffer|undefined;
  const upload=form.get('upload');
  if ('image' in item && upload instanceof File && upload.size>0) {
    if(upload.size>2_000_000 || !['image/jpeg','image/png','image/webp'].includes(upload.type))
      return {message:'Sube un JPEG, PNG o WebP de hasta 2 MB.'};
    try {
      const source=sharp(Buffer.from(await upload.arrayBuffer()),{limitInputPixels:16_000_000,failOn:'warning'});
      const info=await source.metadata();
      if(!['jpeg','png','webp'].includes(info.format ?? '')) return {message:'Formato de imagen inválido.'};
      image=await source.rotate().resize(1200,1200,{fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer();
    } catch {return {message:'No se pudo procesar la imagen.'};}
  }
  const result=await transaction(async db=>{
    const actor=(await db.query('SELECT role FROM awards.admin_user WHERE identity_id=$1 AND active',[admin.id])).rows[0];
    if (!actor || actor.role!==admin.role) return {message:generic};
    const e=(await db.query('SELECT id,state FROM awards.event WHERE slug=$1 FOR UPDATE',[slug()])).rows[0];
    if (!e) return {message:generic};
    let target:string|null=null;
    let code:string|undefined;
    async function storedImage(existing:string|null) {
      if(!image) {
        if(!existing?.startsWith('/media/')) return existing;
        const permitted=await db.query('SELECT 1 FROM awards.image WHERE event_id=$1 AND id::text=$2',[e.id,existing.slice(7)]);
        return permitted.rowCount ? existing : null;
      }
      const saved=await db.query('INSERT INTO awards.image(event_id,content) VALUES ($1,$2) RETURNING id',[e.id,image]);
      return '/media/'+saved.rows[0].id;
    }
    switch(item.operation) {
      case 'participant': {
        target=(await db.query('INSERT INTO awards.participant(event_id,alias) VALUES ($1,$2) RETURNING id',[e.id,item.name])).rows[0].id;
        break;
      }
      case 'issue':
      case 'revoke': {
        if (item.operation==='issue' && item.expires && item.expires<=new Date()) return {message:'La caducidad debe ser futura.'};
        const p=await db.query('SELECT id FROM awards.participant WHERE event_id=$1 AND id=$2',[e.id,item.target]);
        if(!p.rowCount) return {message:generic};
        target=item.target;
        await db.query('UPDATE awards.access_credential SET revoked_at=now() WHERE participant_id=$1 AND revoked_at IS NULL',[target]);
        if (item.operation==='issue') {
          code=newCode();
          await db.query('INSERT INTO awards.access_credential(participant_id,digest,expires_at) VALUES ($1,$2,$3)',[target,codeDigest(code),item.expires]);
        }
        break;
      }
      case 'category': {
        const fields=[e.id,item.name,item.description,await storedImage(item.image),item.position,item.active,item.opens,item.closes];
        const changed=item.target
          ? await db.query('UPDATE awards.category SET name=$2,description=$3,image_url=$4,position=$5,active=$6,opens_at=$7,closes_at=$8 WHERE event_id=$1 AND id=$9 AND published_at IS NULL RETURNING id',[...fields,item.target])
          : await db.query('INSERT INTO awards.category(event_id,name,description,image_url,position,active,opens_at,closes_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',fields);
        target=changed.rows[0]?.id;
        if(!target) return {message:generic};
        break;
      }
      case 'nominee': {
        const allowed=await db.query('SELECT id FROM awards.category WHERE event_id=$1 AND id=$2 AND published_at IS NULL',[e.id,item.category]);
        if(!allowed.rowCount) return {message:generic};
        const fields=[item.category,item.name,item.description,await storedImage(item.image),item.media];
        const changed=item.target
          ? await db.query('UPDATE awards.nominee SET name=$2,description=$3,image_url=$4,media_url=$5 WHERE category_id=$1 AND id=$6 RETURNING id',[...fields,item.target])
          : await db.query('INSERT INTO awards.nominee(category_id,name,description,image_url,media_url) VALUES ($1,$2,$3,$4,$5) RETURNING id',fields);
        target=changed.rows[0]?.id;
        if(!target) return {message:generic};
        break;
      }
      case 'event': {
        const published=await db.query('SELECT 1 FROM awards.category WHERE event_id=$1 AND published_at IS NOT NULL LIMIT 1',[e.id]);
        if(published.rowCount && !['gala','finished'].includes(item.state)) return {message:'La edición ya tiene resultados publicados.'};
        await db.query('UPDATE awards.event SET name=$2,edition=$3,state=$4,opens_at=$5,closes_at=$6,gala_at=$7 WHERE id=$1',[e.id,item.name,item.edition,item.state,item.opens,item.closes,item.gala]);
        await db.query('INSERT INTO awards.event_settings VALUES ($1,$2,$3) ON CONFLICT(event_id) DO UPDATE SET intro=excluded.intro,show_percentages=excluded.show_percentages',[e.id,item.intro,item.percentages]);
        target=e.id;
        break;
      }
      case 'publish': {
        if(!['gala','finished'].includes(e.state)) return {message:'Activa el estado gala antes de publicar.'};
        target=item.target==='all' ? null : item.target;
        await db.query('UPDATE awards.category SET published_at=now() WHERE event_id=$1 AND active AND published_at IS NULL AND ($2::uuid IS NULL OR id=$2)',[e.id,target]);
        break;
      }
    }
    await db.query('INSERT INTO awards.audit_log(event_id,actor_id,action,target_id) VALUES ($1,$2,$3,$4)',[e.id,admin.id,item.operation,target]);
    return {message:'Cambios guardados.',code};
  });
  revalidatePath('/admin');
  return result;
}


