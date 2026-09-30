# Branch changes

## 2026-09-30 — B05.12 completado; B05 y G04 cerrados

Continuación con el moto g(20) conectado: el consumidor Expo pasó en Android 11
(registro, SecureStore, cancelación, verificación por navegador, deep links y
logout), con APK desinstalado al terminar. El runner espera ahora a que Chrome
esté visible antes de cancelar, porque en este teléfono tarda más en abrir.
El contrato de negocio enlaza el inventario Auth efectivo. 294 pruebas en Node
24/26; lint, typecheck y build pasan. B05 12/12; siguiente B06, sin iniciar.
API continúa. [Informe](docs/evidencia/B05.11-B05.12.md).

[Listo :v]

## 2026-09-30 — B05.11 completado; B05.12 pendiente de M03

Correo Auth real por HTTPS con Resend: adaptador sin SDK ni reintentos,
enlaces limitados al origen API y errores sin datos sensibles. Ensayo real
con cuatro mensajes: verificación y reset recibidos en bandeja, SPF/DKIM
`pass`, reset de un uso, N/N+1, último cupo concurrente y reinicio sin perder
consumo. Presupuesto de correo a 80/día UTC por cuota Free; scrypt medido.
B05.12: aislamiento A/B probado, todas las rutas Auth con cupo explícito e
inventario en `contracts/auth-routes.md`, recorrido web con A/B en Firefox.
Recorrido Android no ejecutado: sin dispositivo (M03). 293 pruebas en Node
24/26; lint, typecheck y build pasan. Un punto de dos completado; API sigue.
[Diseño](docs/auth-B05.11-B05.12.md) · [informe](docs/evidencia/B05.11-B05.12.md).

[Listo :v] — B05.11; B05.12 incompleto, pendiente_manual(M03).

## 2026-09-30 — M07 preparado para B05.11

B05.10 quedó en commit propio tras repetir 279 pruebas, lint y typecheck.
El usuario verificó `mail.zephyriov.reicot.dev` en Resend (Free, sin cargos)
y guardó la API key en `.env`; se comprobó DKIM/SPF por DNS público. Se
documentaron registros, remitente y cuota oficial, y se añadieron las
variables Resend a la plantilla de entorno. Sin correos enviados ni código
nuevo; buzones A/B aportados. B05.11 sigue sin iniciar, a la espera de
autorización.
[M07](docs/manual-M07.md).

[Listo :v]

## 2026-09-28 — B05.10 completado; M18 resuelto; B05.11 preparado

Se reprodujo M18 en Node 24/26 antes de corregirlo. Un parche pnpm versionado
usa `better-sqlite3` 13.0.3 para el backend SQLite local de libSQL 0.18.0;
conserva API/transacciones y transportes remotos. Recupera el commit después
de contención/UNIQUE y el reintento OAuth. Nuevas pruebas cubren ESM/CJS,
ciclo de conexión/opciones y persistencia de cupos entre procesos distintos.
279 pruebas locales pasan en ambos runtimes; lint, typecheck, build, T01 e
instalación congelada aprobados. Nueve pruebas remotas opt-in omitidas.
Documentados límites de motor local y requisitos de instalación. El puntero
queda en B05.11, sin iniciar Resend/DNS ni avanzar a B05.12. Cambios ajenos
de entorno conservados. [Informe](docs/evidencia/B05.10.md).

[Listo :v]

## 2026-09-28 — B05.09 completado; B05.10 detenido por M18

B05.09 fija vigencia/renovación sin cookie cache, notificación de borrado
confirmado y consulta de propiedad/vencimiento para futuros sockets.
B05.10 añade cupos y reservas de correo durables, pero queda incompleto:
273 pruebas pasan, una regresión OAuth falla y nueve opt-in se omiten.
Un reproductor sin Auth confirma `SQLITE_BUSY` al hacer commit después de
contención/UNIQUE. Lint, typecheck y build pasan. El usuario eligió dejar
B05.10 detenido/documentado; no se tocaron dependencias ni lockfile.
Uno de dos puntos completado, B05.11 no iniciado, fase API abierta.
Cambios ajenos de entorno conservados fuera del commit.
[Informe diario](docs/evidencia/B05.09-B05.10.md) · [M18](docs/manual-M18.md).

