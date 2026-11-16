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
      <div className="hero-grain" aria-hidden="true"/><div className="orbit" aria-hidden="true"><span>🍋</span><span>🦀</span><span>✦</span><span>✦</span></div>
      <div className="hero-content">
        <p className="eyebrow"><i/> {e ? 'EDICIÓN '+e.edition+' · '+states[e.state] : 'UNA CELEBRACIÓN DE INTERNET'}</p>
        <p className="hero-kicker">PREMIOS A LO ABSURDAMENTE ICÓNICO</p>
        <h1>{e?.name && e.name!=='ConnorxCangris Awards' ? e.name : <>ConnorxCangris<br/><em>Awards</em><span className="hero-period">.</span></>}</h1>
        <p className="subtitle">{e?.intro || 'Los memes, personajes y momentos que hicieron historia. Una noche para celebrar el caos. Tú decides quién se lleva la gloria.'}</p>
        <div className="hero-actions"><Link className="button" href="/acceso">Entrar a la gala <span aria-hidden="true">↗</span></Link><Link className="text-link" href="/gala">Descubrir la gala <span aria-hidden="true">↓</span></Link></div>
        {e?.closes_at && <Countdown until={e.closes_at.toISOString()} label="Cierre de votaciones"/>}
      </div>
      <div className="hero-stamp" aria-hidden="true"><span>EDICIÓN</span><strong>{e?.edition ?? '01'}</strong><span>SOLO MEMES</span></div>
      <div className="hero-bottomline"><span>UNA NOCHE · MUCHOS NOMINADOS</span><span>DESLIZA PARA EXPLORAR ↓</span></div>
    </section>
    <section className="shell intro-section"><div className="section-heading"><p className="eyebrow">EL PROTOCOLO OFICIAL</p><h2>La fama es temporal.<br/><em>El meme es eterno.</em></h2></div>
      <div className="grid steps-grid">{steps.map((step,index)=><article className="card step-card" key={step.name}><span className="step-number">0{index+1}</span><h3>{step.name}</h3><p>{step.description}</p><span className="step-mark" aria-hidden="true">✳</span></article>)}</div>
      {categories.length>0 && <section className="category-section"><div className="section-heading"><p className="eyebrow">EN COMPETENCIA</p><h2>Las categorías</h2></div><div className="grid category-grid">{categories.map((c,index)=><article className="card category-card" key={c.id}>{c.image_url && <img className="category-image" src={c.image_url} alt=""/>}<span className="category-index">CATEGORÍA 0{index+1}</span><h3>{c.name}</h3><p>{c.description}</p></article>)}</div></section>}
    </section>
  </>;
}


