# B05.01 — integración Better Auth y perfil estable

`src/auth/auth.ts` crea la instancia de Better Auth 1.7.5 sobre Drizzle/libSQL
con el esquema efectivo de B04 y conserva `transaction: true` en el adaptador.
El correo y contraseña permanecen deshabilitados en este punto: registro,
login y autorización de cuentas no verificadas pertenecen a B05.02.

El hook `databaseHooks.user.create.after` usa el ID estable emitido por Better
Auth para crear las tres filas de producto de una cuenta. Los valores iniciales
son ajustes versión `"1"`, seis líneas nuevas, cuatro jugadas por bloque, zona
`UTC` y revisión de cuenta `"1"`. El perfil comienza sin onboarding. Estos
valores materializan los defaults del contrato B02 y permiten que la primera
lectura visible tenga una revisión propia.

`ensureAccountProfile` abre una transacción de escritura y usa conflictos como
no-op para `profiles`, `settings_revisions` y `account_revisions`. Una
repetición llena filas faltantes, pero no reemplaza preferencias o revisiones
existentes. Las llamadas simultáneas del mismo proceso y usuario comparten la
inicialización en curso; la unicidad de la base conserva la idempotencia entre
procesos. Si el usuario Auth no existe, la FK aborta la transacción y no queda
ninguna fila parcial.

Las pruebas usan el `internalAdapter.createUser` de la instancia instalada, no
un mock del hook, y comprueban normalización de correo, conservación del ID,
defaults, repetición simultánea y rollback. Este punto no expone un handler
HTTP, no crea sesiones ni cuentas de proveedor y no demuestra verificación de
correo, cookies, CORS, CSRF, OAuth o revocación.

Reproducción:

```sh
node ./node_modules/vitest/vitest.mjs run tests/auth/better-auth.test.ts --reporter=verbose
node ./node_modules/vitest/vitest.mjs run
node ./node_modules/eslint/bin/eslint.js .
node ./node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node contracts/generate.mjs && node ./node_modules/typescript/bin/tsc -p tsconfig.json
```
