# Vercel y Supabase

## Preparar Supabase

1. Crea el proyecto cuando esté autorizado. Usa el endpoint PostgreSQL con TLS para las migraciones y un pooler Supavisor para el tráfico serverless.
2. Ejecuta `db/001.sql` una vez con la cuenta de migración. Crea un rol LOGIN exclusivo con contraseña aleatoria y sin atributos de administración. Usa el nombre `awards_runtime` y aplica `db/grants.sql` con la cuenta propietaria. Conserva la conexión propietaria fuera de Vercel.
3. Conserva `awards` fuera de los esquemas expuestos por la API. La aplicación accede al esquema privado mediante el rol de ejecución. Deshabilita el registro administrativo público y habilita TOTP.
4. En Authentication crea y confirma al primer usuario administrativo. Copia su UUID y añade su permiso mediante una consulta parametrizada equivalente a `INSERT INTO awards.admin_user(identity_id,role) VALUES ('UUID-DEL-USUARIO','owner')`. Abre `/admin` y verifica el autenticador. Usa cuentas individuales.
5. Crea la edición real desde SQL con slug, nombre, año y estado upcoming. Usa ese slug en Vercel. Cada edición futura se crea como fila independiente.

## Preparar Vercel

- Define `DATABASE_URL`, `EVENT_SLUG`, `AWARDS_SECRET`, `APP_ORIGIN`, `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` según `.env.example`. Usa Node 24, el preset Next.js y `pnpm build`.
- Usa el origen HTTPS exacto en APP_ORIGIN y un entorno de datos independiente para previews. Confirma cifrado y verificación de certificado en la conexión PostgreSQL.
- Configura límites del proveedor antes de anunciar el enlace. La aplicación usa la IP del encabezado de Vercel bajo esa infraestructura. En otro alojamiento configura el proxy para eliminar encabezados de IP proporcionados por el cliente.
- Programa limpieza periódica de sesiones vencidas y contadores por minuto antiguos con la cuenta de mantenimiento. Comprueba el tamaño de archivos en base de datos y elimina multimedia huérfana tras verificar sus referencias.
- Conserva un backup cifrado del esquema y prueba una restauración en un proyecto aislado. Registra por separado el procedimiento de recuperación de identidades del proveedor de Auth.

## Copia y restauración

Conecta con la cuenta de migración y usa una copia privada. En PowerShell:

```powershell
pg_dump $env:MIGRATION_DATABASE_URL --format=custom --schema=awards --file=awards.dump
pg_restore --dbname=$env:RESTORE_DATABASE_URL --no-owner --no-acl --exit-on-error awards.dump
```

Apunta RESTORE_DATABASE_URL a una base vacía de ensayo. Compara recuentos de ediciones, participantes y votos y prueba el cierre y publicación con una copia aislada. Reaplica los permisos del rol de ejecución antes de promover la base. Las identidades y factores MFA requieren el mecanismo de recuperación del proveedor y sus UUID deben seguir coincidiendo con awards.admin_user. Excluye el archivo de backup del repositorio y conserva la clave HMAC en el gestor de secretos.

## Incidentes

Revoca una credencial filtrada mediante administración y emite otra. Ante exposición de la clave HMAC, rota AWARDS_SECRET, borra las sesiones de participantes y regenera todos los códigos. Para una cuenta administrativa comprometida, desactívala en awards.admin_user, revoca sus sesiones en Supabase y revisa audit_log. Ante posible pérdida de datos, pausa la votación y verifica una restauración aislada antes de promoverla.

## Antes de publicar

- [ ] CI, build de producción y revisión de dependencias.
- [ ] Autenticación real de un propietario, TOTP reciente y accesos denegados.
- [ ] Recorrido de un participante en iPhone, Android y navegador de Instagram.
- [ ] Categorías, candidaturas, medios y calendario reales.
- [ ] Prueba de cierre, revocación y publicación de una categoría de ensayo.
- [ ] HTTPS, credenciales de mínimo privilegio, backups y monitorización.

Referencias oficiales de Supabase

- [Conexiones PostgreSQL y Supavisor](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Registro y verificación de MFA TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp)


## Edición real y conexión local a Supabase

Para inicializar un proyecto vacío, revisa y ejecuta `db/001.sql`, aprovisiona el rol LOGIN `awards_runtime` y aplica `db/grants.sql`. Luego ejecuta `db/production-edition.sql` para crear ConnorxCangris Awards 2026, en preparación y sin candidaturas. Reserva `db/seed.sql` para pruebas locales.

En Windows, usa la URL de **Connect → Session pooler** y codifica los caracteres reservados de la contraseña. En **Database Settings → SSL Configuration**, descarga el certificado público del proyecto. Configura la URL con `sslmode=verify-full` y `sslrootcert` apuntando al archivo local. La herramienta `node scripts/check-supabase.mjs` comprueba en modo de solo lectura el proyecto y su esquema. Un resultado negativo de `pg_stat_ssl` en el backend de PostgreSQL describe el tramo Supavisor–PostgreSQL, no sustituye la comprobación del TLS entre Node y el pooler.

La cuenta de migración se reserva para crear el esquema y aprovisionar permisos. Usa la cuenta de ejecución en `DATABASE_URL` para el uso habitual. Para habilitar el panel, crea tu usuario de Auth desde el dashboard, autoriza su UUID como propietario siguiendo los pasos anteriores y registra TOTP desde `/admin`.
