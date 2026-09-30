# zephyriov-api

## Reconstrucción

**2026-09-30 — B05.12 completado; B05 y G04 cerrados:** el consumidor Expo
pasó en un moto g(20) con Android 11 (registro, SecureStore, cancelación,
verificación por navegador, deep links y logout), y el consumidor web ya había
pasado en Firefox con cuentas A/B. `openapi.json` enlaza ahora el inventario
Auth efectivo. Google con APK y dominio finales queda para C08/C10.
Siguiente: B06, sin iniciar. [Diseño](docs/auth-B05.11-B05.12.md) ·
[informe](docs/evidencia/B05.11-B05.12.md).

**2026-09-30 — B05.11 completado (primer cierre del día):** el correo Auth
se envía por HTTPS con Resend (`src/auth/resend.ts`, sin SDK ni reintentos,
enlaces solo al origen API y errores reducidos a estado/código). Ensayo real
aprobado: verificación y reset recibidos, reset de un uso, N/N+1, último cupo
concurrente y reinicio sin perder consumo; SPF/DKIM `pass`. `emailGlobal`
queda en 80/día UTC por la cuota Free. Todas las rutas Auth exportadas tienen
grupo de cupo explícito y se inventarían en
[`contracts/auth-routes.md`](contracts/auth-routes.md), verificado contra la
versión instalada. Aislamiento A/B y consumidor web aprobados; el recorrido
Android espera dispositivo (M03). 293 pruebas en Node 24/26; lint, typecheck y
build pasan. [Diseño](docs/auth-B05.11-B05.12.md) ·
[informe](docs/evidencia/B05.11-B05.12.md).

**2026-09-28 — B05.10 completado; B05.11 preparado, sin iniciar:**
limitadores durables de Auth/negocio y presupuesto global de correo probados,
incluidos último cupo concurrente, rollback y consumo tras reinicio real de
proceso. M18 se resuelve usando `better-sqlite3` 13.0.3 (SQLite 3.53.4) en el
backend local de `@libsql/client` 0.18.0 mediante un parche pnpm versionado.
La interfaz Client/Drizzle/Auth y los transportes HTTP/WS se conservan;
réplicas embebidas y cifrado local se rechazan explícitamente. Esta decisión
requiere instalar con pnpm y conservar `patches/` junto al lockfile.
279 pruebas locales pasan en Node 24.19.0 y 26.10.0; lint, typecheck y build
pasan. [Cierre y reproducción](docs/evidencia/B05.10.md),
[compatibilidad](docs/compatibilidad.md) y [M18 resuelto](docs/manual-M18.md).
Resend real y ajuste de cuotas se cerraron en B05.11 (arriba).

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
B05.07 probó Google real en web/Android: una identidad, una cuenta y un
perfil, sesión conservada tras reinicio y cancelación. B05.08 cerró la
vinculación explícita con sesión reciente y una migración UNIQUE de identidad
por proveedor, que impide duplicados incluso con solicitudes simultáneas.
Pasaron 256 pruebas locales, lint/typecheck/build; el ensayo remoto nuevo
quedó sin ejecutar por HTTP 401 de Turso antes de escribir. El siguiente punto
pendiente es ahora B05.11; M18 quedó resuelto en B05.10.
[Diseño B05.07](docs/auth-B05.07.md), [informe](docs/evidencia/B05.07.md)
y [estado B05.08](docs/auth-B05.08.md).
B05.06 probó el consumidor Expo en Android 11: navegador/deep link exacto,
sesión en SecureStore conservada tras cierre y logout persistente.
[Informe B05.06](docs/evidencia/B05.06.md) y [preparación M08](docs/manual-M08.md).
B05.04–B05.05 fijaron cookies host API, CORS/origen y retornos exactos y
probaron una página local en Firefox. B04 quedó cerrado con el ensayo remoto del
esquema de producto; B05.01–B05.03 integraron Better Auth, perfil inicial,
registro/login, verificación y recuperación con correo capturado localmente.
B04.03 dejó versionado el esquema local de identidad, perfil, preferencias y
revisión de cuenta. B04.02 cerró el ensayo remoto en una base Turso de ensayo
aislada con motor SQLite, plan Free y región US declarados.
B03.11 comparó el dominio en Node y Android; B03.12 abrió el export local
`zephyriov-api/domain`.

