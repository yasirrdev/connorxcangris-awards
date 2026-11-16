import Confetti from '../confetti';
import {DatabaseUnavailable,event} from '../../lib/db';
import DatabaseUnavailablePage from '../database-unavailable';
import {publishedResults} from '../../lib/results';
import Countdown from '../timer';
export const dynamic='force-dynamic';
export default async function Gala() {
  let data;
  try {
    const e=await event();
    data={e,results:e ? await publishedResults(e.id) : []};
  } catch(error) {
    if (!(error instanceof DatabaseUnavailable)) throw error;
    return <DatabaseUnavailablePage error={error} path="/gala"/>;
  }
  const {e,results}=data;
  const groups=Object.values(Object.groupBy(results,r=>r.id));
  return <section className="shell gala"><p className="eyebrow">✦ LA GALA</p><h1>La noche de los premios.</h1>
    {!groups.length && <><p>Próximamente se revelarán los resultados de la edición.</p>{e?.gala_at && <Countdown until={e.gala_at.toISOString()} label="Cuenta atrás para la gala"/>}</>}
    {groups.map(group=>{
      if (!group?.length) return null;
      const total=group.reduce((sum,r)=>sum+r.votes,0);
      const winners=group.filter(r=>r.votes===group[0].votes);
      return <details className="card reveal" key={group[0].id}><summary>{group[0].category} · Revelar resultado</summary>
        {!total ? <p>Categoría sin votos.</p> : winners.map((r,i)=><div className="celebrate" key={i}><Confetti/>{r.image_url && <img src={r.image_url} alt=""/>}<h2>🏆 {r.name}</h2></div>)}
        {total>0 && e.show_percentages && group.map((r,i)=><p key={i}>{r.name} · {Math.round(100*r.votes/total)} %</p>)}
      </details>;
    })}
  </section>;
}


