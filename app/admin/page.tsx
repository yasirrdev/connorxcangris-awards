import {adminIdentity} from '../../lib/admin';
import {event,query} from '../../lib/db';
import {publishedResults} from '../../lib/results';
import {adminLogout} from './actions';
import {AdminForm} from './form';
import Enroll from './enroll';
export const dynamic='force-dynamic';

const names:Record<string,string>={upcoming:'Próximamente',open:'Votaciones abiertas',closed:'Votaciones cerradas',gala:'Gala de resultados',finished:'Finalizado'};
function Hidden({name,value}:{name:string;value:string}){return <input type="hidden" name={name} value={value}/>;}
function Field({name,label,value='',type='text',required=false}:{name:string;label:string;value?:string|number;type?:string;required?:boolean}){
  return <label>{label}<input name={name} type={type} defaultValue={value} required={required}/></label>;
}
const iso=(d?:Date|null)=>d?.toISOString() ?? '';
function Dates({row}:{row?:{opens_at:Date|null;closes_at:Date|null}}) {
  return <><Field name="opens" label="Apertura (ISO 8601)" value={iso(row?.opens_at)}/><Field name="closes" label="Cierre (ISO 8601)" value={iso(row?.closes_at)}/></>;
}
type Category={id:string;name:string;description:string;image_url:string|null;position:number;active:boolean;opens_at:Date|null;closes_at:Date|null};
type Nominee={id:string;name:string;description:string;image_url:string|null;media_url:string|null;category_id:string};
function CategoryForm({c}:{c?:Category}) {
  return <AdminForm label={c?'Guardar categoría':'Crear categoría'}>
    <Hidden name="operation" value="category"/><Hidden name="target" value={c?.id ?? ''}/>
    <Field name="name" label="Nombre" value={c?.name} required/><Field name="description" label="Descripción" value={c?.description}/>
    <Field name="image" label="URL de imagen" value={c?.image_url ?? ''}/><Field name="position" label="Orden" type="number" value={c?.position ?? 0}/>
    <Upload/><label><input type="checkbox" name="active" defaultChecked={c?.active}/> Activa</label><Dates row={c}/>
  </AdminForm>;
}
function Upload(){return <label>Subir imagen (JPEG, PNG o WebP, hasta 2 MB)<input type="file" name="upload" accept="image/jpeg,image/png,image/webp"/></label>;}
function NomineeForm({category,n}:{category:string;n?:Nominee}) {
  return <AdminForm label={n?'Guardar candidatura':'Añadir candidatura'}>
    <Hidden name="operation" value="nominee"/><Hidden name="category" value={category}/><Hidden name="target" value={n?.id ?? ''}/>
    <Field name="name" label="Nombre" value={n?.name} required/><Field name="description" label="Descripción" value={n?.description}/>
    <Field name="image" label="URL de miniatura" value={n?.image_url ?? ''}/>
    <Upload/><Field name="media" label="URL de publicación o vídeo" value={n?.media_url ?? ''}/>
  </AdminForm>;
}
export default async function Admin() {
  const admin=await adminIdentity();
  if(!admin) return <section className="center"><div className="card signin"><h1>Administración</h1>
    <AdminForm mode="login" label="Iniciar sesión"><Field name="email" label="Correo" type="email" required/><Field name="password" label="Contraseña" type="password" required/></AdminForm>
  </div></section>;
  const mfa=<AdminForm mode="mfa" label="Verificar TOTP"><Field name="otp" label="Código del autenticador" required/></AdminForm>;
  const logout=<form action={adminLogout}><button className="secondary">Cerrar sesión administrativa</button></form>;
  if(!admin.verified) return <section className="center"><div className="card signin"><h1>Verifica tu acceso</h1>{mfa}<Enroll/>{logout}</div></section>;
  const e=await event();
  if(!e) return <section className="shell"><h1>Administración</h1><p>Crea la edición y configura EVENT_SLUG.</p>{logout}</section>;
  const [categories,nominees,participants,daily]=await Promise.all([
    query('SELECT c.*, (SELECT count(*)::int FROM awards.vote v WHERE v.category_id=c.id) AS votes FROM awards.category c WHERE c.event_id=$1 ORDER BY position,id',[e.id]),
    query('SELECT n.* FROM awards.nominee n JOIN awards.category c ON c.id=n.category_id WHERE c.event_id=$1 ORDER BY n.name',[e.id]),
    query(`SELECT p.id,p.alias,p.accessed_at, EXISTS(SELECT 1 FROM awards.access_credential a WHERE a.participant_id=p.id AND a.revoked_at IS NULL AND (a.expires_at IS NULL OR a.expires_at>now())) AS active,
      (SELECT count(*)::int FROM awards.vote v JOIN awards.category c ON c.id=v.category_id WHERE v.participant_id=p.id AND c.active) AS completed
      FROM awards.participant p WHERE event_id=$1 ORDER BY alias`,[e.id]),
    query("SELECT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,count(*)::int AS votes FROM awards.vote WHERE event_id=$1 GROUP BY 1 ORDER BY 1 DESC LIMIT 30",[e.id])
  ]);
  const results=admin.role==='owner' ? await publishedResults(e.id) : [];
  const activeCount=categories.rows.filter(c=>c.active).length;
  const accessed=participants.rows.filter(p=>p.accessed_at).length;
  return <section className="shell admin-grid">
    <p className="eyebrow">{e.edition} · {names[e.state]}</p><h1>Administración</h1>
    <section className="card"><h2>Participación</h2><p>{participants.rows.length} participantes · {accessed} accesos · {categories.rows.reduce((sum,c)=>sum+c.votes,0)} votos · {participants.rows.length ? Math.round(100*accessed/participants.rows.length) : 0}% con acceso</p>
      <ul>{[...categories.rows].sort((a,b)=>b.votes-a.votes).map(c=><li key={c.id}>{c.name} · {c.votes} votos</li>)}</ul>
      {daily.rows.length>0 && <details><summary>Votos diarios (UTC)</summary><ul>{daily.rows.map(d=><li key={d.day}>{d.day} · {d.votes}</li>)}</ul></details>}
    </section>
    {results.length>0 && <details className="card"><summary>Resultados publicados</summary><ul>{results.map((r,i)=><li key={i}>{r.category} · {r.name} · {r.votes}</li>)}</ul></details>}
    {admin.role==='owner' && <details className="card"><summary>Verificación para acciones críticas</summary><p>{admin.recent?'Verificación reciente activa.':'Verifica el autenticador para continuar.'}</p>{mfa}</details>}
    {admin.role==='owner' && <details className="card"><summary>Configuración de la edición</summary><AdminForm>
      <Hidden name="operation" value="event"/><Field name="name" label="Nombre" value={e.name}/><Field name="edition" label="Edición" type="number" value={e.edition}/>
      <label>Estado<select name="state" defaultValue={e.state}>{Object.entries(names).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <Dates row={e}/><Field name="gala" label="Fecha de gala (ISO 8601)" value={iso(e.gala_at)}/><Field name="intro" label="Texto principal" value={e.intro ?? ''}/>
      <label><input type="checkbox" name="percentages" defaultChecked={e.show_percentages}/> Mostrar porcentajes en la gala</label>
    </AdminForm><AdminForm label="Publicar todas las categorías"><Hidden name="operation" value="publish"/><Hidden name="target" value="all"/></AdminForm></details>}
    <details className="card"><summary>Participantes</summary><AdminForm label="Crear participante"><Hidden name="operation" value="participant"/><Field name="name" label="Alias (opcional)"/></AdminForm>
    {participants.rows.map(p=><details className="card" key={p.id}><summary>{p.alias || 'Invitación '+p.id.slice(0,8)} · {p.completed}/{activeCount} · {p.active?'Código activo':'Sin código activo'}</summary>
      {admin.role==='owner' && <><AdminForm label="Emitir código nuevo"><Hidden name="operation" value="issue"/><Hidden name="target" value={p.id}/><Field name="expires" label="Caducidad opcional (ISO 8601)"/></AdminForm>
      <AdminForm label="Revocar código"><Hidden name="operation" value="revoke"/><Hidden name="target" value={p.id}/></AdminForm></>}
    </details>)}</details>
    <details className="card"><summary>Crear categoría</summary><CategoryForm/></details>
    {categories.rows.map(c=><details className="card" key={c.id}><summary>{c.name} · {c.published_at?'Publicada':c.active?'Activa':'Inactiva'}</summary>
      {!c.published_at && <><CategoryForm c={c as Category}/><h3>Candidaturas</h3>
      {nominees.rows.filter(n=>n.category_id===c.id).map(n=><details key={n.id}><summary>{n.name}</summary><NomineeForm category={c.id} n={n as Nominee}/></details>)}
      <NomineeForm category={c.id}/>
      {admin.role==='owner' && <AdminForm label="Publicar esta categoría"><Hidden name="operation" value="publish"/><Hidden name="target" value={c.id}/></AdminForm>}</>}
    </details>)}
    {logout}
  </section>;
}

