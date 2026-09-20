# B04.06–B04.07 — sesiones, ítems, eventos y decisiones locales

Las migraciones [`004_study.sql`](../migrations/004_study.sql) y
[`005_events.sql`](../migrations/005_events.sql) continúan las tres anteriores.
`migrateLocal` aplica cada archivo dentro de su propia transacción, registra
SHA-256 y rechaza cambios posteriores al mismo archivo. Su ejecución
predeterminada llega a B04.07; `through` permite probar etapas intermedias.
El SQL es la definición ejecutable de checks, claves y triggers. Los modelos
Drizzle en `src/persistence/` son el mapa de consulta y no reemplazan esos
triggers.

## B04.06: plan diario y clasificación

`study_sessions` tiene una sesión canónica por `(user_id,study_date)`. Guarda
versión, zona, objetivos, tamaño de bloque y semilla del plan como snapshot.
La fecha civil se valida y los campos del plan no se reescriben al cambiar el
perfil. Una sesión con pendientes no se marca completa y una completa no se
reabre. `study_items` conserva por cuenta y sesión la tarjeta, línea y revisión
editorial, clave lógica, orden, clasificación original `new|review`, número de
intento, padre y snapshot base en JSON válido. FKs compuestas impiden vincular
un ítem a la tarjeta o sesión de otra cuenta; la revisión debe pertenecer a la
línea. El origen y los snapshots son inmutables, y un ítem calificado o
cancelado no vuelve a pendiente. Un reintento exige número mayor que uno y
padre explícito. B04.07 añade la comprobación de ese padre frente a una
decisión aplicada, su sesión, línea, tarjeta, origen y número de intento.

Los contadores y `newLineIds` del DTO se derivan de los ítems. La base no
calcula el plan diario ni la nota SRS; B08/B06 harán esas operaciones y
guardarán sesión e ítems en una transacción. La validez completa del JSON y
las fechas/zonas IANA se comprueban con los contratos y el dominio antes de
escribir. La base comprueba identidad y forma básica del snapshot.

## B04.07: reporte congelado, dependencias y recibo

`study_events` guarda el payload completo, su hash canónico suministrado por
la aplicación y campos indexables de propietario, dispositivo, referencias
locales/canónicas, paquete opcional, línea/revisión, fecha, zona e instantes.
Los campos duplicados deben concordar con el JSON. Un evento y su decisión no
se modifican ni se borran. Las referencias canónicas deben pertenecer a la
cuenta y coincidir con el ítem y la revisión; las locales se resuelven después.
El ID de evento es único globalmente y `(user_id,id)` permite FKs compuestas.

Un trigger crea `study_event_dependencies` desde la lista congelada. La base
rechaza IDs repetidos, ciclos, dependencias cruzadas entre cuentas y enlaces
que no aparecen en el payload. Un padre ausente puede llegar después;
`DEPENDENCY_PENDING` no es una decisión terminal. `move_attempts` conserva por
ply el SAN jugado, tiempo y verificación calculada, y exige que el reporte
crudo de ese ply coincida con el evento. Su inserción y la decisión deben
compartir la transacción futura de B06.

`study_session_mappings` y `study_item_mappings` fijan referencias locales por
cuenta y dispositivo. Un ítem local exige el mapeo de su sesión a la misma
sesión canónica. `event_decisions` conserva el JSON original para replay,
motivo y efecto declarados, con FK de cuenta/sesión/ítem y una sola decisión
`applied` por ítem. Las prácticas y decisiones inválidas no consumen esa clave
parcial. El motivo debe corresponder al resultado. Un ítem de reintento solo
puede seguir una decisión aplicada del mismo origen y secuencia.

El servicio B06 todavía debe calcular SHA-256 canónico, validar los esquemas
B02 completos, comprobar Auth, zona conocida, SAN y causalidad antes de
escribir. B04.07 no implementa recepción HTTP, replay, transición de tarjeta
ni CAS de revisión; B04.09 añade adaptadores y B04.10 prueba el esquema de
producto en Turso remoto. `package_id` queda sin FK hasta B04.08.

## Reproducción local

```sh
node ./node_modules/vitest/vitest.mjs run tests/persistence/study-migrations.test.ts tests/persistence/events-migrations.test.ts tests/persistence/schema-mapping.test.ts
node ./node_modules/vitest/vitest.mjs run
node ./node_modules/eslint/bin/eslint.js .
node ./node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node contracts/generate.mjs && node ./node_modules/typescript/bin/tsc -p tsconfig.json
```
