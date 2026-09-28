# M18 local — B05.10 detenido por contención de libSQL

- **Estado:** pendiente; el 2026-09-28 el usuario eligió explícitamente
  «Dejar B05.10 detenido y documentado». No se autorizaron cambios de driver,
  dependencias, lockfile ni persistencia en esta sesión.
- **Dueño:** desarrollador para autorizar el alcance de una próxima sesión;
  agente para investigar/corregir después de esa autorización.
- **Punto bloqueado:** B05.10. B05.09 pasó sus siete pruebas; B05.11 no iniciado.
- **Entorno observado:** Linux 7.2.7-arch1-1 x86_64, Node 26.10.0,
  `@libsql/client` instalado 0.18.0, SQLite local sobre archivo temporal.
  El proyecto declara Node 24; no se extrapola el defecto a otros runtimes
  o al servicio Turso. No se consultaron credenciales ni proveedores.

## Reproductor preparado

```sh
node tests/auth/libsql-lock-probe.mjs
```

Usa únicamente el driver, una tabla sintética con UNIQUE y un archivo temporal.
Secuencia: mantener una transacción de escritura, provocar `SQLITE_BUSY` al
iniciar otra, confirmar la primera y una segunda; disputar una identidad
UNIQUE con dos sentencias; leer y abrir una nueva transacción. El último commit
debería funcionar, pero devuelve `SQLITE_BUSY`.

Resultado observado: salida 1,
`FAIL: transaction after contention/UNIQUE: SQLITE_BUSY`.
El script cierra conexiones y elimina su directorio temporal. No modifica base
de producto ni cambia pragmas, dependencias o esquema.

La misma interacción afecta a
`tests/auth/linking.test.ts`, caso
`two concurrent links of the same Google subject cannot create duplicate accounts`.
La identidad sigue siendo única, pero iniciar el flujo siguiente devuelve 503
en lugar de 200. El limitador reintenta seis veces y sigue fallando en commit.
La instrumentación temporal comprobó que no quedaban transacciones registradas
abiertas y fue retirada; tampoco se conserva ningún intento de forzar GC.

## Acción pendiente

Autorizar otra sesión para comprobar el entorno soportado (Node 24), aislar la
causa en el driver instalado y elegir una corrección mantenible. Si requiere
modificar versiones, ampliar expresamente el alcance a `package.json`, lockfile,
pruebas de persistencia y documentación de compatibilidad. No elegir ni instalar
una versión sin verificar la causa. No sustituir el driver, reabrir conexiones
por cada error ni ocultar la regresión eliminando el test.

Aceptación posterior: reproductor corregido, carrera OAuth completa con reintento,
límites N/N+1 y último cupo con escritores independientes, reinicio sin resetear
consumo, suite/lint/typecheck/build aprobados. Reevaluar la compatibilidad remota
si cambia el driver; el HTTP 401 histórico de B05.08 es un límite distinto.
Solo entonces cerrar B05.10 y mover `docs/next-job` a B05.11.
