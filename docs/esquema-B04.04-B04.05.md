# B04.04–B04.05 — catálogo, repertorio y tarjetas locales

Las migraciones [`002_catalog.sql`](../migrations/002_catalog.sql) y
[`003_cards_repertoire.sql`](../migrations/003_cards_repertoire.sql) continúan
`001_identity_profile.sql`. `migrateLocal` aplica cada archivo en una
transacción de escritura, registra su SHA-256 y se detiene si cambia un archivo
ya aplicado. El parámetro `through` permite probar una etapa sin ejecutar las
siguientes. La migración predeterminada aplica las tres. El SQL versionado es
la definición ejecutable; los modelos Drizzle en `src/persistence/` permiten
consultar las tablas. Los triggers y la FK diferida de color están definidos
en SQL porque el modelo Drizzle no expresa toda su semántica.

## Catálogo y publicación

`openings` conserva ID, slug único y colores permitidos; `lines` conserva la
identidad estable de la línea. `line_revisions` guarda jugadas y referencias
JSON, hashes, generación de secuencia y número de jugadas propias por color;
una revisión no se modifica ni borra. `manifest_lines` une una línea con una
revisión de esa misma línea y fija orden de apertura, orden de línea y estado
para un manifiesto. El orden de apertura vive en esa relación para que las
lecturas de un manifiesto antiguo conserven su orden; el sellado comprueba que
todas las líneas de una apertura usen el mismo orden de apertura.

Un manifiesto se carga en `staging` con un número declarado de líneas. Solo
puede pasar a `validated` cuando se cargaron exactamente esas líneas; después
no se cambian sus relaciones ni su conteo. `catalog_head` es una fila única y
solo apunta a un manifiesto `validated` o `active` completo. La actualización
del puntero y la carga que la precede deben compartir una transacción del
publicador futuro B07. La base impide borrar el puntero, alterar una revisión
sellada y marcar como `superseded` el manifiesto al que aún apunta. B04.04
prueba que una carga fallida revierte sus filas y conserva el puntero previo.

## Repertorio y tarjetas

`user_openings` tiene una fila por cuenta y apertura, versión decimal canónica,
color permitido y estado activo. Desactivar conserva la fila; un trigger
impide borrarla. `cards` tiene una fila por cuenta y línea. `opening_id` se
guarda también en la tarjeta para que una FK compuesta compruebe que la línea
pertenece a la apertura; otra FK compuesta y diferida exige una selección de
la **misma cuenta, apertura y color**. Esa FK permite cambiar color y tarjetas
en una sola transacción, y rechaza al confirmar un cambio de color incompleto.
La tarjeta guarda los campos del contrato B02: generaciones personal/editorial,
versión, estado, profundidad, intervalo, vencimiento, reps, lapses y nota.
Las versiones no retroceden; los campos numéricos y el intervalo decimal
tienen restricciones. Índices cubren selección por cuenta/estado/vencimiento
y repertorio activo.

La base no decide cuándo generar una nueva generación ni calcula el reset SRS:
eso requiere el caso de uso B08 y la revisión editorial B07. Tampoco valida la
legalidad de SAN, el contenido semántico de JSON, fechas gregorianas reales o
el catálogo visible por HTTP; esas validaciones corresponden a sus capas.
La prueba remota del esquema completo sigue en B04.10. No hay datos de
producto migrados a Turso en estos dos puntos.

## Reproducción

```sh
node ./node_modules/vitest/vitest.mjs run tests/persistence/catalog-migrations.test.ts tests/persistence/cards-migrations.test.ts tests/persistence/schema-mapping.test.ts
node ./node_modules/vitest/vitest.mjs run
node ./node_modules/eslint/bin/eslint.js .
node ./node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node contracts/generate.mjs && node ./node_modules/typescript/bin/tsc -p tsconfig.json
```
