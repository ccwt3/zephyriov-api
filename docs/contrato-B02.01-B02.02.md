# Contrato B02.01–B02.02

Fuente: `Zephyriov/docs/blueprint/plan-trabajo-agentico.md` §5 B02 y
`plan-accionable-backend.md` §B02. Los esquemas normativos de estos dos puntos
están en [`contracts/`](../contracts/). La ruta pública local es
`zephyriov-api/contracts`; los ejemplos viajan en
`zephyriov-api/contracts/examples.json`. Zod 4.6.5 es dependencia de ejecución.
El paquete actual es privado y `0.0.0`; publicación, DTO TypeScript generado y
OpenAPI corresponden a B02.09/B11.05. No se ofrece aún un servidor HTTP.

## B02.01: formas de transporte

- `Id`: UUID opaco; ninguna semántica se deduce de su contenido. Incluye IDs
  editoriales, sesión, ítem, dispositivo, paquete y evento.
- `CivilDate`: `yyyy-mm-dd` gregoriano real, años 0001–9999. No usa zona del
  proceso. `Instant`: UTC RFC 3339 con tres cifras de milisegundos y `Z`.
- `Revision`: entero decimal canónico no negativo en cadena, sin ceros iniciales
  salvo `"0"`. Esto permite la versión inicial inexistente y evita pérdida de
  precisión de JavaScript. `IntervalDays`: decimal no negativo con exactamente
  dos decimales, sin límite artificial de magnitud. Los cálculos SRS son B03.
- Error fuera de evento: `{error:{code,message,requestId,retryable,details?},
  serverNow}`. `details`, si existe, contiene solamente pares `field`/`issue`;
  nunca valores recibidos, tokens o datos de otra cuenta. El catálogo de códigos
  y estado HTTP está en `ERROR_STATUS`. `RATE_LIMITED` exige además el header
  HTTP `Retry-After` cuando se implemente la ruta. Los errores de evento y sus
  decisiones pertenecen a B02.06.

## B02.02: catálogo

`GET /v1/catalog` requiere cuenta autenticada y verificada. Sus parámetros son
`cursor?`, `limit` entero 1–100 (50 por defecto) y `manifestId?`. Devuelve
`{manifestId,openings,nextCursor}`. Cada apertura lleva sus líneas resumidas;
`lineCount` coincide con el número de líneas en ese resumen. El orden es
`sortOrder` ascendente y luego `id` ascendente. El cursor opaco codifica
`manifestId`, último `sortOrder` y último `id`; cada página se obtiene del mismo
manifiesto inmutable. Un cursor o `manifestId` de otro manifiesto causa 409
`VERSION_CONFLICT`; un cursor mal formado causa 422 `VALIDATION_ERROR`.
`nextCursor:null` termina la secuencia. `paginateCatalog` ofrece una referencia
pura para comprobar primera/última página, sin consulta de base de datos.

`GET /v1/catalog/lines/{id}` acepta `revisionId?` y `If-None-Match?`. La revisión
es inmutable y conserva metadatos, jugadas y referencias. `movesHash` y
`contentHash` son SHA-256 hexadecimales minúsculos; el ETag es el `contentHash`
entre comillas. Una petición condicional que coincide responde 304 sin cuerpo;
la respuesta 200 lleva la revisión completa. Ambas rutas requieren acceso
verificado. Una revisión retenida autorizada para un paquete sigue legible;
un ID ajeno o inexistente recibe el mismo 404 `NOT_FOUND`. Un cliente sin sesión
recibe 401 `AUTH_REQUIRED`, y uno sin correo verificado 403
`EMAIL_UNVERIFIED`. Las rutas Auth efectivas se inventariarán en B05.12.

El catálogo autenticado puede usar caché privada por ETag. No se permite caché
compartida de datos personales. Los ejemplos de autorización y contenido en
`contracts/examples.json` son ilustrativos del formato, no un catálogo editorial
aprobado. Validación SAN, fuentes, hashes calculados y publicación corresponden
a B07.

## Compatibilidad

Los campos normativos usan `camelCase` y los esquemas de objetos rechazan campos
desconocidos. Una nueva versión debe conservar los formatos de las revisiones
inmutables que puedan leer paquetes aún válidos; cambios incompatibles exigen
versión nueva. No se duplican interfaces TypeScript manuales: B02.09 generará
DTO y OpenAPI de los esquemas cuando el contrato de negocio esté completo.
