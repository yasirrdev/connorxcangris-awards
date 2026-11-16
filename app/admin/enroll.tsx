'use client';
import {useActionState,useState} from 'react';
import {enrollMfa,verifyMfa} from './actions';
export default function Enroll() {
  const [state,action,pending]=useActionState(enrollMfa,{message:''});
  const [result,verify,verifying]=useActionState(verifyMfa,{message:''});
  const [show,setShow]=useState(false);
  if (!state.factor) return <form action={action}><button disabled={pending}>Configurar autenticador</button>{state.message && <p role="status">{state.message}</p>}</form>;
  return <form action={verify}><p>Añade la clave a tu aplicación de autenticación y verifica el primer código.</p>
    <button type="button" onClick={()=>setShow(!show)}>{show?'Ocultar clave':'Mostrar clave TOTP'}</button>
    {show && <code className="secret">{state.secret}</code>}
    <input type="hidden" name="factor" value={state.factor}/>
    <label>Código de seis dígitos<input name="otp" inputMode="numeric" autoComplete="one-time-code" required/></label>
    <button disabled={verifying}>Confirmar autenticador</button>{result.message && <p role="status">{result.message}</p>}
  </form>;
}