La raíz API se construye con Node.js 24 y pnpm 12.4.2. `pnpm install`,
`pnpm test`, `pnpm lint`, `pnpm typecheck` y `pnpm build` son los comandos
del esqueleto. El paquete exporta la versión de especificación y
`zephyriov-api/contracts` con esquemas Zod y ejemplos instalables desde un
tarball local. Los esquemas son fuente única; DTO TypeScript y OpenAPI se
generan desde los esquemas Zod en B02.09. Contiene el dominio SRS puro y el
esquema local de persistencia. El handler HTTP de Better Auth se prueba en
proceso y con servidores temporales de ensayo en loopback; aún no hay
servidor de producto ni rutas/casos de uso de negocio.
La [evidencia T01](docs/evidencia/T01.md)
y [evidencia T02](docs/evidencia/T02.md) detallan verificación y límites.

**B04.01 — compatibilidad transaccional local (2026-09-19):** el lockfile fija
`@libsql/client` 0.18.0, `drizzle-orm` 0.45.2, `better-auth` y
`@better-auth/drizzle-adapter` 1.7.5. Un ensayo aislado en SQLite en memoria
demostró commit y rollback en el driver, en Drizzle y en el adaptador Auth;
este último requiere `transaction: true`. Las tablas del ensayo no son el
esquema del producto. Pasaron 177 pruebas, lint, typecheck, build y T01; la
prueba remota con dos writers se completó después en B04.02.
[Matriz y reproducción](docs/compatibilidad.md) ·
[informe diario](docs/evidencia/B04.01.md).

**B04.02 — ensayo remoto (2026-09-19):** dos conexiones libSQL contra
el primario Turso verificaron commit/rollback del driver, fallo tras dos
escrituras Drizzle, transacción Auth con `transaction: true` y un único ganador
en la carrera CAS de revisión. Las tablas sintéticas se eliminaron y se
comprobó que no quedaran restos. La prueba remota exige
`B04_REMOTE_PROBE=1` y `.env` local; no se ejecuta en el conjunto normal.
M04 confirmó motor SQLite, plan Free y región US; el endpoint identifica
`aws-us-east-2`. El resultado permite comenzar B04.03 en otra sesión.
[Matriz y reproducción](docs/compatibilidad.md) ·
[informe diario](docs/evidencia/B04.02.md).

**B04.03 — migración local de identidad y cuenta (2026-09-19):** SQL versionado
crea las cuatro tablas base de Better Auth 1.7.5 y las tablas `profiles`,
`settings_revisions` y `account_revisions`. `migrateLocal` aplica la migración
en una transacción con checksum; la repetición conserva esquema y datos. Las
revisiones de ajustes son inmutables y la revisión de cuenta no retrocede.
Pasaron 182 pruebas locales, lint, typecheck y build. El esquema generado de
Auth omitió solo relaciones v2 incompatibles con Drizzle 0.45.2; el adaptador
instalado escribió usuario y sesión sobre la migración. El siguiente punto es
B04.04, catálogo y manifiestos locales; la validación remota del esquema de
producto corresponde a B04.10. [Diseño](docs/esquema-B04.03.md) ·
[informe diario](docs/evidencia/B04.03.md).

**B04.04–B04.05 — catálogo y tarjetas locales (2026-09-19):** dos migraciones
añaden aperturas, líneas, revisiones inmutables, manifiestos sellados y un
puntero único que exige carga completa; después repertorio y tarjetas con FK
compuestas de cuenta/apertura/color. El color de una selección y sus tarjetas
puede cambiar atómicamente gracias a una FK diferida. `migrateLocal` aplica
los tres archivos SQL con checksum y los modelos Drizzle permiten consultar
el esquema. Aprobaron 191 pruebas locales, lint, typecheck y build. El
contenido editorial y las transiciones SRS corresponden a B07/B08; la prueba
remota del esquema, a B04.10. [Diseño](docs/esquema-B04.04-B04.05.md) ·
[informe diario](docs/evidencia/B04.04-B04.05.md).