[Listo :v] — cierre de sesión; B05.09 completado, B05.10 incompleto.

## 2026-09-27 — B05.08 completado: vinculación e identidad única

La autorización expresa del usuario resolvió M17 local. Una migración nueva
impide duplicar proveedor/sujeto; conserva datos válidos y revierte sin borrar
si encuentra duplicados previos. La carrera OAuth devuelve un conflicto seguro
y admite reintento; errores inesperados no filtran SQL ni tokens. TDD y 256
pruebas locales aprobadas, nueve opt-in omitidas; lint/typecheck/build y
migración compilada aprobados. El ensayo remoto recibió HTTP 401 antes de
escribir: no acredita la migración 007 en Turso. B05.07–B05.08 completados
(2/2), sin volver a necesitar Android. Siguiente B05.09, sin iniciar; API
continúa. Cambios ajenos de entorno conservados fuera del commit.
[Informe diario](docs/evidencia/B05.08.md) · [Diseño](docs/auth-B05.08.md).

[Listo :v]

## 2026-09-27 — B05.07 probado; B05.08 bloqueado por carrera

Google real pasó en web/Android con una identidad, cuenta y perfil; sesión
conservada tras reinicio y cancelación. TDD, 238 pruebas locales y build APK
aprobados. B05.08 añadió linking explícito con sesión reciente y verificada,
sin fusión implícita. Su regresión pasó 251 pruebas, lint/typecheck/build;
una prueba concurrente posterior reprodujo dos cuentas para un mismo sujeto.
Se detuvo por requerir migración UNIQUE fuera del alcance previo (M17 local,
autorización solicitada y pendiente). Un punto de dos completado, B05.09
no iniciado; API sigue abierta. Ensayo temporal limpiado, cambios ajenos
conservados fuera del commit.
[Informe B05.07](docs/evidencia/B05.07.md) · [Informe B05.08](docs/evidencia/B05.08.md).

[Listo :v] — B05.07; B05.08 incompleto, con prueba de concurrencia fallida.

## 2026-09-27 — B05.07 detenido en M08

Se revalidó la entrada de los dos puntos pendientes B05.07–B05.08. Las
variables Google ya están presentes en `.env`, sin mostrar sus valores;
faltan confirmación de configuración OAuth y coordinación del login real
web/Android. Se detuvo la implementación por la intervención manual exigida,
sin completar puntos ni iniciar B05.08. Se actualizaron puntero y ficha M08;
la fase API continúa. Cambios previos conservados fuera de este commit.
[Informe diario](docs/evidencia/2026-09-27-M08.md).

[Listo :v] — cierre documental; B05.07 sigue pendiente_manual(M08).

## 2026-09-22 — B05.06 probado; B05.07 pendiente de M08

Se integró el transporte oficial Expo con origen nativo explícito, retornos
exactos y controles CSRF/origin activos. Consumidor mínimo aislado en API,
con dependencias fijadas y APK de prueba identificado. TDD, 233 pruebas
locales, lint, typecheck, build API y APK aprobados; Android 11 pasó registro,
sesión persistente en SecureStore, cancelación, verificación/deep link,
retornos ajenos/duplicados y logout tras reiniciar. M03 y los identificadores
de ensayo se resolvieron con intervención del usuario. El primer recorrido
de verificación se interrumpió al cerrar el selector de navegador; la
repetición completa pasó y retiró el APK. B05.07 se detuvo antes de integrar
Google por M08: faltan credenciales/configuración y login real del usuario.
El usuario pidió reanudarlo en una sesión manual/semimanual con guía OAuth
paso a paso. Un punto completado de los dos autorizados; API sigue abierta.
[Diseño](docs/auth-B05.06.md), [informe](docs/evidencia/B05.06.md) y
[preparación manual](docs/manual-M08.md).

[Listo :v] — B05.06; B05.07 permanece pendiente.

## 2026-09-22 — B05.04 y B05.05: frontera HTTP y ensayo web Auth

