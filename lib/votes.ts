import {z} from 'zod';
import {identitySQL, token, validIdentity} from './auth';
import {slug, transaction} from './db';
import {during} from './rules';

const selection = z.object({category: z.uuid(), nominee: z.uuid()});

export async function cast(form: FormData) {
  const input = selection.safeParse({category:form.get('category'),nominee:form.get('nominee')});
  const digest = await token();
  if (!digest || !input.success) return 'invalid';
  const {category,nominee} = input.data;
  return transaction(async db => {
    const event = (await db.query('SELECT * FROM awards.event WHERE slug=$1 FOR SHARE',[slug()])).rows[0];
    if (!event) return 'invalid';
    const user = (await db.query(identitySQL + ' FOR SHARE OF s,c',[digest,slug()])).rows[0];
    if (!validIdentity(user,new Date())) return 'invalid';
    const categoryRow = (await db.query('SELECT * FROM awards.category WHERE id=$1 AND event_id=$2 FOR SHARE',[category,user.event_id])).rows[0];
    if (!categoryRow) return 'invalid';
    const candidate = await db.query('SELECT id FROM awards.nominee WHERE id=$1 AND category_id=$2 FOR SHARE',[nominee,category]);
    if (!candidate.rowCount) return 'invalid';
    const existing = await db.query('SELECT 1 FROM awards.vote WHERE participant_id=$1 AND category_id=$2',[user.id,category]);
    if (existing.rowCount) return 'recorded';
    const now = (await db.query('SELECT clock_timestamp() AS now')).rows[0].now;
    if (!validIdentity(user,now)) return 'invalid';
    if (event.state !== 'open' || !categoryRow.active || !during(event,now) || !during(categoryRow,now)) return 'closed';
    await db.query(`INSERT INTO awards.vote(event_id,participant_id,category_id,nominee_id)
      VALUES ($1,$2,$3,$4) ON CONFLICT(participant_id,category_id) DO NOTHING`,[user.event_id,user.id,category,nominee]);
    return 'recorded';
  });
}



