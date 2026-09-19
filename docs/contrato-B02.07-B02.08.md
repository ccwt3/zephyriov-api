# Contrato local B02.07–B02.08

Fuentes: [plan agéntico, §5 B02](../../../Zephyriov/docs/blueprint/plan-trabajo-agentico.md),
[plan backend, §B02/§B09/§B10](../../../Zephyriov/docs/blueprint/plan-accionable-backend.md)
y [SRS activo R19–R22](reglas-srs.md). Los esquemas instalables están en
[`contracts/offline.mjs`](../contracts/offline.mjs) y
[`contracts/realtime.mjs`](../contracts/realtime.mjs); los
[ejemplos](../contracts/examples-B02.07-B02.08.json) son datos de contrato.

## B02.07: paquete y renovación

`OfflinePackage` contiene ID de paquete y dispositivo, emisión y ventanas UTC,
revisión base, manifiesto, versión SRS, ajustes congelados, material de semilla,
estado base, revisiones completas de línea, sesiones existentes y SHA-256 del
contenido. `baseState` usa `AccountState` ya definido. `seedMaterial` fija la
versión del generador, una semilla reproducible y el par ID de línea/revisión
actual de cada línea activa necesaria para proyectar días sucesivos. Las
sesiones existentes conservan su
pedagogía; el ajuste nuevo del perfil no las reescribe. El paquete es un
snapshot de entrenamiento, no una credencial. El esquema estricto no admite
campos de acceso ni el catálogo global.

El esquema comprueba que las ventanas miden **7×24 h + 7×24 h**, que revisión,
manifiesto y ajustes coinciden con el estado base, y que cada línea declarada
activa tiene revisión actual y tarjeta del color seleccionado. Exige las
revisiones exactas de ítems de sesiones existentes y la inclusión íntegra de
la sesión actual. No admite otras líneas de catálogo.
La lista de líneas activas debe obtenerse del manifiesto/repertorio por el
servidor; el propio paquete no demuestra que éste no omitió una línea. B09
deberá probar esa consulta y registrar la base emitida. La versión del
generador y las revisiones retenidas deberán seguir disponibles mientras un
paquete pueda producir eventos o decisiones recuperables.

`contentHash` es SHA-256 en hex minúscula de JSON UTF-8 del paquete sin
`contentHash`, con claves de objeto ordenadas recursivamente y orden de
arreglos conservado. Se eliminan propiedades `undefined` como en JSON de
transporte. El consumidor puede verificar integridad antes de instalar el
paquete. El servidor deberá calcularlo al emitir desde un snapshot consistente;
un hash no autentica al propietario ni prueba que el servidor entregó todos
los datos editoriales necesarios.

El estudio requiere `startedAt` y `completedAt` dentro de
`[issuedAt, expiresAt)`; `completedAt` no precede a `startedAt`. La primera
entrega debe llegar después del bloque y antes de `submitUntil`; el instante
exacto `submitUntil` ya venció. La gracia permite enviar, no estudiar. Las
decisiones finales de eventos vencidos, replay y cronología confiable se
implementan en B09; `offlinePackageWindow` sólo expresa estas fronteras.

La petición de renovación transporta `deviceId`, `lastKnownRevision` decimal
y UUID únicos `resolvedEventIds`. Antes de pedirla, Android debe resolver su
outbox durable; `canRequestOfflineRenewal` expresa esa precondición local.
El servidor comprueba que cada ID declarado tenga decisión y que la revisión
conocida sea la vigente. IDs sin decisión producen
`RECONCILIATION_REQUIRED` (409); revisión obsoleta produce
`VERSION_CONFLICT` (409). El servidor no puede demostrar que el cliente no
oculta una cola no declarada. Fallar la renovación no reemplaza el último
paquete válido ni anuncia descarga lista. Las decisiones de eventos de un
paquete anterior siguen resolviéndose normalmente después de emitir uno nuevo.

## B02.08: lecturas, avisos y acceso

`GET /v1/me/state` y `GET /v1/study-sessions/{id}` aceptan `minRevision?`.
El intercambio exige una respuesta cuya revisión decimal sea al menos ese
mínimo, comparada como entero arbitrario. Si la revisión aún no es visible,
el servidor reintenta de forma acotada y después responde
`REVISION_NOT_READY` 503 recuperable. La consulta y su revisión deben salir
del mismo snapshot tras la reconciliación editorial de B08. Un recibo de
evento repetido conserva la revisión original; el cliente obtiene estado
fresco mediante esta lectura, sin reescribir el recibo.

`POST /v1/me/realtime-ticket` devuelve un ticket opaco y `expiresAt`; su
vigencia es 30 segundos. El primer mensaje de `WSS /v1/updates` lleva
`{type:"authenticate",ticket}`. `hello` y `state_changed` sólo transportan
`accountRevision`, sin correo, jugadas ni estado personal. El ticket será
aleatorio, ligado a cuenta/sesión Auth, guardado como hash y consumido de modo
atómico en B10; el esquema no demuestra uso único, entrega post-commit,
revocación ni orden entre dos clientes. La pérdida de un aviso se recupera
mediante lectura REST activa. `GET /health/ready` expone únicamente 200 si
API/base están disponibles o 503 si no; no devuelve datos ni secretos y no
se usa para mantener despierto el proceso.

Todas las rutas de negocio y el socket requieren sesión válida, correo
verificado cuando corresponda y autorización por propietario. El `deviceId`
de un cuerpo no elige propietario. La web usa cookie HTTPS HttpOnly limitada
al host API, credenciales, control CSRF/origen y CORS del origen autorizado;
Android guarda la sesión con SecureStore y usa navegador del sistema para
OAuth. El origen móvil no sustituye autenticación. Los contratos reales de
`/api/auth/*` se inventariarán en B05.12 a partir de Better Auth probado;
estos esquemas no inventan rutas de contraseña ni tokens propios. Los ejemplos
401/403 previos siguen siendo el sobre de error de negocio.

Estas formas quedan listas para generación OpenAPI/DTO en B02.09. HTTP,
persistencia, transacciones, Auth real, ticket de un uso, revisión durable y
pruebas de dos clientes pertenecen a B05/B08–B10.