Cookies host API y CORS exacto con credenciales; origen obligatorio para POST,
retornos por URL completa y controles CSRF de Better Auth activos. Página
local de ensayo con SQLite temporal/correo en memoria, probada en Firefox
156.0 para registro, verificación, sesión y recuperación. TDD, 229 pruebas
locales, lint, typecheck y build aprobados mediante binarios instalados;
ocho pruebas remotas opt-in omitidas. Firefox requirió ejecución fuera del
sandbox, autorizada por el usuario; bloqueo resuelto. No hay trabajo manual
pendiente para estos puntos. Siguiente B05.06; fase API abierta.
[Diseño](docs/auth-B05.04-B05.05.md) e
[informe diario](docs/evidencia/B05.04-B05.05.md).

[Listo :v]

## 2026-09-22 — B05.02 y B05.03: registro, verificación y recuperación

Registro/login real con perfil único y guardia de negocio para sesión y correo
verificado. Captura local de verificación/reenvío/reset; tokens de una hora,
verificación repetida idempotente y recuperación de un uso que revoca sesiones
sin verificar la cuenta. TDD y 224 pruebas locales, lint, typecheck y build
aprobados bajo Node 26.9.0; ocho casos remotos omitidos. Sin envío externo ni
clientes. [Diseño](docs/auth-B05.02-B05.03.md) e
[informe diario](docs/evidencia/B05.02-B05.03.md). Siguiente B05.04; API continúa.

[Listo :v]

## 2026-09-22 — B04.10 y B05.01: esquema remoto e integración Auth

Las seis migraciones de producto pasaron en una base Turso de ensayo vacía:
reinicio, tipos de restricción, propiedad, inmutabilidad, CAS con dos writers y
rollback tras cada escritura representativa B06. La limpieza dejó cero
objetos. Después se integró Better Auth/Drizzle con creación transaccional e
idempotente del perfil inicial 6/4 UTC y sus revisiones. Aprobaron cuatro casos
remotos, 216 pruebas locales, lint, typecheck y build bajo Node 26.9.0.
[Compatibilidad](docs/compatibilidad.md), [diseño Auth](docs/auth-B05.01.md) e
[informe](docs/evidencia/B04.10-B05.01.md). Siguiente B05.02.

[Listo :v]

## 2026-09-20 — B04.08 y B04.09: operación y adaptadores locales

Se añadió la migración de paquetes, días de actividad, limitadores y tickets;
los adaptadores agrupan lecturas del primario y ejecutan CAS, cupo y consumo
atómicos. Aprobaron 213 pruebas locales, lint, typecheck, build, planes de
consulta y migración compilada bajo Node 26.9.0. El esquema de producto aún
requiere ensayo remoto en B04.10. [Diseño](docs/esquema-B04.08-B04.09.md) e
[informe](docs/evidencia/B04.08-B04.09.md).

[Listo :v]

## 2026-09-20 — B04.06 y B04.07: sesiones y eventos locales

Se versionaron sesiones/ítems con unicidad por cuenta/día, snapshots y origen
inmutable, y eventos/decisiones/dependencias/intentos/mapeos con propiedad
compuesta y una sola aplicación por ítem. Aprobaron 202 pruebas locales,
lint, typecheck, build y migración compilada bajo Node 26.9.0. Sin aplicación
del esquema de producto a Turso remoto; siguiente B04.08.
[Diseño](docs/esquema-B04.06-B04.07.md) e
[informe](docs/evidencia/B04.06-B04.07.md).

[Listo :v]

## 2026-09-19 — B04.04 y B04.05: catálogo, repertorio y tarjetas locales

Se añadieron migraciones SQL versionadas para revisiones de línea inmutables,
manifiestos completos, puntero único, repertorio por cuenta y tarjetas con
relaciones compuestas de propiedad y color. La FK diferida permite cambio de
color y generación dentro de una transacción; una actualización incompleta
falla. Aprobaron 191 pruebas locales, lint, typecheck, build y migración del
artefacto compilado bajo Node 26.9.0. Sin aplicación remota del esquema.
[Diseño](docs/esquema-B04.04-B04.05.md) e
[informe](docs/evidencia/B04.04-B04.05.md). Siguiente B04.06.

[Listo :v]

## 2026-09-19 — B04.03: migración local de identidad y cuenta

