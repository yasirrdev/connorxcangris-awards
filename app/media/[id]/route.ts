import {z} from 'zod';
import {participant} from '../../../lib/auth';
import {query} from '../../../lib/db';

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}) {
  const id=z.uuid().safeParse((await params).id);
  if (!id.success) return new Response(null,{status:404});
  const user=await participant();
  const {rows}=await query(`SELECT m.content FROM awards.image m JOIN awards.event e ON e.id=m.event_id
    WHERE m.id=$1 AND EXISTS (
      SELECT 1 FROM awards.category c WHERE c.event_id=m.event_id AND c.active AND
      (c.image_url='/media/'||m.id OR
        ((m.event_id=$2 OR (e.state IN ('gala','finished') AND c.published_at<=now())) AND
          EXISTS(SELECT 1 FROM awards.nominee n WHERE n.category_id=c.id AND n.image_url='/media/'||m.id)))
    )`,[id.data,user?.event_id ?? null]);
  if (!rows[0]) return new Response(null,{status:404});
  return new Response(new Uint8Array(rows[0].content),{headers:{'Content-Type':'image/webp','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
}

