# B04.08–B04.09 — persistencia operativa y adaptadores locales

La migración [`006_operational.sql`](../migrations/006_operational.sql) se aplica
después de eventos, en una transacción con checksum. `migrateLocal` llega ahora
a seis archivos por defecto; `through` conserva las etapas anteriores. El SQL
versionado define los triggers y checks; los modelos Drizzle de
`src/persistence/operational-schema.ts` sirven para consultas y no sustituyen
el SQL.

## B04.08: tablas y restricciones

`offline_packages` conserva por cuenta y dispositivo el paquete emitido, su
JSON, hash, revisión base, manifiesto y ventanas UTC de 7×24 horas de estudio
y otras 7×24 horas de entrega. No admite actualización ni borrado. La FK al
manifiesto y al usuario comprueba existencia; un trigger nuevo en
`study_events` rechaza un paquete de otra cuenta o dispositivo. El contrato
B02 y el caso B09 aún deben validar el contenido completo y recalcular el
hash antes de la emisión. Una entrega tardía puede conservarse como práctica;
la base no descarta eventos por tiempo de llegada.

`activity_days` tiene clave `(user_id,study_date)`, día civil válido y contadores
positivos que no retroceden. La transacción del caso de uso deberá calcular las
líneas distintas y el día del bloque; el esquema impide duplicar el día y
moverlo a otra cuenta. `rate_limit_buckets` usa clave
`(scope,subject_key,window_start)`, ventana positiva y `used <= limit_count`.
Las claves de ámbitos por cuenta deben coincidir con `user_id`; las de otros
ámbitos no llevan propietario de cuenta. El límite y la ventana no se alteran
en una fila existente; el contador no se reinicia. Los valores finales de
ámbitos Auth y correo siguen el ensayo B05.

`realtime_tickets` guarda SHA-256 del secreto, usuario, sesión Auth y expiración
exacta a 30 segundos. Un trigger comprueba la propiedad de la sesión al emitir.
No hay FK persistente a `session`: Better Auth puede borrar esa sesión al cerrar
o revocar acceso. El consumo exige que aún exista y no esté expirada. El único
cambio permitido al ticket es fijar una vez `consumed_at`; el secreto en claro
nunca entra en la tabla. B10 integrará generación aleatoria, transporte y
revocación de socket.

## B04.09: adaptadores y lecturas

[`adapters.ts`](../src/persistence/adapters.ts) expone lecturas agrupadas de
cuenta y sesión, CAS de revisión, consumo de ticket y adquisición de cupo.
Cada lectura usa una transacción `read` sobre el cliente libSQL del primario,
consulta revisión y filas propias en el mismo snapshot y compara revisiones
decimales con `BigInt`. Devuelve filas de persistencia, no DTO públicos: B08
construirá las respuestas, la reconciliación editorial y el manejo HTTP de
`REVISION_NOT_READY`. El llamador debe proporcionar el cliente del primario;
esta capa no configura réplicas ni reintentos de red.

El CAS incrementa exactamente uno dentro de la transacción de escritura del
llamador y devuelve `null` cuando la revisión esperada ya no coincide. El cupo
usa un solo `INSERT … ON CONFLICT DO UPDATE … RETURNING`, por lo que el último
cupo no se concede dos veces. El ticket usa un solo `UPDATE … RETURNING` con
propietario, tiempo y sesión Auth vigente. B05/B10 decidirán ámbitos, valores
y uso por ruta; estos adaptadores no implementan HTTP ni autorización Auth.

En SQLite local, `EXPLAIN QUERY PLAN` usó `sqlite_autoindex_cards_2` para
tarjetas por cuenta, `sqlite_autoindex_study_sessions_2` para sesión por día,
`sqlite_autoindex_study_items_5` para ítems por sesión,
`activity_days_user_date_idx` para actividad y
`offline_packages_user_device_issued_idx` para paquetes. Estas mediciones no
son planes ni latencias del primario remoto; B04.10 hará la prueba del esquema
en Turso y B08.08 medirá lecturas con datos reales.

## Reproducción

```sh
node ./node_modules/vitest/vitest.mjs run tests/persistence/operational-migrations.test.ts tests/persistence/adapters.test.ts tests/persistence/schema-mapping.test.ts
node ./node_modules/vitest/vitest.mjs run
node ./node_modules/eslint/bin/eslint.js .
node ./node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node contracts/generate.mjs && node ./node_modules/typescript/bin/tsc -p tsconfig.json
```
