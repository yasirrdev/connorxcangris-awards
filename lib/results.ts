import {query} from './db';

export async function publishedResults(eventId:string) {
  return (await query(`SELECT c.id,c.name AS category,n.name,n.image_url,count(v.nominee_id)::integer AS votes
    FROM awards.event e JOIN awards.category c ON c.event_id=e.id JOIN awards.nominee n ON n.category_id=c.id
    LEFT JOIN awards.vote v ON v.category_id=c.id AND v.nominee_id=n.id
    WHERE e.id=$1 AND e.state IN ('gala','finished') AND c.published_at<=now()
    GROUP BY c.id,n.id ORDER BY c.position,c.id,votes DESC,n.name`,[eventId])).rows;
}

