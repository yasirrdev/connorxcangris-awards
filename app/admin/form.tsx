'use client';
import {useActionState,type ReactNode} from 'react';
import {adminLogin,change,verifyMfa} from './actions';
export function AdminForm({children,mode='change',label='Guardar'}:{children:ReactNode;mode?:'change'|'login'|'mfa';label?:string}) {
  const [state,action,pending]=useActionState({change,login:adminLogin,mfa:verifyMfa}[mode],{message:''});
  return <form action={action}>{children}<button disabled={pending}>{pending?'Procesando…':label}</button>
    {state.message && <p role="status">{state.message}</p>}
    {state.code && <div><p>Copia o descarga el código ahora.</p><code className="secret">{state.code}</code>
      <button type="button" className="secondary" onClick={()=>navigator.clipboard.writeText(state.code!)}>Copiar</button>{' '}
      <button type="button" className="secondary" onClick={()=>{
        const url=URL.createObjectURL(new Blob([state.code!+'\n'],{type:'text/plain'}));
        const a=document.createElement('a');a.href=url;a.download='invitacion-cxc.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }}>Descargar</button></div>}
  </form>;
}

