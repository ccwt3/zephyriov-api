# B04.03 — migración local de identidad y cuenta

La migración versionada [`001_identity_profile.sql`](../migrations/001_identity_profile.sql)
crea las cuatro tablas base del esquema SQLite de Better Auth 1.7.5
(`user`, `session`, `account`, `verification`) y tres tablas propias:
`profiles`, `settings_revisions` y `account_revisions`. El esquema Auth se
obtuvo del generador instalado con `getAuthTables({})`. El generador también
emitió relaciones v2 que requieren una API ausente en Drizzle 0.45.2; se
conservaron sus definiciones de tablas y se omitieron esas relaciones. La
prueba del adaptador instalado escribe usuario y sesión en la base migrada.

`profiles` guarda ajustes vigentes, versión y fecha de onboarding;
`settings_revisions` conserva cada versión para interpretar snapshots antiguos.
Sus filas no admiten UPDATE ni DELETE. `account_revisions` conserva una
revisión decimal canónica por usuario; un trigger impide retrocederla. Las
revisiones de ajustes y cuenta se almacenan como texto para no limitar el
contrato decimal a los 64 bits de SQLite. Hay checks de objetivos 1–12/2–10,
texto de zona no vacío, formato de revisión, claves únicas y referencias a
`user`. La validez IANA de la zona y el incremento CAS por mutación visible
corresponden a los casos de uso posteriores; la base no puede inferirlos sola.

[`migrateLocal`](../src/persistence/migrate.ts) activa foreign keys, aplica el
SQL y registra su SHA-256 dentro de una transacción de escritura. Una segunda
ejecución compara el hash y conserva esquema y datos. Está destinada a una
base local nueva; el esquema de producto no se aplicó a Turso remoto. Los
scripts SQL no dependen de `drizzle-kit`, así que B04.03 no añadió paquetes.
El archivo SQL debe viajar junto con el artefacto compilado si se ejecuta
`dist/persistence/migrate.js`.

Para repetir el ensayo local:

```sh
node ./node_modules/vitest/vitest.mjs run tests/persistence/local-migrations.test.ts
node ./node_modules/vitest/vitest.mjs run
node ./node_modules/eslint/bin/eslint.js .
node ./node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node contracts/generate.mjs && node ./node_modules/typescript/bin/tsc -p tsconfig.json
```

El esquema final de opciones y plugins de Better Auth se revisará en B05
antes de usar identidad HTTP. Las migraciones de catálogo, tarjetas y eventos,
la validación remota del producto y la integración HTTP quedan para sus
puntos previstos.
