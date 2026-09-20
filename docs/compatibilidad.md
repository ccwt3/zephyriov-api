# Compatibilidad B04.01–B04.02: transacciones locales y remotas

Fecha de consulta y ensayo: 2026-09-19. B04.01 fijó una combinación exacta y
la probó localmente; B04.02 ensayó esa combinación sobre Turso remoto antes de
diseñar las migraciones B04.03.

| Componente | Versión fijada | Relación comprobada |
| --- | --- | --- |
| Node.js | 24.21.0 LTS | Runtime objetivo del proyecto; ensayo completo en Linux x64. Node 26.9.0 se usó como control local. [Estado oficial de versiones](https://nodejs.org/en/about/previous-releases). |
| pnpm | 12.4.2 | `install --frozen-lockfile`, tests, lint, typecheck y build aprobados con el lockfile actual. |
| `@libsql/client` | 0.18.0 | Driver local `:memory:`; SQLite informó `3.45.1`. [SDK oficial](https://github.com/tursodatabase/libsql-client-ts) y [paquete](https://www.npmjs.com/package/@libsql/client). |
| `drizzle-orm` | 0.45.2 | El peer del adaptador acepta `^0.45.2`; `db.transaction` hizo commit y rollback usando el cliente libSQL. [Transacciones](https://orm.drizzle.team/docs/transactions), [conexión Turso](https://orm.drizzle.team/docs/sqlite/connect-turso) y [paquete](https://www.npmjs.com/package/drizzle-orm). |
| `better-auth` y `@better-auth/drizzle-adapter` | 1.7.5 ambos | Versiones emparejadas; el adaptador requiere `@better-auth/core ^1.7.5` y Drizzle `^0.45.2` (o 1.x RC). [Adaptador oficial](https://better-auth.com/docs/adapters/drizzle), [paquete Auth](https://www.npmjs.com/package/better-auth) y [paquete adaptador](https://www.npmjs.com/package/@better-auth/drizzle-adapter). |

La prueba aislada vive en `tests/persistence/local-transaction-probe.test.ts`;
su montaje en `tools/b04/local-probe.mjs` crea tablas sintéticas en memoria y
cierra el cliente al acabar. Se comprueban commit y rollback explícitos del
driver, lectura dentro de la transacción Drizzle, reversión de dos escrituras
tras un fallo inyectado, reutilización de la conexión y commit/rollback a través
de `DBAdapter.transaction` de Better Auth. La configuración del adaptador usa
`transaction: true`: en la versión instalada el valor predeterminado es
`false`, que ejecutaría las operaciones secuencialmente sin rollback real.
Esta opción deberá conservarse en la integración B05. El esquema `user` de
ensayo tiene solo los campos necesarios para probar escrituras del adaptador;
no es el esquema generado de Auth ni una migración del producto.

Reproducción sin secretos, desde la raíz API:

```sh
pnpm install --frozen-lockfile
pnpm exec vitest run tests/persistence/local-transaction-probe.test.ts
pnpm test
pnpm lint
pnpm typecheck
pnpm build
python3 docs/evidencia/verificar-T01.py
```

La preparación M04 aportó una base Turso **de ensayo aislada**, URL de base y
token DB mínimo en `.env` (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`). El token
administrativo de provisión no se usó como token de runtime. La prueba local
por sí sola no demostraba semántica, latencia, bloqueo entre writers ni
compatibilidad Auth remota; el ensayo siguiente cubre las operaciones
sintéticas definidas para B04.02. Tampoco demuestra un flujo HTTP de registro
o sesión. No se ha verificado la cuota vigente del plan Free.

## B04.02 — ensayo remoto del primario

El 2026-09-19 se usó la base **aislada de ensayo** confirmada por el
desarrollador en `libsql://zephyriov-playground-ccwt3.aws-us-east-2.turso.io`.
El desarrollador confirmó **motor SQLite, plan Free y región US**. El hostname
identifica el endpoint `aws-us-east-2`; ese código procede de la URL, no de una
medición geográfica adicional. El token DB permanece solo en `.env`, que Git
ignora. La consulta remota devolvió `sqlite_version() = 3.47.0` y cero tablas
antes del ensayo.

`tests/persistence/remote-transaction-probe.test.ts` abre dos clientes
libSQL independientes. `tools/b04/remote-probe.mjs` crea tres tablas
sintéticas con un prefijo UUID por corrida y las elimina al acabar. La prueba
requiere la bandera explícita `B04_REMOTE_PROBE=1`; el conjunto local la omite
para no escribir accidentalmente en Turso. El adaptador Better Auth conserva
`transaction: true`. La carrera aplica desde ambas conexiones el mismo CAS
`revision = 0 → 1`; exactamente una actualización afectó una fila y ambas
conexiones leyeron la revisión final `1`.

| Caso remoto | Resultado | Latencia observada en una corrida |
| --- | --- | ---: |
| Creación de tablas y consulta de versión | pasó | 1000 ms |
| Driver: dos escrituras confirmadas y dos revertidas, leídas por segundo cliente | pasó | 479 ms |
| Drizzle: fallo inyectado tras dos escrituras y reutilización | pasó | 407 ms |
| Adaptador Auth: confirmación y reversión | pasó | 482 ms |
| Dos writers sobre la misma revisión | pasó, una fila afectada en total | 457 ms |
| Limpieza y comprobación de cero tablas restantes | pasó | 328 ms |

Estas latencias son una muestra de extremo a extremo por caso, no una medida
de rendimiento ni una garantía de servicio. El ensayo verifica la semántica
remota de las operaciones sintéticas, no el esquema de producto, Auth HTTP ni
el caso definitivo B06. Con los datos no secretos de M04 registrados, B04.02
queda cerrado; B04.03 es el siguiente punto.

Reproducción desde la raíz API, con `.env` local y base de ensayo confirmada:

```sh
B04_REMOTE_PROBE=1 node --env-file=.env ./node_modules/vitest/vitest.mjs run tests/persistence/remote-transaction-probe.test.ts --reporter=verbose
```
