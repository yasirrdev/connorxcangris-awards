'use client';
export default function GlobalError({reset}:{reset:()=>void}) {
  return <html lang="es"><body><main><h1>Servicio temporalmente indisponible</h1><p>Vuelve a intentarlo en unos instantes.</p><button onClick={reset}>Reintentar</button></main></body></html>;
}

