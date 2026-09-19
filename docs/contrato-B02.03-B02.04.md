# Contrato B02.03–B02.04

Fuente normativa: `Zephyriov/docs/blueprint/plan-trabajo-agentico.md`, §5 B02.03–B02.04;
`plan-accionable-backend.md`, §B02 y §B08; [SRS activo](reglas-srs.md),
R17 y R19–R21. Se añaden esquemas Zod en [`contracts/account.mjs`](../contracts/account.mjs)
y [`contracts/study.mjs`](../contracts/study.mjs), exportados desde
`zephyriov-api/contracts`. Los [ejemplos](../contracts/examples-B02.03-B02.04.json)
son ilustrativos del transporte, sin cuentas ni catálogo reales.

## B02.03: perfil, ajustes y repertorio

- `Settings` lleva `version` decimal canónica, `newLinesPerDay` entero 1–12
  (valor inicial 6), `movesPerBlock` entero 2–10 (valor inicial 4) y zona
  reconocida por `Intl` (inicial `UTC`). El ejemplo pasa de versión `"1"` a
  `"2"`; no fija el número de versión de toda cuenta nueva. Cada cambio crea
  una revisión inmutable en la implementación futura.
- `Profile` lleva ID, `emailVerified`, `onboardedAt: Instant|null` y ajustes.
  No transporta contraseñas, tokens, nombres de proveedores ni perfil social.
- `RepertoireEntry` lleva apertura, color, activo y versión. `PUT
  /v1/me/repertoire/{openingId}` recibe `{color,expectedVersion}`; la apertura
  debe permitir ese color en el catálogo. Para una entrada inexistente la
  precondición inicial es `"0"`. `DELETE` recibe la versión de la entrada en
  `If-Match` como etiqueta HTTP entre comillas, por ejemplo `"1"`.
- `PATCH /v1/me/settings` recibe `expectedVersion` y al menos un campo a
  cambiar. La respuesta indica ajustes guardados, revisión de cuenta, versión
  de sesión activa si existe, IDs de paquetes activos y el efecto:
  `next_sessions_and_packages` para pedagogía y `next_block` para zona. La
  sesión/descarga en uso mantiene su snapshot anterior. La zona histórica no
  se reconvierte.
- Una mutación con versión vigente y estado distinto aplica. Si el estado
  solicitado ya se alcanzó, devuelve el vigente sin repetir efectos, aun si
  la versión esperada es vieja. Una versión vieja con cambio real produce 409
  `VERSION_CONFLICT` y estado vigente. Los 409 de estas rutas amplían el sobre
  común con `currentEntry` o `currentSettings` y `accountRevision`. La
  revisión de cuenta sirve para lectura/sincronización; no sustituye la
  precondición específica de entrada o ajustes. Los helpers puros de
  `account.mjs` expresan esta decisión, sin realizar escritura.
- Retirar conserva tarjetas e historial; reactivar con el mismo color conserva
  progreso; cambiar color crea generaciones nuevas y cancela pendientes
  incompatibles. Es una obligación para B08, no un efecto ejecutado por estos
  esquemas.

## B02.04: sesión, ítems y onboarding

- `Card` transporta estado, profundidad propia, intervalo decimal, fecha,
  contadores, nota, versión y generaciones personal/editorial. `StudyItem`
  conserva `originType: new|review` desde su selección original, incluso en
  reintentos; `attemptNumber` empieza en 1 y todo reintento identifica su
  evento padre. `status` distingue `pending`, `graded` y `cancelled`. Su
  `baseCard`, revisión de línea, `effectiveMoves`, versión de ajustes, tamaño
  de bloque y versión SRS son snapshots del ítem: la tarjeta/ajustes actuales
  no los reescriben.
- `StudySession` lleva fecha civil, ajustes pedagógicos congelados, semilla,
  ítems y `newLineIds`. Sus contadores de completos, pendientes y cancelados
  se validan por separado; una sesión `completed` no tiene pendientes. El
  reintento de una línea `new` sigue siendo `new` por origen, pero
  `newLineIds` la cuenta una sola vez. El contrato de `POST
  /v1/study-sessions` recibe `deviceId` y responde sesión, revisiones de
  línea necesarias, revisión de cuenta y hora de servidor. `GET
  /v1/study-sessions/{id}` usa la misma respuesta. Crear y recuperar la
  sesión canónica de una cuenta/día, y guardar sesión+ítems juntos, son
  garantías transaccionales de B08.
- `POST /v1/me/onboarding` recibe al menos una selección, sin aperturas
  duplicadas, con color permitido, y `expectedAccountRevision`. Responde
  `AccountState`: perfil con `onboardedAt` y repertorio activo. La selección
  vacía o inválida da 422 sin cambios. El timestamp y todas las selecciones
  deben confirmarse en una sola transacción; si falla cualquiera, ninguno
  cambia. La validación cruzada exige que la respuesta incluya todas las
  selecciones aceptadas; no demuestra un commit durable. Los esquemas validan
  solicitud y respuesta completas, pero la
  atomicidad, propiedad de cuenta y concurrencia esperan B08/B04.
- `GET /v1/me/state` comparte `AccountState`; `Activity` transporta días
  elegibles, rachas y fecha de referencia. El detalle paginado y tamaño final
  de esta lectura siguen B02.10/B08.08.

Las rutas personales requieren autenticación y correo verificado. Los ejemplos
401 `AUTH_REQUIRED`, 403 `EMAIL_UNVERIFIED` y 404 `NOT_FOUND` existentes en
[`contracts/examples.json`](../contracts/examples.json) aplican aquí también;
el 404 no distingue recurso ajeno de inexistente. La forma Auth efectiva se
inventariará en B05.12. No hay todavía controlador HTTP, autorización real,
transacción, persistencia ni cálculo SRS. DTO/OpenAPI generados corresponden a
B02.09; los esquemas son la fuente única hasta entonces.
