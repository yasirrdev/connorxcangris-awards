# Modelo de amenazas

- Fuerza bruta y enumeración. Códigos aleatorios de 128 bits y HMAC-SHA-256. Respuesta genérica y límites persistentes por origen y global. Registrar solo metadatos operativos sin códigos ni sesiones.
- Robo de sesión y fijación. Generar un token independiente por inicio de sesión, almacenar su hash y enviar una cookie HttpOnly, SameSite y Secure bajo HTTPS. Comprobar caducidad y revocación en cada operación.
- CSRF, XSS e IDOR. Comprobar origen de mutaciones. Escapar texto, permitir solo URL HTTPS validadas y limitar recursos con CSP. Derivar identidad del servidor y acotar lecturas y escrituras por edición.
- Concurrencia y manipulación. Claves foráneas compuestas, identidad de voto única, transacción y disparador de inmutabilidad. Auditar cambios críticos en la misma transacción.
- Publicación anticipada. Consultar y serializar únicamente agregados autorizados por el estado y la publicación de la categoría. Evitar caché compartida.
- Escalada administrativa. Identidad separada con MFA, autorización en base de datos y MFA reciente para cambios críticos. El rol de ejecución no debe ser propietario del esquema.
- Recursos y secretos. Limitar cargas y validar su contenido antes de servirlas. Usar límites del proveedor para DoS, TLS, backups privados y rotación de secretos.

Riesgos residuales. Un código compartido puede usarse por quien lo reciba. Un administrador autorizado puede cambiar el calendario. La infraestructura debe proteger la base de datos y los backups. La mitigación volumétrica y disponibilidad dependen del alojamiento.

