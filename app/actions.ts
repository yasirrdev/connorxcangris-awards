'use server';
import {redirect} from 'next/navigation';
import {sameOrigin,signIn,signOut} from '../lib/auth';
import {cast} from '../lib/votes';
export async function login(_:string, form:FormData) {
  await sameOrigin();
  const code = form.get('code');
  if (typeof code !== 'string' || code.length > 100 || !(await signIn(code))) return 'No se pudo acceder. Revisa el código o inténtalo más tarde.';
  redirect('/votar');
}
export async function logout() {
  await sameOrigin();
  await signOut();
  redirect('/acceso');
}
export async function vote(_:string,form:FormData) {
  await sameOrigin();
  const result=await cast(form);
  if (result === 'recorded') redirect('/votar?estado=registrado');
  return result === 'closed' ? 'Esta categoría está cerrada.' : 'No se pudo registrar el voto. Comprueba tu sesión.';
}

