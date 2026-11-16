import {defineConfig,devices} from '@playwright/test';
import {randomBytes,randomInt} from 'node:crypto';

process.env.CXC_TEST_SECRET ??= randomBytes(32).toString('hex');
process.env.CXC_TEST_DB_PASSWORD ??= randomBytes(24).toString('hex');
process.env.CXC_TEST_DB_PORT ??= String(randomInt(54000,65000));
export default defineConfig({
  testDir:'tests/browser',
  workers:1,
  use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:3157',channel:process.env.CXC_BROWSER_CHANNEL},
  webServer:{command:'node tests/browser-server.mjs',url:'http://127.0.0.1:3157/acceso',timeout:120000,gracefulShutdown:{signal:'SIGTERM',timeout:5000}}
});

