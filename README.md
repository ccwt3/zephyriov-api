# zephyriov-api

## Reconstrucción

El [estado de trabajo agéntico](docs/next-job) es la fuente única del siguiente
punto. B01.01–B01.04 están completados documentalmente: [reglas R01–R13](../../Zephyriov/docs/blueprint/reglas-srs.md)
y [132 fixtures declarativos](../../Zephyriov/docs/blueprint/fixtures-srs/README.md)
en el repositorio de referencia, según el plan. Su transferencia a API corresponde
a T01. B01.05 queda registrado para la siguiente sesión; no se ejecutó todavía.

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
