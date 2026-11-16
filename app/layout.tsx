import type {ReactNode} from 'react';
import Link from 'next/link';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './style.css';

export const dynamic = 'force-dynamic';
export const metadata = {title:'ConnorxCangris Awards',description:'La gala privada de ConnorxCangris'};
export default function Layout({children}:{children:ReactNode}) {
  return <html lang="es"><body>
    <header><Link className="brand" href="/"><span>🍋</span> ConnorxCangris <b>Awards</b></Link>
      <nav><Link href="/gala">La gala</Link><Link href="/acceso">Mi acceso ↗</Link></nav>
    </header>
    <main>{children}</main>
    <footer><Link href="/">ConnorxCangris Awards</Link><a href="https://www.instagram.com/connorxcangris/" rel="noreferrer">Instagram ↗</a></footer>
  </body></html>;
}



