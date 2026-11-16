import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {query} from './db';

export async function adminClient(mutate=false) {
  const jar=await cookies();
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createServerClient(url,key,{cookies:{
    getAll:()=>jar.getAll(),
    setAll:values=>{if(mutate) for(const {name,value,options} of values)
      jar.set(name,value,{...options,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'});}
  }});
}

export async function adminIdentity(mutate=false) {
  const client=await adminClient(mutate);
  if (!client) return null;
  const {data,error}=await client.auth.getClaims();
  const claims=data?.claims;
  if(error || !claims?.sub) return null;
  const row=(await query('SELECT role FROM awards.admin_user WHERE identity_id=$1 AND active',[claims.sub])).rows[0];
  if(!row) return null;
  const mfa=Array.isArray(claims.amr) ? claims.amr.find(x=>typeof x==='object' && x.method==='totp') : undefined;
  return {id:claims.sub,role:row.role as 'owner'|'operator',verified:claims.aal==='aal2',
    recent:claims.aal==='aal2' && typeof mfa==='object' && Date.now()/1000-mfa.timestamp<300,client};
}