Se versionó una migración SQLite con las cuatro tablas base de Better Auth
1.7.5 y tablas de perfil, revisiones de preferencias y revisión de cuenta.
La aplicación transaccional comprueba checksum; restricciones, repetición,
adaptador Auth y rollback representativo pasaron en SQLite local. Aprobaron
182 pruebas, lint, typecheck y build bajo Node 26.9.0. El SQL de producto aún
no se ensayó en Turso. [Diseño](docs/esquema-B04.03.md) e
[informe](docs/evidencia/B04.03.md). Siguiente B04.04.

[Listo :v]

## 2026-09-19 — B04.02: ensayo remoto cerrado

Cuatro pruebas pasaron en la base Turso aislada: commit/rollback del driver,
fallo tras dos escrituras Drizzle, transacción Auth y carrera CAS con dos
conexiones. Las tablas sintéticas se limpiaron. El test remoto requiere una
bandera explícita; 177 pruebas locales, lint, typecheck y build aprobaron con
binarios instalados. M04 confirmó motor SQLite, plan Free y región US;
el siguiente punto es B04.03. [Matriz](docs/compatibilidad.md) e
[informe](docs/evidencia/B04.02.md).

[Listo :v]

## 2026-09-19 — B04.01: matriz y transacciones locales

Se fijaron versiones libSQL 0.18.0, Drizzle 0.45.2 y Better Auth/adaptador
1.7.5. Un ensayo sintético demostró commit, rollback y fallo inyectado en
driver, Drizzle y adaptador Auth con `transaction: true`. Aprobaron 177 tests,
lint, typecheck, build, lockfile y T01 bajo Node 24.21.0/pnpm 12.4.2.
[Matriz](docs/compatibilidad.md) e [informe](docs/evidencia/B04.01.md).
Siguiente B04.02, detenido hasta M04 para la base remota de ensayo.

[Listo :v]

## 2026-09-19 — B03.11 y B03.12: paridad y export local del dominio

Se compararon salidas JSON normalizadas Node/Android para 238 porciones
puras de fixtures B01 y casos de serialización, semilla, calendario y ajedrez.
Se añadió `zephyriov-api/domain` con versión de conducta `B03.12-v1` y
paquete local `0.0.1`, además de la matriz R01–R22 por capa y auditoría de
imports. El tarball y las declaraciones se consumieron localmente; el APK
temporal se desinstaló. Las verificaciones y límites figuran en el
[informe](docs/evidencia/B03.11-B03.12.md). Siguiente B04.01.

[Listo :v]

## 2026-09-19 — B03.10: consumidor mínimo en Android

Se empaquetó el dominio compilado en un tarball local y se ejecutó un
consumidor WebView aislado con ocho checks en Android 11; todos pasaron.
El APK sin permisos se desinstaló después de verificar el resultado.
Vite 8.3.0 quedó fijado para el bundle de ensayo. Aprobaron 174 pruebas,
lint, typecheck, build y T01. B03.11 queda como siguiente punto para la
comparación exhaustiva Node/Android. [Diseño](docs/dominio-B03.10.md) e
[informe](docs/evidencia/B03.10.md).

[Listo :v]

## 2026-09-19 — B03.09: proyección local de eventos pendientes

Se añadió `projectPendingEvents` para reproducir decisiones locales
preclasificadas sobre tarjetas y actividad sin mutar la base, conservar
completos y rechazar dependencias insatisfechas. Aprobaron 174 pruebas,
lint, typecheck, build y T01 en Node 26.9.0; 174 pruebas también en
Node 24.21.0. La prueba de runtime Android B03.10 quedó pendiente por M03:
ADB no detecta dispositivo y no hay emulador local. El puntero sigue en
B03.10. [Diseño](docs/dominio-B03.09.md) e
[informe](docs/evidencia/B03.09.md).

[Listo :v]

## 2026-09-19 — B03.07 y B03.08: plan diario, actividad y racha

Se añadió selección pura R12–R13 con orden canónico, semilla/versiones
explícitas, round-robin, claves lógicas estables y cinta B01 solo de prueba.
Se implementó actividad R14–R16 con origen de reintentos conservado y racha
R21 por fechas civiles elegibles. Aprobaron 168 pruebas, lint, typecheck,
build y T01 en Node 26.9.0; 168 pruebas también en Node 24.21.0.
Sin HTTP, persistencia ni clientes. [Diseño](docs/dominio-B03.07-B03.08.md)
e [informe](docs/evidencia/B03.07-B03.08.md). Siguiente B03.09.

