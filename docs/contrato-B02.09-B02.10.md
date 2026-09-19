# Contrato B02.09–B02.10: artefactos y auditoría

Fuentes: [plan agéntico §5 B02 y §12 D15](../../../Zephyriov/docs/blueprint/plan-trabajo-agentico.md),
[plan backend §B02](../../../Zephyriov/docs/blueprint/plan-accionable-backend.md),
[SRS activo](reglas-srs.md) y los contratos B02.01–B02.08 de esta carpeta.

## B02.09 — una fuente de esquemas

`contracts/generate.mjs` enumera los 70 esquemas Zod exportados por
`contracts/index.mjs`. Genera `contracts/openapi.json` (OpenAPI 3.1),
declaraciones de los módulos JavaScript en `contracts/types/` y alias DTO
`z.infer` en `contracts/dto.d.mts`. `pnpm build` regenera antes de compilar;
`node contracts/generate.mjs --check` compara los artefactos con la fuente.
El paquete local expone `zephyriov-api/contracts`, el subpath de tipos
`zephyriov-api/contracts/dto` y `zephyriov-api/contracts/openapi.json`.
No se mantienen interfaces DTO paralelas a mano.

OpenAPI declara las 13 rutas HTTP de negocio/health del blueprint (14
operaciones), el intercambio WebSocket mediante `x-websocket`, parámetros,
solicitudes, respuestas y sobre de error. Cada operación de negocio tiene
ejemplos 200, 401 y 403. Los ejemplos 401/403 son formas de rechazo; su
aplicación efectiva requiere Auth y autorización en B05/B08. El marcador
`x-business-auth-required` expresa esa condición sin declarar un mecanismo
HTTP hipotético. No hay rutas `/api/auth/*`: su inventario real es B05.12.
La lectura de línea declara `ETag` en 200/304 y 304 sin cuerpo; 429 declara
`Retry-After` en segundos.

La conversión JSON Schema conserva formas, obligatorios, `null`, patrones,
rangos y uniones. Las refinaciones ejecutables de Zod, como la fecha
gregoriana imposible, consistencia entre campos, SAN o límites dependientes
del contexto, no se pueden reconstruir desde este OpenAPI; **Zod es la
validación normativa**. Una prueba documenta explícitamente que
`2026-02-31` pasa el patrón JSON Schema y falla en Zod. El valor decimal de
revisión permanece string; no se redondea como número JavaScript.

## B02.10 — recorrido y tamaños

`contracts/examples-B02.10.json` ofrece los 12 códigos de error para
consumidores Android/web, con estado HTTP según `ERROR_STATUS`. La auditoría
valida ejemplos publicados contra Zod y la forma OpenAPI generada, y enlaza
cuenta verificada → onboarding → sesión/ítem → lote de eventos → decisión
original/replay → lectura con `minRevision` usando IDs públicos. Es un
recorrido de **contrato y fixtures**; no afirma transacciones ni rutas
funcionando. Las pruebas de autorización, replay persistente, plies/SAN y
decisión SRS corresponden a B05–B10.

`GET /v1/me/state` devuelve `cards` y `activity.eligibleDates` completos en
un único snapshot; el contrato no autoriza truncarlos silenciosamente.
El detalle paginable de actividad mencionado en el blueprint no tiene ruta
definida: D15 queda para B08.08, cuando exista historial/catálogo real y se
mida tamaño/latencia antes de decidir su interfaz. Medición local de forma:
fixture base 2,682 bytes; estado sintético con 1,000 tarjetas y 365 fechas
325,108 bytes JSON UTF-8. Esas cifras no son tamaños de producción ni
justifican todavía un límite, paginación o endpoint nuevo.

`GET /health/ready` sólo declara estados 200/503 sin cuerpo. WebSocket
transporta únicamente revisión; tickets, consumo único y entrega post-commit
se prueban en B10. Se aplaza el inventario Auth a B05.12. El paquete local
no es un servidor ni una publicación remota.
