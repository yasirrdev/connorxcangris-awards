'use client';
import {useActionState,useRef,useState} from 'react';
import {vote} from '../actions';

type Nominee={id:string;name:string;description:string;image_url:string|null;media_url:string|null};
export default function Ballot({id,nominees}:{id:string;nominees:Nominee[]}) {
  const [choice,setChoice]=useState<Nominee|null>(null);
  const [error,action,pending]=useActionState(vote,'');
  const dialog=useRef<HTMLDialogElement>(null);
  if (!nominees.length) return <p>Pronto se anunciarán las candidaturas.</p>;
  return <><div className="grid">{nominees.map(n=><article className="card candidate" key={n.id}>
    {n.image_url && <a href={n.image_url} target="_blank" rel="noreferrer" aria-label={'Ampliar imagen de '+n.name}><img loading="lazy" src={n.image_url} alt={n.name}/></a>}
    {!n.image_url && <div className="placeholder" aria-label="Miniatura pendiente">✦</div>}
    <h3>{n.name}</h3><p>{n.description}</p>
    {n.media_url && /\.(mp4|webm)([?#]|$)/i.test(n.media_url) && <video src={n.media_url} controls playsInline preload="none" aria-label={n.name}/>}
    {n.media_url && <a href={n.media_url} target="_blank" rel="noreferrer">Ver publicación ↗</a>}
    <button type="button" onClick={()=>{setChoice(n);dialog.current?.showModal();}}>Elegir</button>
  </article>)}</div><dialog ref={dialog}><form action={action}>
    <h2>Confirmar voto</h2><p>Vas a votar por <strong>{choice?.name}</strong>. El voto es definitivo.</p>
    <input type="hidden" name="category" value={id}/><input type="hidden" name="nominee" value={choice?.id ?? ''}/>
    {error && <p role="alert">{error}</p>}
    <button disabled={pending || !choice}>{pending?'Registrando…':'Confirmar voto'}</button>
    <button type="button" className="secondary" onClick={()=>dialog.current?.close()}>Volver</button>
  </form></dialog></>;
}