[Listo :v]

## 2026-09-19 — B03.05 y B03.06: nota y transición SRS

Se añadió calificación de bloques R01–R04 desde intentos verificados y
transición pura de tarjeta R05–R11 con vencimientos, profundidad, reps,
lapses y directiva de reintento. Se contrastaron 40 variantes, 60 pasos de
transición y 16 casos de máximo propio. Aprobaron 63 pruebas, lint,
typecheck y build en Node 26.9.0 y Node 24.21.0, además de T01.
Sin HTTP, persistencia ni cliente. [Diseño](docs/dominio-B03.05-B03.06.md)
e [informe](docs/evidencia/B03.05-B03.06.md). Siguiente B03.07.

[Listo :v]

## 2026-09-19 — B03.03 y B03.04: intervalo y SAN del dominio

Se implementó el intervalo decimal exacto con `bigint`, primer repaso
`1.00 → 3.00` y posteriores `×2.5`; se aclaró la excepción en el plan fuente.
Se añadió verificación pura de plies, SAN y tiempos con `chess.js` 1.4.0,
incluidos rechazos estructurales y continuidad teórica tras error legal.
56 pruebas, lint, typecheck, build y T01 aprobaron en Node 26.9.0; 56 pruebas,
lint y typecheck también en Node 24.21.0. La nota espera B03.05; no hay
HTTP, persistencia ni cliente. [Diseño](docs/dominio-B03.03-B03.04.md) e
[informe](docs/evidencia/B03.03-B03.04.md). Siguiente B03.05.

[Listo :v]

## 2026-09-19 — B03.01 y B03.02: fixtures y fechas del dominio

Runner puro para 22 familias y 352 variantes B01 sin recalcular expectativas,
con guardia de imports del dominio. Funciones de fecha civil/IANA y ventana
UTC semiabierta con reloj inyectado; casos R20/R21, bisiestos y DST. Aprobaron
48 pruebas, lint, typecheck, build y T01 bajo Node 26; 48 pruebas, lint y
typecheck también bajo Node 24.21.0. Sin motor SRS completo ni artefacto
Android. [Diseño](docs/dominio-B03.01-B03.02.md) e
[informe](docs/evidencia/B03.01-B03.02.md). Siguiente B03.03.

[Listo :v]

## 2026-09-19 — B02.09 y B02.10: OpenAPI/DTO y auditoría

Los 70 esquemas Zod generan OpenAPI 3.1 y tipos DTO instalables desde el
tarball local. Se auditaron 14 operaciones HTTP, ejemplos 200/401/403,
12 errores y el recorrido de cuenta a estado por IDs públicos. 40 pruebas,
lint, typecheck, build, T01 y consumidor de tarball aprobaron en Node 26.9.0.
Una verificación posterior con binario oficial Node 24.21.0 aprobó de nuevo
40 pruebas, lint, typecheck, build, generación y consumidor, sin instalar
Node en el sistema.
OpenAPI documenta formas; Zod conserva refinaciones. D15 requiere medición
real en B08.08; Auth efectivo espera B05.12. Siguiente B03.01.
[Contrato](docs/contrato-B02.09-B02.10.md) e
[informe](docs/evidencia/B02.09-B02.10.md).

[Listo :v]

## 2026-09-19 — B02.07 y B02.08: paquete offline y revisión

Se añadieron esquemas/ejemplos instalables para paquete offline con ventanas
7+7 días, contenido verificable y renovación tras reconciliación, además de
lecturas con `minRevision`, ticket, avisos y readiness. Se fijó la frontera
Auth web/móvil sin inventar rutas Better Auth. 32 pruebas, lint, typecheck,
build, verificador T01 y consumidor de tarball aprobaron en Node 26.9.0.
La emisión y autorización efectivas esperan B05/B08–B10. Siguiente B02.09.
[Contrato](docs/contrato-B02.07-B02.08.md) e
[informe](docs/evidencia/B02.07-B02.08.md).

[Listo :v]

## 2026-09-18 — Corrección de B02.05 y B02.06 tras revisión estricta

