# Branch changes

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
