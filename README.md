# zephyriov-api

## Reconstrucción

El [estado de trabajo agéntico](docs/next-job) es la fuente única del siguiente
punto. T01 transfirió la [especificación SRS activa](docs/reglas-srs.md),
su [índice](docs/fixtures-srs.md) y 22 JSON de `src/domain/fixtures/` desde la
referencia con hashes idénticos: 352 variantes declarativas. T02 preparó el
paquete TypeScript mínimo. B01 y G01 están cerrados solo en especificación.
B02.01–B02.02 añadieron el
[contrato local de primitivas, errores y catálogo](docs/contrato-B02.01-B02.02.md);
B02.03–B02.04 añadieron el
[contrato de perfil, ajustes, repertorio, sesión y onboarding](docs/contrato-B02.03-B02.04.md).
El [contrato B02.07–B02.08](docs/contrato-B02.07-B02.08.md) añade paquete
offline/renovación y lecturas con revisión, ticket, avisos y readiness.
El siguiente punto es B03.09, proyección pura de eventos pendientes.

La raíz API se construye con Node.js 24 y pnpm 12.4.2. `pnpm install`,
`pnpm test`, `pnpm lint`, `pnpm typecheck` y `pnpm build` son los comandos
del esqueleto. El paquete exporta la versión de especificación y
`zephyriov-api/contracts` con esquemas Zod y ejemplos instalables desde un
tarball local. Los esquemas son fuente única; DTO TypeScript y OpenAPI se
generan desde los esquemas Zod en B02.09. Todavía no contiene el motor SRS
completo, HTTP ni persistencia. La [evidencia T01](docs/evidencia/T01.md)
y [evidencia T02](docs/evidencia/T02.md) detallan verificación y límites.

**B03.01–B03.02 — runner y fechas (2026-09-19):** `src/domain/` contiene un
runner puro que recorre las 352 variantes B01 sin generar expectativas y
funciones de fecha civil gregoriana, conversión IANA y límites UTC con reloj
inyectado. Se usa `Date`/`Intl` de Node 24.21.0 (ICU 78.3, tzdata 2026c),
sin una biblioteca temporal adicional. El dominio todavía no se exporta como
artefacto instalable; B03.10–B03.12 comprobarán su consumidor Android.
[Diseño y límites](docs/dominio-B03.01-B03.02.md) ·
[informe diario](docs/evidencia/B03.01-B03.02.md).

**B03.03–B03.04 — intervalo y verificación (2026-09-19):** el intervalo
`review/good` se calcula con `bigint`: `1.00 → 3.00` en el primer repaso y
después `×2.5`, con redondeos independientes para persistencia y fecha civil.
No hace falta biblioteca decimal para esta escala y factor fijos. La
verificación de intentos usa `chess.js` 1.4.0 para legalidad y SAN canónico,
exige plies y tiempos completos y continúa por la teoría tras un error legal.
La nota del bloque corresponde a B03.05; los archivos compilados aún no tienen
un export público de dominio. [Diseño y límites](docs/dominio-B03.03-B03.04.md) ·
[informe diario](docs/evidencia/B03.03-B03.04.md).

**B03.05–B03.06 — nota y transición (2026-09-19):** `gradeBlock` califica
intentos verificados con umbrales distintos para primer bloque y ampliado,
error legal prioritario y 120000 ms como límite no lento. `applyGrade`
actualiza una copia de la tarjeta con vencimientos civiles, intervalos,
profundidad limitada al máximo propio, reps/lapses y una directiva de
reintento al final que conserva el origen. Recibe la nota del dominio, no una
nota del cliente. La cola persistente y el límite HTTP esperan B06/B08;
todavía no hay export público del dominio ni consumidor Android.
[Diseño y límites](docs/dominio-B03.05-B03.06.md) ·
[informe diario](docs/evidencia/B03.05-B03.06.md).

**B03.07–B03.08 — plan y actividad (2026-09-19):** `buildDailyPlan`
filtra candidatos, mezcla nuevas por apertura con semilla y versión explícitas,
recorre grupos en rondas y agrega todos los reviews vencidos. Las claves
lógicas estables preceden la asignación de UUID canónicos. El generador
productivo `fnv1a-xorshift32-v1` tiene vectores fijados; la cinta B01 solo se
inyecta en pruebas. `deriveActivity` conserva el origen de reintentos y añade
actividad por bloques aplicados y líneas distintas; `deriveStreak` recalcula
rachas desde fechas civiles elegibles, incluso con llegadas desordenadas.
No hay persistencia, HTTP ni export público de dominio en esta entrega.
[Diseño y límites](docs/dominio-B03.07-B03.08.md) ·
[informe diario](docs/evidencia/B03.07-B03.08.md).

El contrato B02.03–B02.04 exige precondiciones por recurso, conserva los
snapshots de sesión/ítem y expresa onboarding como una operación atómica.
La atomicidad y autorización se probarán con persistencia y rutas en B08;
los esquemas locales sólo validan las formas y las decisiones de versión.

