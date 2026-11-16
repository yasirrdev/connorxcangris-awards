import {NextRequest,NextResponse} from 'next/server';

export function proxy(request:NextRequest) {
  const nonce=btoa(crypto.randomUUID());
  const dev=process.env.NODE_ENV!=='production';
  const csp=`default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${dev ? "'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' https: data:; media-src 'self' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
  const headers=new Headers(request.headers);
  headers.set('x-nonce',nonce);
  headers.set('Content-Security-Policy',csp);
  const response=NextResponse.next({request:{headers}});
  response.headers.set('Content-Security-Policy',csp);
  response.headers.set('Referrer-Policy','no-referrer');
  response.headers.set('X-Content-Type-Options','nosniff');
  response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(!dev) response.headers.set('Strict-Transport-Security','max-age=31536000');
  response.headers.set('Cache-Control','private, no-store');
  return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};