Se cerraron seis defectos del contrato local: referencia verificable de zona
por evento, ejemplo aplicado coherente con la línea, motivos/efectos de
decisión compatibles, UUID canónicos y revisiones decimales, límite de 256 KiB
sobre el cuerpo original y correspondencia exacta de IDs en lotes mixtos.
Las pruebas cubren cambio remoto de zona y paquete presente. El historial
confiable de entregas y la aceptación HTTP corresponden a B08/B09; siguiente
punto B02.07. [Contrato](docs/contrato-B02.05-B02.06.md) e
[informe](docs/evidencia/B02.05-B02.06.md).

[Listo :v]

## 2026-09-18 — B02.05 y B02.06: eventos y decisiones

Se añadieron los esquemas instalables de `StudyEvent`, intentos crudos,
snapshots base, dependencias y evidencia de zona; y de `EventDecision`/
`EventResult`, replay, errores recuperables/terminales y lotes mixtos.
Los eventos no aceptan grading declarado por cliente; la decisión original
no se sustituye al repetirla. Sin HTTP, dominio, persistencia ni clientes.
[Contrato](docs/contrato-B02.05-B02.06.md) e
[informe](docs/evidencia/B02.05-B02.06.md). Siguiente B02.07.

[Listo :v]

## 2026-09-18 — B02.03 y B02.04: cuenta, sesión y onboarding

Esquemas y ejemplos instalables de perfil, ajustes, repertorio, tarjeta,
ítem, sesión y estado de cuenta. Precondiciones por versión y color permitido;
snapshots y origen de ítems conservados. Onboarding exige selección no vacía
y respuesta coherente; su transacción y las rutas HTTP esperan B08.
[Contrato](docs/contrato-B02.03-B02.04.md) e
[informe](docs/evidencia/B02.03-B02.04.md). Siguiente B02.05.

[Listo :v]

## 2026-09-18 — B02.01 y B02.02: primitivas, errores y catálogo

Se añadió `zephyriov-api/contracts` con esquemas Zod para ID, fecha,
instante, revisiones/intervalos decimales, errores y catálogo. La paginación
liga cursor a manifiesto; la revisión de línea usa ETag de contenido. Se
incluyeron ejemplos autorizados y de error. Ocho pruebas, lint, typecheck,
build y consumidor de tarball local aprobaron en Node 26.9.0.
[Contrato](docs/contrato-B02.01-B02.02.md) e
[informe](docs/evidencia/B02.01-B02.02.md). Siguiente B02.03; sin HTTP,
dominio, persistencia ni clientes.

[Listo :v]

## 2026-09-18 — T01 y T02: transferencia B01 y esqueleto API

T01 fijó la especificación activa en API con 22 JSON byte por byte idénticos
a la referencia, índice, manifiesto y avisos históricos en la referencia.
[Informe T01](docs/evidencia/T01.md). T02 añadió TypeScript estricto,
pnpm, Vitest, ESLint, lockfile y paquete local mínimo probado por consumidor.
[Informe T02](docs/evidencia/T02.md). Siguiente B02.01; sin dominio ni HTTP.

[Listo :v]

## 2026-09-15 — B01.03 completado documentalmente

En referencia: reglas R07–R10, 24 variantes nuevas y 34 transiciones;
86 variantes acumuladas. Redondeo decimal/fecha, mid sin crecimiento,
lapse conserva reps/profundidad y regraduación con un único lapse.
Verificación documental, fuentes, hashes y alcance aprobados.
Puntero a B01.04 para otra sesión. [Informe](docs/evidencia/B01.03.md).
Sin T01, proveedores ni desarrollo de clientes; cada cliente conserva
su repositorio y el orden planificación → API → infraestructura → Android → web.

[Listo :v]

## 2026-09-14 — B01.02 completado documentalmente

En referencia: reglas R05–R06, 22 variantes nuevas (26 transiciones),
reintento al final sin sumar reps, graduación limitada y contadores previos.
Verificación documental aprobada, incluidas las 40 variantes previas;
62 IDs únicos en total. En API se actualizan enlaces, evidencia y
`docs/next-job` a B01.03 para otra sesión. [Informe](docs/evidencia/B01.02.md).
No se ejecutó B01.03 ni se transfirieron artefactos a API.

[Listo :v]

## 2026-09-14 — B01.01 completado tras autorización de acceso

