import type {ReactNode} from 'react';
import Link from 'next/link';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './style.css';

export const dynamic = 'force-dynamic';
export const metadata = {title:'ConnorxCangris Awards — La noche de los memes',description:'Una gala privada para celebrar los memes, personajes y momentos que hicieron historia.'};
export const viewport = {themeColor:'#17120D',width:'device-width',initialScale:1,viewportFit:'cover'};
export default function Layout({children}:{children:ReactNode}) {
  return <html lang="es"><body>
    <header><Link className="brand" href="/" aria-label="ConnorxCangris Awards — inicio"><img className="brand-mark" src="/connorx-gala-emblem.png" alt=""/><span className="brand-wordmark">🍋connorxcangris🦀</span></Link>
      <nav><Link href="/gala">La gala</Link><Link href="/acceso">Mi acceso ↗</Link></nav>
    </header>
    <main>{children}</main>
    <footer><Link href="/">ConnorxCangris Awards</Link><a href="https://www.instagram.com/connorxcangris/" rel="noreferrer">Instagram ↗</a></footer>
  </body></html>;
}



