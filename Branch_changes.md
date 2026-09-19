# Branch changes

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