**B02.09–B02.10 — artefactos y auditoría (2026-09-19):**
`pnpm build` genera `contracts/openapi.json`, declaraciones del contrato y
tipos DTO inferidos de Zod. El paquete local exporta OpenAPI y los tipos;
la auditoría comprueba ejemplos 200/401/403 por operación, 12 errores y un
recorrido de cuenta a lectura consistente mediante IDs públicos. OpenAPI
documenta formas pero las refinaciones de Zod siguen siendo la validación
normativa. La lectura de estado declara colecciones completas; D15 requiere
mediciones con datos reales en B08.08. Auth efectivo espera B05.12.
[Contrato y límites](docs/contrato-B02.09-B02.10.md) ·
[informe diario](docs/evidencia/B02.09-B02.10.md).
La verificación posterior del informe también aprobó 40 pruebas, lint,
typecheck, build, generación y consumidor local bajo Node 24.21.0 oficial.

**B02.05–B02.06 — eventos (2026-09-18):** `contracts/events.mjs` añade el
`StudyEvent` congelable con intentos crudos, dependencias y evidencia de zona
conocida, además de `EventDecision`/`EventResult` para replay, errores
recuperables y lotes mixtos. El contrato no acepta `grade` del cliente ni
demuestra SAN, autorización, persistencia o transacciones; esas garantías
esperan B03–B09. [Contrato](docs/contrato-B02.05-B02.06.md) e
[informe](docs/evidencia/B02.05-B02.06.md).

La revisión estricta de B02.05–B02.06 fijó `zoneEvidenceRef` en cada evento:
referencia una revisión de estado entregada al dispositivo o un paquete
emitido, separada de la versión pedagógica. El servidor deberá resolverla
contra su historial en B08/B09. El tamaño de lote se mide sobre los bytes
UTF-8 recibidos; una comprobación de intercambio exige un resultado por
evento enviado. El ejemplo aplicado ahora corresponde a la línea de un ply.

**B02.07–B02.08 — paquete y revisión (2026-09-19):**
`contracts/offline.mjs` define el snapshot offline con ventanas UTC de siete
días de estudio y siete de entrega, digest SHA-256 canónico y precondiciones de
renovación. `contracts/realtime.mjs` valida la barrera `minRevision`, ticket de
30 segundos, avisos de revisión y readiness sin datos. El servidor deberá
acreditar cobertura completa de líneas, emisión consistente, revisión durable,
consumo único de tickets y autorización en B05/B08–B10. Las rutas Better Auth
se inventariarán en B05.12. [Contrato](docs/contrato-B02.07-B02.08.md) e
[informe](docs/evidencia/B02.07-B02.08.md). No hay HTTP ni clientes en esta
entrega.

[Informe B02.01–B02.02](docs/evidencia/B02.01-B02.02.md): validación de fechas
imposibles y revisiones grandes, páginas ligadas a manifiesto, ETag y consumidor
local. Node 24 estaba pendiente en ese informe y fue ensayado después en
B02.09–B02.10; las rutas Auth reales esperan B05.

Orden de trabajo: planificación → API → infraestructura → Android → web.
API e infraestructura comparten repositorio; cada cliente se desarrolla
en el suyo. Al llegar a cliente se anuncia el cambio y se detiene la sesión.

[Informe B01.03 y evidencia](docs/evidencia/B01.03.md): repasos, redondeo
decimal/fecha y lapse sin reinicio de reps/profundidad. Solo documentación;
dominio, HTTP y clientes no ejecutados.

[Informe B01.02 y evidencia](docs/evidencia/B01.02.md). [Informe B01.01](docs/evidencia/B01.01.md).

[Informe B01.04 y evidencia](docs/evidencia/B01.04.md): profundidad máxima
y selección reproducible, 46 variantes nuevas. Pools vacíos/agotados,
preferencias extremas y ambos colores. Solo especificación documental;
generador productivo y dominio pendientes. B01 permanece abierto.

[Informe B01.05 y evidencia](docs/evidencia/B01.05.md): actividad por líneas
distintas aun bad/mid, reviews con reintentos y origen conservado, cancelación
sin fabricar actividad y deduplicación por cuenta/día. 52 variantes y 116 pasos
nuevos, 184 variantes acumuladas. Solo planificación; B01 sigue abierto.

[Informe B01.06 y evidencia](docs/evidencia/B01.06.md): retiro/reactivación
y cambio/doble cambio de color, generaciones nuevas sin progreso oculto.
24 variantes y 34 pasos nuevos; 208 acumuladas. Completos e historial
conservados; persistencia pendiente. B01 sigue abierto.

**B01.07 — especificación documental (2026-09-16):** R18/R22: completos conservados, parcial en memoria y reenvío frente a nuevo intento dependiente.
[Informe y verificaciones](docs/evidencia/B01.07.md). 264 variantes acumuladas.
B01 permanece abierto; dominio, HTTP y clientes no ejecutados.

**B01.08 — especificación documental (2026-09-16):** R19: snapshots pedagógicos, sesión canónica y aviso de preferencias guardadas/en uso.
[Informe y verificaciones](docs/evidencia/B01.08.md). 292 variantes acumuladas.
B01 permanece abierto; dominio, HTTP y clientes no ejecutados.

**B01.09 — especificación documental (2026-09-16):** R20/R21, fechas y zonas de bloque, DST y rachas 3,1,2.
[Informe y verificaciones](docs/evidencia/B01.09.md). 60 variantes nuevas, 352 acumuladas.
B01.10 pendiente; dominio, HTTP y clientes no ejecutados.

**B01.10 — cierre de especificación (2026-09-16):** auditoría de R01–R22, 352 variantes y seis combinaciones estado×nota.
[Informe e inventario](docs/evidencia/B01.10.md). G01 documental satisfecha.
Siguiente T01; dominio, HTTP, persistencia y clientes siguen sin ejecutar.