El usuario autorizó actuar en ambos repositorios y se entregaron en `Zephyriov`
las reglas R01–R04, 40 variantes JSON y su evidencia documental. `docs/next-job`
registra B01.01 completado y B01.02 como siguiente punto; no se ejecutó B01.02
ni se transfirieron artefactos a API. Verificación de documentos/fixtures,
hashes, enlaces, puntero y diff aprobada. [Informe](docs/evidencia/B01.01.md).

[Listo :v]

## 2026-09-14 — B01.01 pendiente de acceso al workspace documental

Se localizó el plan en el repositorio de referencia `Zephyriov` y se registraron
dependencias, fuentes y pasos para habilitar su escritura en
[el informe](docs/evidencia/B01.01.md). Se creó `docs/next-job` sin avanzar el
puntero: B01.01 permanece `pendiente_manual`. No se entregaron reglas ni fixtures.
El cierre corresponde al registro de esta sesión, no a completar B01.01.

[Listo :v]

## 2026-09-15 — B01.04 completado documentalmente

En referencia: R11–R13, 46 variantes nuevas y 132 acumuladas. Máximos
propios por color; selección sin duplicados, grupos desiguales y extremos
1/12 × 2/10. Orden reproducible con semilla/cinta de prueba; generador
productivo reservado a B03.07. Fuentes, verificaciones, hashes y alcance
aprobados. [Informe](docs/evidencia/B01.04.md). Puntero a B01.05 para otra
sesión; sin ejecutarlo. Solo planificación, sin T01, código ni proveedores.

[Listo :v]

## 2026-09-15 — B01.05 completado documentalmente

R14–R16: 52 variantes y 116 pasos nuevos; 184 variantes acumuladas.
Nuevas distintas, reintentos con origen review, cancelación sin fabricar
actividad, evidencia conservada y una fila por cuenta/día.
[Informe y comprobaciones](docs/evidencia/B01.05.md).
Fuentes, hashes, enlaces y alcance verificados; R01–R13 intactos.
El commit posterior de API se reconcilió contra el inventario B01.04.
Puntero a B01.06 para otra sesión; sin ejecutarlo.
B01 abierto; sin T01, aplicación, proveedores ni clientes.

[Listo :v]

## 2026-09-15 — B01.06 completado documentalmente

R17: 24 variantes, 34 pasos; 208 variantes acumuladas.
Retiro y mismo color conservan progreso; cambio/doble cambio reinician con
generaciones nuevas. Historial/completos conservados y sin relleno de cupo.
[Informe y comprobaciones](docs/evidencia/B01.06.md).
Fuentes, hashes, enlaces y alcance verificados; R01–R16 intactos.
Puntero a B01.07 para otra sesión, sin ejecutarlo.
Solo planificación; B01 abierto, sin T01 ni clientes.

[Listo :v]

## 2026-09-16 — B01.07: especificación completada

R18/R22: completos conservados, parcial en memoria y reenvío frente a nuevo intento dependiente.
[Informe diario](docs/evidencia/B01.07.md), fixtures, fuentes y alcance verificados.
264 variantes documentales acumuladas. Sin aplicación ni proveedores.

[Listo :v]

## 2026-09-16 — B01.08: especificación completada

R19: snapshots pedagógicos, sesión canónica y aviso de preferencias guardadas/en uso.
[Informe diario](docs/evidencia/B01.08.md), fixtures, fuentes y alcance verificados.
292 variantes documentales acumuladas. Sin aplicación ni proveedores.

[Listo :v]

## 2026-09-16 — B01.09: fechas y rachas especificadas

R20/R21, 60 variantes nuevas y 352 acumuladas; suspensión/cierre, zonas y
racha por fechas. [Informe diario](docs/evidencia/B01.09.md).
B01.10 pendiente. Solo planificación; sin T01 ni clientes.

[Listo :v]

## 2026-09-16 — B01.10: cierre de especificación G01

22 familias, 352 IDs, metadatos/fuentes/capas y seis estado×nota auditados.
Nueve verificadores originales aprobados en vistas temporales; fixtures intactos.
[Informe diario](docs/evidencia/B01.10.md). B01 completo documentalmente.
Siguiente T01; no se ejecutó T01/T02, API, infraestructura ni clientes.

[Listo :v]
