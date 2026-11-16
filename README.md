# ConnorxCangris Awards 🍋🦀

Gala privada con invitaciones individuales, papeletas irrevocables y publicación de ganadores por categoría.

## Arranque local en Windows

Instala Node 24 y pnpm 11. Desde la carpeta del proyecto ejecuta:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd dev
```

Abre http://localhost:3000. Cuando `DATABASE_URL` está vacía o ausente, el script inicia PostgreSQL real en `127.0.0.1:55432`, aplica la migración y carga el seed en el primer arranque. La base y sus secretos de desarrollo se guardan en `.local-pg/dev/`, una carpeta ignorada por Git. Puedes reiniciar con Ctrl+C y volver a lanzar el comando. Si el puerto está ocupado, define por ejemplo `$env:AWARDS_LOCAL_DB_PORT = '55435'` antes de arrancar. Mantén privada la carpeta de datos.

Si `DATABASE_URL` ya está definida en el entorno o en un archivo de configuración de Next.js, se usa esa instancia. El arranque conserva los archivos locales y aplica el esquema automáticamente solo en el clúster que administra el script. Una URL antigua a `localhost:5432` se puede corregir en el archivo que la define o dejar vacía para usar el clúster integrado.

### Acceso desde el móvil

Conecta el móvil a la misma Wi-Fi y abre http://192.168.0.10:3000. Confirma con `ipconfig` que esa es la IPv4 del PC. Si Next se inicia con una dirección de escucha restringida, usa `pnpm.cmd dev --hostname 0.0.0.0`. Si Windows bloquea la conexión, permite a Node.js recibir conexiones en redes privadas o permite TCP 3000 solo en el perfil privado y para la subred local. El puerto PostgreSQL queda en loopback. En desarrollo, los recursos de Next admiten los tres hosts configurados y los formularios locales exigen que el origen coincida con el host y puerto de la petición. Para otra IP local, actualiza la lista de `lib/dev-origins.ts` y reinicia.

### Alternativa con Docker Compose

Si prefieres un contenedor, instala [Docker Desktop para Windows](https://docs.docker.com/desktop/setup/install/windows-install/) con el backend WSL 2. Abre Docker Desktop y desde PowerShell ejecuta:

```powershell
$env:POSTGRES_PASSWORD = Read-Host 'Contraseña exclusiva para el contenedor local' -MaskInput
docker compose up -d --wait postgres
docker compose exec postgres psql -U awards_local -d awards -c "SELECT slug, name FROM awards.event"
```

Usa la misma contraseña en cada arranque del contenedor. Compose publica PostgreSQL en `127.0.0.1:55433` y monta los SQL en modo de solo lectura. El volumen conserva los datos. En una terminal de desarrollo configura la URL y una clave propia antes de arrancar Next:

```powershell
$password = [uri]::EscapeDataString($env:POSTGRES_PASSWORD)
$env:DATABASE_URL = "postgres://awards_local:${password}@127.0.0.1:55433/awards"
$env:AWARDS_SECRET = node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
pnpm.cmd dev
```

Para conservar invitaciones en sucesivos arranques, guarda esa clave y la URL en un `.env.local` privado. Si el archivo ya existe, edita solo las variables que quieres cambiar. Los scripts de inicialización de Docker se ejecutan al crear un volumen vacío.

### PostgreSQL instalado o Supabase

El PostgreSQL integrado es la alternativa directa cuando no tienes Docker. También puedes usar PostgreSQL 17 o posterior, incluido el instalador oficial para Windows, o un proyecto Supabase de desarrollo. Crea una **base vacía dedicada** y ejecuta estas instrucciones con el cliente `psql` de la instalación, usando la conexión propietaria en `MIGRATION_DATABASE_URL`:

```powershell
psql $env:MIGRATION_DATABASE_URL -v ON_ERROR_STOP=1 -f db/001.sql
psql $env:MIGRATION_DATABASE_URL -v ON_ERROR_STOP=1 -f db/seed.sql
psql $env:MIGRATION_DATABASE_URL -v ON_ERROR_STOP=1 -c "SELECT slug, name FROM awards.event"
```

Define `DATABASE_URL`, `AWARDS_SECRET` (64 caracteres hexadecimales) y `APP_ORIGIN` para Next. El seed instala la edición ficticia `demo-2026`. Para Supabase y el primer administrador, consulta [DEPLOYMENT.md](DEPLOYMENT.md). [Instalador oficial de PostgreSQL para Windows](https://www.postgresql.org/download/windows/)

## Uso

Configura el primer propietario según [DEPLOYMENT.md](DEPLOYMENT.md). En `/admin`, inicia sesión y registra un factor TOTP. Crea un participante, verifica de nuevo el autenticador y emite su código. Copia o descarga la invitación en ese momento. Emitir otro código revoca el anterior y bloquea las sesiones asociadas. Las fechas administrativas aceptan ISO 8601 con zona horaria, por ejemplo `2026-11-24T20:00:00+01:00`.

Publica las categorías activándolas y abre la edición para admitir votos. Pasa a Gala de resultados y publica una categoría o todas. Los empates positivos muestran a todos los ganadores.

## Código y comprobaciones

- `app/` contiene páginas y acciones de acceso, votación, gala, multimedia y administración.
- `lib/` contiene acceso a datos, autenticación, reglas y registro de votos.
- `db/` contiene migración, permisos y seed.
- `tests/` contiene pruebas unitarias, integración y navegador.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

Las pruebas PostgreSQL crean una instancia desechable. Usa `TEST_DATABASE_URL` solo para una base de pruebas independiente y vacía. La suite aplica la migración y carga fixtures.

El diseño de persistencia y el modelo de amenazas están en [ARCHITECTURE.md](ARCHITECTURE.md) y [SECURITY.md](SECURITY.md).




### Edición local de pruebas

Ejecuta `pnpm.cmd dev:test --port 3001` y abre http://localhost:3001. La edición local usa PostgreSQL en el puerto 55436 y sus tres invitaciones están en `.local-pg/test-edition/invitaciones-prueba.txt`. Los votos se conservan al reiniciar.

