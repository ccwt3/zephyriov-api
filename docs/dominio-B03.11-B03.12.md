# B03.11–B03.12 — paridad y paquete local del dominio

## Alcance y fuente

`plan-trabajo-agentico.md` §B03.11–.12, §3 y §13 exige comparar las salidas
normalizadas en Node y Android, auditar las capas R01–R22 y dejar un export
local instalable. `plan-accionable-backend.md` §B03 exige funciones puras y
separa HTTP, DB y clientes. La especificación activa es `docs/reglas-srs.md`
con 352 casos en 22 JSON de `src/domain/fixtures/`; T01 comprueba que sus
bytes coinciden con la referencia. No se modificaron esos JSON ni el SRS.

## Comparación reproducible

`tools/android-consumer/parity-cases.mjs` recibe las mismas entradas B01 y
funciones compiladas en ambos runtimes. El adaptador verifica expectativas
independientes para la porción pura y ordena recursivamente las claves del
JSON antes de compararlo. Node ejecuta `node-parity.mjs`; el APK de ensayo
WebView agrupa el export público del tarball y los fixtures. `compare.mjs`
recupera el JSON Android en fragmentos Base64 del log, lo compara byte a byte
con el JSON normalizado de Node y desinstala el APK de prueba al terminar,
incluso si falla la comparación. Rechaza trabajar si ese paquete ya existe.
No toca otras aplicaciones ni limpia el log del sistema.

Se comparan 238 porciones de fixtures: 184 de R01–R16, 22 de R20 y 32 de
R21. Se añaden casos directos de serialización decimal/fecha, semilla repetida
y reordenada, bisiestos 2000/2100, DST, enroque, captura al paso, promoción
a dama y rechazos estructurales. Los 114 fixtures restantes describen
principalmente sesión, transporte, DB, cierre real o estado del cliente. La
paridad de una función pura dentro de R20/R21 tampoco acredita por sí sola
las demás expectativas de esos fixtures.

## Matriz por regla y capa

`x/y` indica cuántos fixtures tienen una porción pura comparada en B03.11.
Todos los 352 tienen especificación B01/T01; las capas posteriores siguen
pendientes. Una fila con `x/y` no declara cerrado el caso integrado.

| Regla | B03 Node/Android | Garantía posterior necesaria |
|---|---:|---|
| R01 | 8/8 nota | B06 HTTP; C03/C09 interacción |
| R02 | 8/8 nota | B06 HTTP; C03/C09 interacción |
| R03 | 14/14 nota | B06 HTTP; C03/C09 interacción |
| R04 | 10/10 nota | B06 HTTP; C03/C09 interacción |
| R05 | 8/8 transición | B06 transacción/reintento; C04/C06 |
| R06 | 14/14 transición | B06 transacción/reintento; C04/C06 |
| R07 | 4/4 transición | B06 contadores; C04/C06 |
| R08 | 10/10 transición | B06 contadores; C04/C06 |
| R09 | 4/4 transición | B06 contadores; C04/C06 |
| R10 | 6/6 transición | B06 contadores; C04/C06 |
| R11 | 16/16 profundidad | B06 tarjeta persistida; C04/C06 |
| R12 | 20/20 plan | B08 sesión; B09/C06 offline |
| R13 | 10/10 plan | B08 sesión; B09/C06 offline |
| R14 | 16/16 actividad | B06/B08/B09 persistencia; C05 |
| R15 | 16/16 actividad | B06/B08/B09 reordenación; C05 |
| R16 | 20/20 actividad | B06/B08/B09 persistencia; C05 |
| R17 | 0/24 | B07/B08 generaciones/retiro; B09/C06/C10 conflicto |
| R18 | 0/24 | B06 recibo; C04/C06/C09 cierre y almacenamiento reales |
| R19 | 0/28 | B08/B09 snapshots; C05/C06/C10 presentación |
| R20 | 22/28 fecha/ventana | B08/B09 atribución; C03/C06/C09/C10 ciclo real |
| R21 | 32/32 fecha/racha | B08/B09 atribución; C03/C06/C09/C10 ciclo real |
| R22 | 0/32 | B06/B09 decisión y replay; C04/C09/C10 transporte |

`projectPendingEvents` sí tiene pruebas puras propias para dependencias y
reintentos, pero los fixtures R18/R22 requieren efectos durables y decisiones
de transporte; no se marcaron como aprobados por esa proyección.

## Export, versiones y límites

`zephyriov-api/domain` expone solo el barril `src/domain/index.ts`, sus tipos
y las funciones B03. `DOMAIN_VERSION = B03.12-v1` identifica la conducta;
`PLAN_GENERATOR_VERSION = fnv1a-xorshift32-v1` identifica el orden de selección.
El primer tarball local usa versión de paquete `0.0.1` y se fija por SHA-256
en el informe. No se publica en un registro; `private:true` sigue activo.
`chess.js` 1.4.0 es la única dependencia externa importada por producción del
dominio; las demás importaciones son relativas dentro de `src/domain/`.
No hay imports de framework, red, DB ni Node en producción.

Las fechas civiles usan `Date` UTC para aritmética de calendario e `Intl`
para zona IANA; los intervalos usan enteros `bigint` y cadenas decimales.
El ensayo Android 11/WebView mide compatibilidad para los casos enumerados,
sin prometer igual tzdata en todos los dispositivos. Cambiar versiones de
`Intl`, `chess.js`, redondeo o algoritmo de semilla requiere nueva versión del
dominio y nueva comparación. Un paquete ya entregado no se reescribe.

El consumidor temporal agrupa el código del tarball, pero resuelve
`chess.js` desde el `node_modules` local de ensayo. El consumo de export y
declaraciones también se verificó desde un tarball extraído con esa
dependencia enlazada: no equivale todavía a una instalación remota limpia.
HTTP, Auth, DB, offline físico y clientes de producto siguen sus propios puntos.
