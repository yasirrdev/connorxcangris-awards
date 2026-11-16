export const developmentHosts = ['localhost', '127.0.0.1', '192.168.0.10'];

export function isLocalDevelopmentOrigin(origin: string, host: string | null) {
  const parsed = URL.parse(origin);
  return !!parsed && parsed.protocol === 'http:' && parsed.origin === origin &&
    parsed.host === host && developmentHosts.includes(parsed.hostname);
}

