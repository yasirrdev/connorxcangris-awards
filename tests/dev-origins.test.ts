import {expect,test} from 'vitest';
import {isLocalDevelopmentOrigin} from '../lib/dev-origins';
import {DatabaseUnavailable,closePool,event} from '../lib/db';

test('local form origins must match both an approved host and the request authority',()=>{
  for(const host of ['localhost','127.0.0.1','192.168.0.10']) {
    expect(isLocalDevelopmentOrigin('http://'+host+':3000',host+':3000')).toBe(true);
  }
  expect(isLocalDevelopmentOrigin('http://192.168.0.10:3001','192.168.0.10:3000')).toBe(false);
  expect(isLocalDevelopmentOrigin('http://192.168.0.11:3000','192.168.0.11:3000')).toBe(false);
  expect(isLocalDevelopmentOrigin('http://localhost:3000/path','localhost:3000')).toBe(false);
});

test('a missing DATABASE_URL fails explicitly without connecting to the pg defaults',async()=>{
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    await expect(event()).rejects.toBeInstanceOf(DatabaseUnavailable);
    await expect(event()).rejects.toMatchObject({reason:'configuration'});
  } finally {
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  }
});



test('a refused connection produces an error without credentials or target address',async()=>{
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL='postgres://dummy:example@127.0.0.1:1/postgres';
  try {
    await expect(event()).rejects.toMatchObject({
      name:'DatabaseUnavailable',reason:'connection',message:'Base de datos no disponible'
    });
  } finally {
    await closePool();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});
