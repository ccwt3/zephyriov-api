# B05.09–B05.10 — sesiones y límites durables

## Ficha previa

- **Repositorio/archivos:** API; `src/auth/`, `tests/auth/`, docs, README y
  Branch_changes. Reutilizar tablas/adaptadores B04; sin migraciones, sockets,
  rutas de negocio ni cambios en clientes o dependencias.
- **Fuentes:** `docs/next-job`, plan agéntico §§3, B05 y 13, backend §B05;
  Better Auth/Expo 1.7.5 y libSQL 0.18.0 instalados, B02/B04/B05.01–08.
- **Objetivo:** logout/revocación/expiración con frontera para B10; después
  límites durables Auth/negocio y presupuesto de correo consumido antes del envío.
- **Aceptación:** aislamiento entre sesiones/cuentas, recuperación y cookie
  obsoleta; N/N+1, Retry-After, ventana, último cupo concurrente, persistencia
  tras reinicio y correo agotado/fallido sin verificar cuenta.
- **Pruebas:** TDD separado en `tests/auth/`; suite, lint, typecheck y build.
- **Salida:** construido_local/probado con SQLite y handler real. Resend real
  corresponde a B05.11; sockets a B10. Sin acceso remoto en estos dos puntos.
- **Modelo/revisión:** agente principal, revisión del diff y casos negativos;
  sin subagentes. Al iniciar no había intervención manual prevista; durante
  la regresión se encontró M18, descrito debajo.
- **Límites de entrada:** HTTP 401 remoto histórico de B05.08 no se reintenta;
  no acredita migración 007 en Turso. Cambios previos de entorno se conservan.

## Estado al detenerse (2026-09-28)

**B05.09 completado localmente. B05.10 incompleto, detenido por M18.**
El usuario decidió «Dejar B05.10 detenido y documentado». La regresión actual
tiene 273 pruebas pasadas, una fallida y nueve opt-in omitidas. Lint,
typecheck y build pasan. El commit es trabajo parcial, no una entrega validada
de los limitadores. [Informe diario](evidencia/B05.09-B05.10.md) y
[bloqueo/reproductor M18](manual-M18.md).

## B05.09: sesión e interfaz de invalidación

Better Auth conserva el manejo de cookies, contraseñas, tokens y sesiones.
Se fijan explícitamente 604800 segundos de vigencia y 86400 segundos para
renovación, sin cookie cache. El hook `session.delete.after` entrega solamente
`{userId, sessionId}` a `onSessionInvalidated`, después del borrado confirmado.
Cubre `/sign-out`, `/revoke-session`, `/revoke-other-sessions`,
`/revoke-sessions`, recuperación y eliminación de sesiones expiradas al consultar.
Logout repetido es idempotente y no borra el perfil.

`auth.sessionLifecycle.check(reference, now)` consulta propietario y vencimiento
en la base primaria, sin tokens ni cookies. Devuelve `expiresAt` o `null` y
considera inválido el instante exacto de vencimiento. B10 deberá consultarlo al
adjuntar, al llegar el vencimiento y durante la revalidación de conexiones;
el hook permite invalidación inmediata de borrados locales. Aquí no hay sockets,
temporizadores, bus entre instancias ni garantía de entrega durable de avisos.
El consumidor debe manejar avisos repetidos y comprobar la base si pierde uno.
Un fallo del consumidor del hook no deshace el borrado ya confirmado.

