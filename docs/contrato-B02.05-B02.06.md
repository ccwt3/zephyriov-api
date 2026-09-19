# Contrato B02.05–B02.06

Fuente normativa: `Zephyriov/docs/blueprint/plan-trabajo-agentico.md`,
§5 B02.05–B02.06 y D12/D13; `plan-accionable-backend.md`, §B02; y SRS
activo R18/R21/R22.
Los esquemas se exportan desde [`contracts/index.mjs`](../contracts/index.mjs).
No se implementan rutas HTTP, dominio SRS, persistencia, Auth ni reconciliación.

## B02.05 — evento congelado

`StudyEventSchema` expresa el evento que el cliente congela al completar un
bloque. Conserva `eventId`, dispositivo, referencias locales/canónicas de
sesión e ítem, paquete opcional, línea/revisión, versiones, snapshot base,
instantes UTC, fecha/zona declaradas, `zoneEvidenceRef` y la lista cruda de `{ply,playedSan,
elapsedMs}`. La forma es estricta: no acepta `grade`, `correct`, una fecha SRS
calculada ni escrituras de tablas. Los IDs canónicos son UUID; los IDs locales
son opacos. Versiones de tarjeta y ajustes son cadenas decimales canónicas,
independientes de los identificadores opacos de generación.

Las dependencias no se repiten ni pueden apuntar al propio evento.
`StudyEventsRequestSchema` exige 1–20 IDs únicos y rechaza ciclos entre los
eventos presentes; una dependencia ausente puede ser una entrega anterior o
posterior. `parseStudyEventsBody` limita el cuerpo UTF-8 original a 256 KiB
antes de parsear JSON; medir solo el objeto reconstruido perdería espacios y
escapes del transporte. El helper `validateStudyEventDependencies` valida un
lote ya interpretado. `freezeStudyEvent` devuelve un snapshot separado y
recursivamente congelado; esto expresa la inmutabilidad del payload, no su
durabilidad en una base.

R21/D12 precisan la forma base del blueprint: `zoneEvidenceRef` viaja con el
evento y apunta a un snapshot de cuenta por `accountRevision` + versión de
ajustes, o a un paquete emitido por `packageId` + versión de ajustes. La
versión pedagógica de la sesión queda separada. El registro
`KnownStudyZoneSchema` resuelto para validar incluye la referencia, dispositivo,
zona y `knownAt` de entrega/emisión. `validateStudyEventZoneEvidence` exige
igualdad de referencia y dispositivo, evidencia anterior al inicio y fecha
civil de inicio en esa zona. La referencia de paquete debe coincidir con el
`packageId` del evento. Un cambio remoto posterior no invalida por sí solo
el bloque iniciado con la zona anterior.

El registro resuelto debe provenir del historial emitido/entregado al
dispositivo y retenido por el servidor: no se recibe como autoridad desde el
cliente. El esquema y el helper no autentican ese registro ni prueban su
persistencia; B08/B09 deben resolver y conservar la entrega por cuenta,
dispositivo y referencia. DST y la decisión SRS completa siguen B03/B09.

## B02.06 — decisión y resultado por evento

`EventDecisionSchema` conserva la decisión original: resultado
`applied|practice|invalid`, motivo cerrado, IDs canónicos nullable, nota
nullable, tarjeta posterior, reintento, vencimiento, estado de sesión,
revisión de cuenta y `decidedAt`. `applied` exige `ACCEPTED`, IDs canónicos,
nota y tarjeta posterior. `practice` exige un motivo de práctica y puede
conservar una nota verificable, sin efectos SRS. `invalid` exige un motivo
terminal y no lleva nota ni efectos SRS. Un reintento, cuando existe, conserva
sesión, depende del evento original y lleva `nextDue:null`.

`EventResultSchema` distingue tres respuestas dentro del mismo lote:

- `{replayed, decision}` devuelve la decisión original sin reemplazarla por
  un snapshot actual;
- `retryable:true` comunica `DEPENDENCY_PENDING`, `RATE_LIMITED` o
  `SERVICE_UNAVAILABLE`;
- `retryable:false` con `EVENT_ID_REUSED` es terminal y no autoriza cambiar el
  payload original.

`StudyEventsResponseSchema` permite el lote mixto y exige IDs de resultado
únicos; `StudyEventsExchangeSchema` coteja solicitud y respuesta para exigir
exactamente un resultado por ID enviado, sin imponer el orden de la lista.
Estos esquemas no deciden legalidad SAN, autorización, propiedad de
la cuenta, transacciones, idempotencia durable ni efectos SRS; esas garantías
pertenecen a B03–B09.

## Ejemplos y compatibilidad

[`examples-B02.05-B02.06.json`](../contracts/examples-B02.05-B02.06.json)
contiene un evento aplicado coherente con la revisión de línea/ítem previa,
evidencia de zona, lote mixto completo con reintento/ID reutilizado y un
cambio remoto de México a Tokio durante el bloque. Se añadió el subpath
instalable localmente y se
mantienen los esquemas anteriores como fuente única. No se generó OpenAPI ni
DTO: corresponde a B02.09.
