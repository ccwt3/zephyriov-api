# Configuración del entorno local

`.env.example` documenta las variables que pueden ser necesarias para
reconstruir el entorno local sin incluir credenciales reales.

Para preparar una copia de trabajo:

```sh
cp .env.example .env
```

Completar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` con las credenciales del
cliente OAuth web de Google para B05.07. El redirect registrado en Google debe
ser `http://localhost:3402/api/auth/callback/google`.

`RESEND_API_KEY` es la API key de Resend con permiso de envío para el dominio
`mail.zephyriov.reicot.dev`; `AUTH_EMAIL_FROM` es el remitente, no secreto.
Ambas se usan desde B05.11. Detalles del dominio y la cuota en
[M07](manual-M07.md).

`TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` sólo se requieren para los ensayos
remotos que se habilitan explícitamente; no deben apuntar a una base de
producción durante las pruebas.

`.env` permanece ignorado por Git. Nunca se deben subir valores reales ni
compartir el secreto de Google en mensajes, capturas o APKs.