**B04.06–B04.07 — sesiones y eventos locales (2026-09-20):** dos migraciones
añaden una sesión por cuenta/día, ítems con snapshots y clasificación original,
eventos congelados, dependencias materializadas desde el reporte, intentos
verificados, decisiones inmutables y mapeos de referencias locales. Una FK
compuesta y triggers impiden vínculos entre cuentas; un índice parcial permite
una sola decisión aplicada por ítem. `migrateLocal` aplica ahora cinco archivos
con checksum. Aprobaron 202 pruebas locales, lint, typecheck, build y una
migración del artefacto compilado. La validación contractual completa, Auth,
casos de uso y prueba remota del producto corresponden a B06/B04.10.
[Diseño](docs/esquema-B04.06-B04.07.md) ·
[informe diario](docs/evidencia/B04.06-B04.07.md).

**B04.08–B04.09 — operación y adaptadores locales (2026-09-20):** la sexta
migración añade paquetes offline, actividad diaria, limitadores y tickets
ligados a cuenta y sesión Auth, con ventanas y consumo comprobados. Los
adaptadores leen filas propias y revisión en un snapshot del primario,
incrementan la revisión por CAS y arbitran cupo/ticket en una sentencia. Las
lecturas devuelven datos de persistencia para que B08 construya el DTO. Pasaron
213 pruebas locales, lint, typecheck, build y migración compilada. B04.10
probó después el esquema de producto en Turso remoto; B05/B08–B10 integrarán
Auth, rutas, contenido de paquete y socket. [Diseño](docs/esquema-B04.08-B04.09.md) ·
[informe diario](docs/evidencia/B04.08-B04.09.md).

**B04.10 — esquema de producto remoto (2026-09-22):** las seis migraciones se
aplicaron sobre una base Turso de ensayo comprobada vacía. Pasaron reinicio
idempotente, CHECK/UNIQUE/FK, propiedad, inmutabilidad, CAS de dos escritores y
rollback tras cada una de seis escrituras representativas B06. La herramienta
rechaza destinos no vacíos y la limpieza dejó cero objetos. B04 queda cerrado;
la inyección en el caso HTTP definitivo se repite en B06.06.
[Compatibilidad](docs/compatibilidad.md) ·
[informe diario](docs/evidencia/B04.10-B05.01.md).

**B05.01 — integración Better Auth y perfil estable (2026-09-22):** la fábrica
interna usa Better Auth/Drizzle con transacciones reales. Su hook de usuario
crea de forma transaccional e idempotente perfil `6/4`, zona `UTC`, revisión de
ajustes `1` y revisión de cuenta `1`, sin sobrescribir estado existente. Tres
pruebas cubren el adaptador real, repetición simultánea y rollback por usuario
ausente. Email/password permanece deshabilitado hasta B05.02; aún no hay Auth
HTTP, correo ni OAuth. [Diseño](docs/auth-B05.01.md) ·
[informe diario](docs/evidencia/B04.10-B05.01.md).

**B05.04–B05.05 — frontera HTTP y página de ensayo (2026-09-22):** cookies
HTTPS Secure/HttpOnly/Lax sin Domain, CORS con credenciales y orígenes exactos,
POST JSON con origen obligatorio y retornos registrados por URL completa.
Los controles de Better Auth permanecen activos también en tests. La página
`tools/auth-web/` recorrió registro/verificación/recuperación y sesión desde
otro origen en Firefox 156.0, con SQLite temporal y correo en memoria. No
almacena sesión en storage del navegador. Es herramienta API, fuera de los
clientes de producto. Aprobaron 229 pruebas locales, lint, typecheck, build y
el recorrido opt-in de navegador; se usaron binarios instalados porque pnpm
no pudo verificar su firma contra el registro. Siguiente B05.06; API continúa.
[Diseño y reproducción](docs/auth-B05.04-B05.05.md) ·
[informe diario](docs/evidencia/B05.04-B05.05.md).

