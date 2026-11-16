import Confetti from '../confetti';
import {redirect} from 'next/navigation';
import {participant} from '../../lib/auth';
import {event,query} from '../../lib/db';
import {during} from '../../lib/rules';
import {logout} from '../actions';
import Ballot from './ballot';

export const dynamic='force-dynamic';
export default async function Voting({searchParams}:{searchParams:Promise<{estado?:string}>}) {
  const p=await participant();
  if (!p) redirect('/acceso');
  const e=await event();
  const categories=(await query(`SELECT c.*, EXISTS(SELECT 1 FROM awards.vote v WHERE v.category_id=c.id AND v.participant_id=$2) AS voted
    FROM awards.category c WHERE c.event_id=$1 AND c.active ORDER BY c.position,c.id`,[p.event_id,p.id])).rows;
  const nominees=(await query('SELECT n.* FROM awards.nominee n JOIN awards.category c ON c.id=n.category_id WHERE c.event_id=$1 AND c.active ORDER BY n.name',[p.event_id])).rows;
  const done=categories.filter(c=>c.voted).length;
  const now=new Date();
  return <section className="shell">
    <p className="eyebrow">🍋 TU PAPELETA</p><h1>{p.alias ? 'Hola, '+p.alias : 'Tu votación'}</h1>
    <p>{done} de {categories.length} categorías completadas</p>
    <progress aria-label="Progreso de votación" max={Math.max(categories.length,1)} value={done}/>
    {(await searchParams).estado==='registrado' && <p role="status">Voto registrado.</p>}
    {categories.length>0 && done===categories.length && <p className="celebrate" role="status"><Confetti/>🎉 ¡Has completado tus votaciones!</p>}
    {!categories.length && <p>Las categorías aparecerán aquí cuando se publiquen.</p>}
    {categories.map(c=><section className="vote-section" key={c.id}><h2>{c.name}</h2><p>{c.description}</p>
      {c.voted ? <p className="eyebrow">✓ Ya has votado</p> : e?.id===p.event_id && e.state==='open' && during(e,now) && during(c,now) ?
        <Ballot id={c.id} nominees={nominees.filter(n=>n.category_id===c.id) as Parameters<typeof Ballot>[0]['nominees']}/> : <p>Votación cerrada.</p>}
    </section>)}
    <form action={logout}><button className="secondary">Cerrar sesión</button></form>
  </section>;
}