Las siete pruebas nuevas verifican cookies borradas, sesión antigua rechazada,
otras sesiones preservadas, cuenta ajena intacta, recuperación y renovación.
La expiración HTTP se prueba después del vencimiento; no se cambia el criterio
interno de Better Auth en el milisegundo exacto. Fuente contrastada con el código
instalado y [documentación oficial de sesiones](https://better-auth.com/docs/concepts/session-management),
consultada el 2026-09-28.

## B05.10: implementación parcial conservada

`usage-limits.ts` reutiliza `rate_limit_buckets` de la migración 006. Ventanas
fijas desde epoch, consumo mediante UPSERT condicionado y transacción para
reservar todas las dimensiones o ninguna. No se reinician contadores al crear
otra instancia. Rechazos de cupo producen 429 con `Retry-After` redondeado hacia
arriba, expuesto mediante CORS; fallos de almacenamiento producen 503 seguro.
Los reintentos de bloqueo local son acotados a seis esperas (630 ms en total),
después de rollback, sin repetir transportes ni errores remotos ambiguos.
**Estos reintentos no resuelven M18.**

Los ámbitos de negocio `read` y `study` son los exigidos por el CHECK de B04.
`requireLimitedSession` obtiene una sesión verificada antes del cupo, con
60 lecturas/minuto/cuenta y 30 eventos/minuto/cuenta. Un lote cuenta cada evento,
acepta 1–20 y se rechaza completo si excede el saldo. No modifica tarjetas,
eventos, actividad ni calificaciones. El límite de 256 KiB ya pertenece al
contrato B02; B06/B09 deben validarlo en el cuerpo HTTP y conectar esta entrada.

La frontera HTTP Auth usa grupos globales explícitos y claves de identidad
normalizadas con HMAC del secreto del servidor. No almacena emails, tokens,
URLs ni cabeceras IP en los cupos. Se desactiva el limitador en memoria de
Better Auth porque lo sustituye esta admisión durable; no se confía en IP enviada
por el cliente. La extracción de IP desde un proxy confiable no está implementada.
Las mutaciones directas por `auth.api` se rechazan con `AUTH_HANDLER_REQUIRED`;
se deben invocar por el handler. `auth.api.getSession` sigue disponible para
autorización interna. No se cambian controles CSRF/origen de Better Auth.

| Grupo / rutas | Límite de ensayo | Ámbito |
|---|---|---|
| Registro `/sign-up/email` | 10/min y 3/h | Global y email |
| Login `/sign-in/email` | 30/min y 10/min | Global y email |
| Reenvío y solicitud de reset | 20/min | Global compartido |
| Reset, callback de reset, cambio/set de contraseña | 10/min | Global compartido |
| `/verify-email` | 30/min | Global |
| Social, linking, unlinking y callbacks OAuth | 30/min | Global compartido |
| Consulta/lista, logout y revocaciones de sesión | 120/min | Global compartido |
| Otras rutas Auth | 60/min | Global compartido de respaldo |
| Presupuesto de intentos de correo | 100/día UTC y 5/h | Global y email, compartido entre verificación/reset |

Estos valores locales son configurables en `AuthOptions.limits`; no son cuotas
confirmadas de Resend ni una medición aceptada de capacidad productiva. La
medición de hashing y la adecuación a cuota real quedan pendientes, con B05.11
sin iniciar. No cambiar ventana/secreto/configuración durante una ventana y
afirmar que se conserva la misma identidad del contador. Los grupos globales
son conservadores y pueden afectar a otras cuentas cuando se agotan.

Las peticiones de registro/reenvío/reset reservan correo antes de consultar la
cuenta, incluso si el email es desconocido, ya verificado o el cuerpo se rechaza
después por Auth. Es un presupuesto conservador de intentos; no se devuelve el
cupo de reservas no usadas. Así el agotamiento de cuota no revela existencia de
cuentas. El callback de correo encola únicamente dentro de la petición; el
transporte se espera tras respuesta satisfactoria de Auth y después de commit.
Rollback de Auth descarta ese envío. Esto evita escrituras de contadores dentro
de una transacción Auth y evita que su manejo de tareas de fondo oculte un fallo.

Éxitos/fallos de transporte se cuentan de forma durable en ámbitos
`email:sent:<kind>` y `email:failed:<kind>`, sin datos sensibles. Un fallo mantiene
la reserva, devuelve 503 y conserva la cuenta sin verificar; no confirma envío.
La cola de la petición es en memoria, sin reintento automático: un cierre de
proceso puede dejar una reserva sin resultado. Tampoco un recibo del transporte
garantiza entrega al buzón. B05.11 debe integrar y probar Resend real por HTTPS.

Las once pruebas nuevas de cupos pasan localmente, incluidas dos conexiones,
reapertura de base, 429/CORS, agotamiento global, fallo de envío, rollback y
prohibición de saltarse la admisión. No constituyen cierre de B05.10 porque
la regresión de vinculación OAuth falla al intentar otro flujo después de
la carrera, con 503 causado por `SQLITE_BUSY` persistente al confirmar.
