'use client';
import {useActionState} from 'react';
import {login} from '../actions';
export default function Form() {
  const [error,action,pending]=useActionState(login,'');
  return <form action={action}>
    <label htmlFor="code">Código de invitación</label>
    <input id="code" name="code" placeholder="CXC-…" required maxLength={100} autoComplete="off" autoCapitalize="characters" spellCheck={false}/>
    {error && <p role="alert">{error}</p>}
    <button disabled={pending}>{pending?'Comprobando…':'Entrar a los Awards ↗'}</button>
  </form>;
}

