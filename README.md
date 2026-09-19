# zephyriov-api

## Reconstrucción

El [estado de trabajo agéntico](docs/next-job) es la fuente única del siguiente
punto. T01 transfirió la [especificación SRS activa](docs/reglas-srs.md),
su [índice](docs/fixtures-srs.md) y 22 JSON de `src/domain/fixtures/` desde la
referencia con hashes idénticos: 352 variantes declarativas. T02 preparó el
paquete TypeScript mínimo. B01 y G01 están cerrados solo en especificación;
el siguiente punto es B02.01, contrato de primitivas y errores.

La raíz API se construye con Node.js 24 y pnpm 12.4.2. `pnpm install`,
`pnpm test`, `pnpm lint`, `pnpm typecheck` y `pnpm build` son los comandos
del esqueleto. El paquete exporta únicamente la versión de especificación;
todavía no contiene dominio, HTTP ni persistencia. La [evidencia T01](docs/evidencia/T01.md)
y [evidencia T02](docs/evidencia/T02.md) detallan verificación y límites.

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
