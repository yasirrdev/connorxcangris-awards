'use client';

import {useState} from 'react';
import Confetti from '../confetti';

type Winner={name:string;imageUrl:string|null};
type Category={id:string;name:string;winners:Winner[];percentages?:{name:string;percent:number}[]};

export default function GalaReveal({categories,edition}:{categories:Category[];edition?:number}) {
  const [activeIndex,setActiveIndex]=useState(-1);
  const [finale,setFinale]=useState(false);
  const current=categories[activeIndex];
  if(!categories.length) return null;

  function next() {
    if(activeIndex<categories.length-1) setActiveIndex(index=>index+1);
    else setFinale(true);
  }

  function restart() {
    setActiveIndex(-1);
    setFinale(false);
  }

  return <section className="gala-experience" aria-label="Ceremonia de premios">
    <div className="gala-halo" aria-hidden="true"/>
    {activeIndex<0 && !finale ? <div className="gala-opening">
      <div className="gala-poster"><img src="/connorx-gala-emblem.png" alt="Logo dorado de ConnorxCangris Awards con un cangrejo llevando una corona de limón" fetchPriority="high"/></div>
      <div className="gala-opening-copy">
        <p className="eyebrow"><i/> CEREMONIA OFICIAL {edition ? `· EDICIÓN ${edition}` : ''}</p>
        <h1>La noche<br/>de <em>los nuestros.</em></h1>
        <p>Los focos están encendidos. El público está listo. Es hora de descubrir quién se lleva el meme de oro.</p>
        <button className="gala-primary" type="button" onClick={next}>Comenzar la ceremonia <span aria-hidden="true">↗</span></button>
        <p className="gala-count">{categories.length} {categories.length===1?'categoría':'categorías'} · UNA NOCHE PARA LA HISTORIA</p>
      </div>
    </div> : finale ? <div className="gala-finale" key="finale">
      <p className="eyebrow"><i/> SE CIERRA EL TELÓN</p>
      <h1>Una ovación<br/><em>para todos.</em></h1>
      <p>La comunidad ha hablado. Estos son los nombres que hicieron inolvidable esta edición.</p>
      <div className="gala-winner-wall">{categories.map((category,index)=><article className="gala-wall-card" key={category.id}>
        <span>0{index+1} / {category.name}</span>
        {category.winners.map((winner,winnerIndex)=><strong key={`${winner.name}-${winnerIndex}`}>{winner.name}</strong>)}
      </article>)}</div>
      <button className="secondary gala-replay" type="button" onClick={restart}>Volver a vivir la gala</button>
    </div> : current ? <div className="gala-reveal-stage" key={current.id}>
      <div className="gala-progress" role="progressbar" aria-label="Progreso de la gala" aria-valuemin={1} aria-valuemax={categories.length} aria-valuenow={activeIndex+1}>
        {categories.map((category,index)=><span key={category.id} className={index<=activeIndex?'is-lit':''}/>) }
      </div>
      <p className="eyebrow"><i/> SOBRE {activeIndex+1} DE {categories.length} · {edition ? `EDICIÓN ${edition}` : 'CONNORXCANGRIS AWARDS'}</p>
      <p className="gala-category-label">EL PREMIO ES PARA</p>
      <h1 className="gala-category-title">{current.name}</h1>
      <div className="winner-stage">
        <div className="winner-spotlight" aria-hidden="true"/>
        {current.winners.map((winner,index)=><article className="winner-card" key={`${winner.name}-${index}`}>
          <Confetti/>
          {winner.imageUrl ? <img className="winner-image" src={winner.imageUrl} alt={`Candidatura ganadora: ${winner.name}`} loading="lazy"/> : <div className="winner-image winner-placeholder" aria-hidden="true">✳</div>}
          <div className="winner-card-copy"><span className="winner-laurel" aria-hidden="true">✦</span><p className="eyebrow">{current.winners.length>1?'EMPATE OFICIAL':'GANADOR'+(current.winners.length>1?'ES':'A')} · VOTO DEL PÚBLICO</p><h2>{winner.name}</h2>{current.winners.length>1&&<p className="tie-note">Una ovación compartida. La gloria también.</p>}</div>
        </article>)}
      </div>
      {current.percentages?.length ? <details className="gala-results"><summary>Ver el resultado de la votación</summary><ul>{current.percentages.map((entry,index)=><li key={`${entry.name}-${index}`}><span>{entry.name}</span><strong>{entry.percent}%</strong></li>)}</ul></details> : null}
      <div className="gala-controls"><button className="secondary" type="button" onClick={()=>setActiveIndex(index=>Math.max(index-1,0))} disabled={activeIndex===0}>Premio anterior</button><button className="gala-primary" type="button" onClick={next}>{activeIndex===categories.length-1?'Ver el gran final':'Siguiente premio'} <span aria-hidden="true">→</span></button></div>
    </div> : null}
  </section>;
}
