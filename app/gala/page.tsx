import {DatabaseUnavailable,event} from '../../lib/db';
import DatabaseUnavailablePage from '../database-unavailable';
import {publishedResults} from '../../lib/results';
import Countdown from '../timer';
import GalaReveal from './reveal';
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
  const grouped=Object.values(Object.groupBy(results,r=>r.id));
  const categories=grouped.flatMap(group=>{
    if(!group?.length) return [];
    const totalVotes=group.reduce((sum,row)=>sum+row.votes,0);
    if(!totalVotes) return [];
    const winners=group.filter(row=>row.votes===group[0].votes).map(row=>({name:row.name,imageUrl:row.image_url}));
    return [{id:group[0].id,name:group[0].category,winners,percentages:e?.show_percentages?group.map(row=>({name:row.name,percent:Math.round(100*row.votes/totalVotes)})):undefined}];
  });
  return <section className="shell gala"><GalaReveal categories={categories} edition={e?.edition}/>
    {!categories.length && <div className="gala-coming-soon"><img className="gala-coming-soon-logo" src="/connorx-gala-emblem.png" alt="Logo dorado de ConnorxCangris Awards"/><p className="eyebrow"><i/> PRÓXIMAMENTE · CONNORXCANGRIS AWARDS</p><h1>La noche<br/>todavía <em>no termina.</em></h1><p>Los ganadores se revelarán cuando la gala comience. Guarda tu sitio en primera fila.</p>{e?.gala_at && <Countdown until={e.gala_at.toISOString()} label="Cuenta atrás para la gala"/>}</div>}
  </section>;
}