**B05.06 — ensayo Expo/Auth en Android (2026-09-22):** el plugin oficial
Expo 1.7.5 y `nativeOrigins` habilitan transporte móvil con scheme explícito,
retornos exactos y CSRF/origin activos. El consumidor aislado en
`tools/auth-expo/` fija Expo 57.0.24 y React Native 0.86.3; usa SecureStore
y consulta la sesión real después de verificar desde el navegador del sistema.
Pasaron 233 pruebas locales, lint, typecheck, build API y APK ARM64, además
de cinco grupos de aceptación en moto g(20)/Android 11. Dispositivo,
ID/scheme e instalación/licencias del SDK aislado fueron autorizados durante
la sesión; Unity no se modificó. El APK temporal se desinstaló. B05.07 queda
pendiente de M08; no se probó Google real ni se cierra la fase API.
[Diseño y reproducción](docs/auth-B05.06.md) ·
[informe diario](docs/evidencia/B05.06.md).

**B05.02–B05.03 — registro, verificación y recuperación (2026-09-22):** el
handler Better Auth recorre registro/login, reenvío, verificación y reset con
correo capturado en memoria. `requireVerifiedSession` exige sesión real y
correo verificado antes del negocio (401/403); las futuras rutas deberán
invocarlo. Verificación y reset vencen en una hora; repetir verificación no
crea sesión, y reset consume su token y revoca sesiones sin verificar una
cuenta pendiente. Aprobaron 224 pruebas locales, lint, typecheck y build bajo
Node 26.9.0. Siguiente B05.04; B05 y la fase API siguen abiertos.
[Diseño](docs/auth-B05.02-B05.03.md) ·
[informe diario](docs/evidencia/B05.02-B05.03.md).

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

**B03.09 — proyección local (2026-09-19):** `projectPendingEvents` aplica notas
ya verificadas en orden causal sobre copias de tarjetas y actividad, conserva
los eventos completos y devuelve `confirmed:false`. Rechaza dependencias
ausentes o no aplicadas, IDs repetidos, conflictos de línea e ítems/reintentos
incoherentes. El dominio aún no tiene export público instalable; B03.10
requiere un consumidor de ensayo en Android, pendiente de M03. Persistencia,
transporte y decisiones autoritativas esperan B06/B09.
[Diseño y límites](docs/dominio-B03.09.md) ·
[informe diario](docs/evidencia/B03.09.md).

**B03.10 — consumidor Android de ensayo (2026-09-19):**
`tools/android-consumer/` construye un APK temporal sin permisos, con un
bundle WebView obtenido del `dist/domain` empaquetado localmente. Vite 8.3.0
es dependencia de desarrollo para este bundle. Ocho checks de fecha,
decimal, SAN, nota, transición, plan y proyección pasaron en Android 11;
la app de prueba se retiró del dispositivo. La paridad ampliada y el export
se completaron después en B03.11–B03.12. El ensayo no
modifica repositorios cliente ni demuestra HTTP/persistencia/offline.
[Diseño y límites](docs/dominio-B03.10.md) ·
[informe diario](docs/evidencia/B03.10.md).

**B03.11–B03.12 — paridad y export local (2026-09-19):**
`zephyriov-api/domain` exporta las funciones puras B03 y tipos con
`DOMAIN_VERSION = B03.12-v1`; el paquete local pasó de `0.0.0` a `0.0.1`.
Un adaptador común comparó JSON normalizado Node/Android de 238 porciones
de fixtures B01 y casos directos de decimal, fechas, semilla y ajedrez. La
matriz R01–R22 distingue esas garantías de HTTP/DB/cierre real/clientes.
El tarball local queda identificado por versión y SHA-256 en el informe;
`private:true` sigue activo. `chess.js` 1.4.0 es la única dependencia externa
del dominio; fechas civiles usan `Date` UTC/`Intl` IANA y el intervalo decimal
usa `bigint`. Cambios de esas reglas exigen otra versión y paridad. El APK
temporal se desinstaló. [Diseño y matriz](docs/dominio-B03.11-B03.12.md) ·
[informe diario](docs/evidencia/B03.11-B03.12.md).

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
