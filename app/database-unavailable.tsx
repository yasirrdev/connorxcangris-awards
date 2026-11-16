import {DatabaseUnavailable} from '../lib/db';

export default function DatabaseUnavailablePage({error,path='/'}:{error:DatabaseUnavailable;path?:'/'|'/gala'}) {
  return <section className="shell">
    <h1>Base de datos no disponible</h1>
    <p>La aplicación no pudo cargar la edición. Reinténtalo en unos instantes.</p>
    {process.env.NODE_ENV === 'development' && <p>{
      error.reason === 'configuration' ? 'Falta una conexión PostgreSQL válida. Revisa DATABASE_URL o inicia el entorno con pnpm.cmd dev.' :
      error.reason === 'schema' ? 'Falta el esquema de votaciones. Aplica la migración descrita en README.md.' :
      'Comprueba que PostgreSQL esté iniciado y que DATABASE_URL apunte a la instancia correcta.'
    }</p>}
    <form action={path} method="get"><button type="submit">Reintentar</button></form>
  </section>;
}



