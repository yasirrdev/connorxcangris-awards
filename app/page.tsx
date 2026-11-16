import Link from 'next/link';
import DatabaseUnavailablePage from './database-unavailable';
import {DatabaseUnavailable,event,query} from '../lib/db';
import Countdown from './timer';
const steps=[{name:'Usa tu código',description:'Entra con el código privado que recibiste.'},{name:'Emite tus votos',description:'Elige un favorito por categoría y confirma tu elección.'},{name:'Disfruta la gala',description:'Vuelve para descubrir quién se lleva el premio.'}];
export const dynamic='force-dynamic';
const states:Record<string,string>={upcoming:'Próximamente',open:'Votaciones abiertas',closed:'Votaciones cerradas',gala:'Gala de resultados',finished:'Finalizado'};
export default async function Home() {
  let data;
  try {
    const e = await event();
    const categories = e ? (await query('SELECT id,name,description,image_url FROM awards.category WHERE event_id=$1 AND active ORDER BY position,id',[e.id])).rows : [];
    data = {e,categories};
  } catch (error) {
    if (!(error instanceof DatabaseUnavailable)) throw error;
    return <DatabaseUnavailablePage error={error}/>;
  }
  const {e,categories} = data;
  return <>
    <section className="hero">
      <div className="orbit" aria-hidden="true"><span>🍋</span><span>🦀</span><span>✦</span></div>
      <p className="eyebrow"><i/> {e ? 'EDICIÓN '+e.edition+' · '+states[e.state] : 'LA GALA DE LA COMUNIDAD'}</p>
      <h1>{e?.name && e.name!=='ConnorxCangris Awards' ? e.name : <>ConnorxCangris<br/><em>Awards.</em></>}</h1>
      <p className="subtitle">{e?.intro || 'Los memes, personajes y momentos que hicieron historia. Tú decides quién se lleva el premio.'}</p>
      <Link className="button" href="/acceso">Acceder a las votaciones <span>↗</span></Link>
      {e?.closes_at && <Countdown until={e.closes_at.toISOString()} label="Cierre de votaciones"/>}
    </section>
    <section className="shell"><p className="eyebrow">LA VOTACIÓN</p><h2>Cómo participar</h2>
      <div className="grid">{steps.map(step=><article className="card" key={step.name}><h3>{step.name}</h3><p>{step.description}</p></article>)}</div>
      {categories.length>0 && <><h2>Categorías</h2>
      <div className="grid">{categories.map(c=><article className="card" key={c.id}>{c.image_url && <img className="category-image" src={c.image_url} alt=""/>}<span aria-hidden="true">✦</span><h3>{c.name}</h3><p>{c.description}</p></article>)}</div></>}
    </section>
  </>;
}


