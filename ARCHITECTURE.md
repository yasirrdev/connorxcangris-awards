# Arquitectura

Next.js App Router sirve las páginas y las acciones. PostgreSQL es la fuente de verdad. Las conexiones del servidor usan SQL parametrizado con pg. El esquema privado evita exponer las tablas por la API de Supabase.

Cada edición tiene sus propios participantes, categorías, credenciales y votos. La edición pública se elige con EVENT_SLUG. El identificador del participante se deriva exclusivamente de la sesión. Las claves compuestas verifican en PostgreSQL que el nominado, la categoría y el participante pertenecen a la misma edición.

Para registrar un voto, una transacción toma bloqueos compartidos sobre edición, categoría, nominado y credencial, comprueba ventanas de tiempo y registra mediante INSERT ON CONFLICT. El bloqueo coordina cierres y revocaciones concurrentes con el voto. Los resultados públicos se agregan exclusivamente para categorías publicadas en ediciones en gala o finalizadas.

