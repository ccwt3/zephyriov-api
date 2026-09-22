# B05.02–B05.03 — registro, verificación y recuperación local

## Fichas y alcance

| Punto | Resultado observable | Casos de aceptación |
| --- | --- | --- |
| B05.02 | Registro/login Better Auth real, perfil estable y autorización de negocio por sesión verificada | Credencial con hash, correo capturado, login válido/incorrecto, duplicado sin filas nuevas, 401 sin sesión y 403 no verificado |
| B05.03 | Verificación, reenvío y recuperación con tokens administrados por Better Auth | Verificación válida/repetida/alterada/vencida, reenvío, reset válido/reutilizado/inválido/vencido y conservación del bloqueo no verificado |

Repositorio propietario: API. Archivos permitidos: `src/auth/`, `tests/auth/`,
`docs/`, README y Branch_changes. Entrada: contrato B02, B04 probado, fábrica
y perfil B05.01; HEAD `123d2c1`, árbol limpio. Fuentes: plan agéntico §3,
§5 B05.02–B05.03 y §13, backend §B05 y código instalado Better Auth 1.7.5.
Pruebas mediante handler Request/Response y SQLite temporal, con el adaptador
Drizzle real. Revisión por el agente principal; salida requerida
`probado(SQLite local)`. No se cierra ninguna familia SRS R01–R22 con Auth.

El correo se captura en memoria únicamente en `tests/auth/helpers.ts`; los
dos callbacks de entrega son obligatorios en la fábrica. No hay proveedor
de correo, secretos de producción, servidor escuchando, clientes ni cambios
de esquema. B05.04 conserva cookies/CORS/CSRF/retornos finales; B05.09 conserva
logout, revocación general y sockets; B05.10–B05.12 conservan límites, correo
real, aislamiento completo e inventario definitivo. No hace falta acción
manual para estos dos puntos.

## Integración y autorización

Email/contraseña queda habilitado. El hook existente crea perfil 6/4 UTC,
revisión de ajustes 1 y revisión de cuenta 1. Registro y login válidos pueden
crear sesión sin verificar el correo (`requireEmailVerification:false`);
esto permite gestionar la verificación. Cada futuro handler de negocio debe
llamar `requireVerifiedSession(auth, request.headers)` antes de acceder a
datos: devuelve sesión/usuario de Better Auth o lanza `APIError` con 401
`AUTH_REQUIRED` / 403 `EMAIL_UNVERIFIED`, códigos del contrato B02.
La sesión nunca se construye a partir de un ID o booleano del cliente.

La autorización se ensaya llamando esa función con las cookies emitidas por
el handler Auth; aún no se ha montado una ruta de sincronización. El adaptador
HTTP de negocio deberá convertir el error a `ErrorEnvelope` con `requestId`
y `serverNow` en B06/B08. Los errores propios de las rutas Auth mantienen el
formato de la biblioteca. El registro duplicado devuelve 422 y no crea otro
perfil; no se afirma protección contra enumeración en registro ni igualdad
temporal de respuestas. La consulta de sesión usa DB, sin cookie cache.

## Tokens y configuración efectiva

Verificación y recuperación vencen en **3600 segundos**, fijados en las
opciones de la fábrica. Hashing y validación siguen siendo de Better Auth:
en Node usa `scrypt` de la biblioteca y conserva longitudes por defecto
8–128; no hay almacén ni algoritmo de contraseñas paralelo.

La verificación usa un JWT de Better Auth, no una fila consumible de la tabla
`verification`. Repetir un enlace vigente devuelve éxito idempotente sin
modificar el usuario ni crear sesión/perfil; un enlace vencido retorna
`TOKEN_EXPIRED` y uno alterado `INVALID_TOKEN`. El reenvío emite un enlace con
vigencia nueva, sin invalidar necesariamente los anteriores. Se conserva
`autoSignInAfterVerification:false`: conocer un enlace ya usado no abre una
sesión. Una sesión existente observa `emailVerified:true` desde DB y supera
la autorización de negocio.

Recuperación usa el almacenamiento/consumo de Better Auth sobre el esquema
B04. Un token consumido, inexistente o vencido recibe 400 `INVALID_TOKEN`.
`revokeSessionsOnPasswordReset:true` elimina las sesiones previas al completar
el cambio. La contraseña anterior deja de servir; la nueva permite login y
conserva `emailVerified` sin habilitar una cuenta no verificada. Se prueba
reutilización secuencial; no se acredita aquí una carrera remota de reset.
Una solicitud anónima a un correo desconocido devuelve el mismo cuerpo y
status que una conocida, sin capturar correo para la desconocida.

Los tokens, contraseñas, cookies y URLs sensibles sólo viven en la DB
temporal o memoria de pruebas; no se registran en la documentación ni logs.
El secreto y URL de los fixtures son sintéticos. No se cambian dependencias.

## Superficie Auth observada, todavía parcial

Prefijo efectivo local: `/api/auth`. Son rutas del handler instalado,
invocadas con Request/Response sin abrir puerto.

| Método | Ruta | Evidencia local |
| --- | --- | --- |
| POST | `/sign-up/email` | Usuario, credencial, perfil, cookie y correo |
| POST | `/sign-in/email` | Login válido y 401 por contraseña incorrecta |
| POST | `/send-verification-email` | Reenvío autenticado/anónimo y cuenta desconocida |
| GET | `/verify-email` | Token válido, repetido, alterado y vencido |
| POST | `/request-password-reset` | Captura de enlace y respuesta genérica |
| GET | `/reset-password/:token` | Retorno local con token válido o error al vencer |
| POST | `/reset-password` | Cambio, consumo y revocación de sesiones |

La consulta `auth.api.getSession` se prueba por API interna con los headers
de cookies reales. B05.12 completará el inventario contractual.

## Reproducción y referencias

```sh
node ./node_modules/vitest/vitest.mjs run tests/auth --reporter=verbose
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Los tests de vencimiento adelantan sólo `Date` con Vitest a +3601 segundos,
mantienen timers/I/O reales y restauran el reloj al terminar. Cada prueba
crea su SQLite temporal y lo retira al cerrar. [Informe diario](evidencia/B05.02-B05.03.md).

Better Auth. (s. f.). *Email*. Recuperado el 22 de septiembre de 2026, de
https://better-auth.com/docs/concepts/email

Better Auth. (s. f.). *Email & password*. Recuperado el 22 de septiembre de
2026, de https://better-auth.com/docs/authentication/email-password

La documentación oficial respalda las opciones de integración; la semántica
exacta de replay/consumo se contrastó con `better-auth@1.7.5`, archivos
`dist/api/routes/email-verification.mjs`, `password.mjs`, `sign-up.mjs`,
`dist/context/create-context.mjs` y las pruebas de esta entrega.
