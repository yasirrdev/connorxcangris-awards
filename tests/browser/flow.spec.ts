import {test,expect} from '@playwright/test';
import {createHmac,randomBytes} from 'node:crypto';
import {Client} from 'pg';

test('mobile voter confirms once, completes the ballot and signs out',async({page,request})=>{
  const secret=process.env.CXC_TEST_SECRET!;
  const code='CXC-'+randomBytes(16).toString('hex').toUpperCase().match(/.{8}/g)!.join('-');
  const digest=createHmac('sha256',Buffer.from(secret,'hex')).update(code).digest();
  const db=new Client({connectionString:'postgres://postgres:'+process.env.CXC_TEST_DB_PASSWORD+'@127.0.0.1:'+process.env.CXC_TEST_DB_PORT+'/postgres'});
  await db.connect();
  try {
    const user=(await db.query("INSERT INTO awards.participant(event_id,alias) SELECT id,'Participante QA' FROM awards.event RETURNING id")).rows[0];
    await db.query('INSERT INTO awards.access_credential(participant_id,digest) VALUES ($1,$2)',[user.id,digest]);
    await page.goto('/');
    await expect(page.getByRole('link',{name:'ENTRAR A LA GALA'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    if (process.env.CXC_QA_SCREENSHOT) await page.screenshot({path:'test-results/mobile-home.png',fullPage:true,animations:'disabled'});
    await page.goto('/votar');
    await expect(page).toHaveURL(/\/acceso$/);
    await page.getByLabel('Código de invitación').fill(code);
    await page.getByRole('button',{name:'Entrar a los Awards'}).click();
    await expect(page.getByRole('heading',{name:'Hola, Participante QA'})).toBeVisible();
    await page.getByRole('button',{name:'Elegir',exact:true}).first().click();
    await page.getByRole('button',{name:'Confirmar voto'}).click();
    await expect(page.getByText('Ya has votado')).toBeVisible();
    await expect(page.getByText('¡Has completado tus votaciones!')).toBeVisible();
    expect(await page.getByRole('button',{name:'Elegir',exact:true}).count()).toBe(0);
    const gala=await request.get('/gala');
    expect(gala.status()).toBe(200);
    expect(await gala.text()).not.toContain('Candidatura ficticia 1');
    await db.query("UPDATE awards.event SET state='gala'");
    expect(await (await request.get('/gala')).text()).not.toContain('Candidatura ficticia 1');
    await db.query('UPDATE awards.category SET published_at=now()');
    await page.goto('/gala');
    await page.getByRole('button',{name:'Comenzar la ceremonia'}).click();
    await expect(page.getByRole('heading',{name:'Meme del año'})).toBeVisible();
    await expect(page.getByRole('heading',{name:/Nominación 1 · Meme del año/})).toBeVisible();
    await page.getByRole('button',{name:'Ver el gran final'}).click();
    await expect(page.getByRole('heading',{name:'Una ovación para todos.'})).toBeVisible();
    await expect(page.locator('.gala-winner-wall')).toContainText('Nominación 1 · Meme del año');
    await page.goto('/votar');
    await page.getByRole('button',{name:'Cerrar sesión'}).click();
    await expect(page).toHaveURL(/\/acceso$/);
    await page.goto('/votar');
    await expect(page).toHaveURL(/\/acceso$/);
    await page.goto('/admin');
    await expect(page.getByRole('button',{name:'Iniciar sesión'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Participación'})).toHaveCount(0);
  } finally {
    await db.end();
  }
});


