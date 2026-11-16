'use client';
export default function ErrorPage({reset}:{reset:()=>void}){
  return <section className="shell"><h1>Servicio temporalmente indisponible</h1><p>Vuelve a intentarlo en unos instantes.</p><button onClick={reset}>Reintentar</button></section>;
}

