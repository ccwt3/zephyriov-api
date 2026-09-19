# Índice de fixtures SRS

**Índice activo desde T01.** Los enlaces R01–R22 apuntan a los JSON de API,
transferidos sin cambiar bytes. El historial B01 de abajo conserva sus
versiones y conteos de cada entrega. [Evidencia T01](evidencia/T01.md).

Estado vigente al 2026-09-16: **352 variantes, 22 familias R01–R22**, auditadas
en B01.10 (G01 de especificación). [Inventario completo por ID, fuente y capa](../../../Zephyriov/docs/blueprint/evidencia/B01.10-inventario.json)
y [cierre diario](evidencia/B01.10.md). Dominio, HTTP, Android y web no ejecutados.
Los índices y conteos de entregas anteriores se conservan debajo como historial;
la matriz completa vigente está en la sección B01.10 al final. `{white,black}`
enumera dos IDs concretos ya incluidos en JSON. [Reglas](reglas-srs.md).

| Archivo | Familia | Variantes | Especificación documental | Dominio | HTTP | Android / web |
|---|---|---:|---|---|---|---|
| [R01.json](../src/domain/fixtures/R01.json) | R01 | 8 | Verificada | No ejecutado, B03.05 | No ejecutado, B06 | No ejecutado, C03/C09 |
| [R02.json](../src/domain/fixtures/R02.json) | R02 | 8 | Verificada | No ejecutado, B03.05 | No ejecutado, B06 | No ejecutado, C03/C09 |
| [R03.json](../src/domain/fixtures/R03.json) | R03 | 14 | Verificada | No ejecutado, B03.05 | No ejecutado, B06 | No ejecutado, C03/C09 |
| [R04.json](../src/domain/fixtures/R04.json) | R04 | 10 | Verificada | No ejecutado, B03.05 | No ejecutado, B06 | No ejecutado, C03/C09 |
| [R05.json](../src/domain/fixtures/R05.json) | R05 | 8 | Verificada | No ejecutado, B03.06 | No ejecutado, B06 | No ejecutado, C04/C06/C09 |
| [R06.json](../src/domain/fixtures/R06.json) | R06 | 14 | Verificada | No ejecutado, B03.06 | No ejecutado, B06 | No ejecutado, C04/C06/C09 |
| [R07.json](../src/domain/fixtures/R07.json) | R07 | 4 | Verificada | No ejecutado, B03.06 | No ejecutado, B06 | No ejecutado, C04/C06/C09 |
| [R08.json](../src/domain/fixtures/R08.json) | R08 | 10 | Verificada | No ejecutado, B03.06 | No ejecutado, B06 | No ejecutado, C04/C06/C09 |
| [R09.json](../src/domain/fixtures/R09.json) | R09 | 4 | Verificada | No ejecutado, B03.06 | No ejecutado, B06 | No ejecutado, C04/C06/C09 |
| [R10.json](../src/domain/fixtures/R10.json) | R10 | 6 | Verificada | No ejecutado, B03.06 | No ejecutado, B06 | No ejecutado, C04/C06/C09 |

La exclusión de interacciones ilegales también requiere verificación e
interacción reales en esas capas futuras. Estos JSON no prueban legalidad SAN,
transporte ni persistencia. Las capas se derivan de §13 «Evidencia por familia R»
del [plan de trabajo](../../../Zephyriov/docs/blueprint/plan-trabajo-agentico.md).

## Variantes enumeradas

Todos los tiempos no indicados son 1000 ms. «Jugada» es el índice propio desde
1, no el ply. El error siempre es legal. «Ilegal previa» ocurre antes del
intento propio 1 y no ocupa una posición adicional del reporte.

| IDs (dos colores) | R | Profundidad/tamaño | Errores | Jugada: tiempo ms | Ilegal previa | Nota literal |
|---|---|---|---|---|---|---|
| `R01-lt-boundary-{white,black}` | R01 | 3/4 | 0 | 3: 120000 | no | `good` |
| `R01-lt-slow-{white,black}` | R01 | 3/4 | 0 | 3: 120001 | no | `mid` |
| `R01-eq-boundary-{white,black}` | R01 | 4/4 | 0 | 4: 120000 | no | `good` |
| `R01-eq-slow-{white,black}` | R01 | 4/4 | 0 | 4: 120001 | no | `mid` |
| `R02-lt-one-error-{white,black}` | R02 | 3/4 | 1 | 3: 1000 | no | `bad` |
| `R02-eq-one-error-{white,black}` | R02 | 4/4 | 1 | 4: 1000 | no | `bad` |
| `R02-eq-two-errors-{white,black}` | R02 | 4/4 | 2 | 4: 1000 | no | `bad` |
| `R02-eq-error-and-slow-{white,black}` | R02 | 4/4 | 1 | 4: 120001 | no | `bad` |
| `R03-expanded-zero-{white,black}` | R03 | 5/4 | 0 | 5: 1000 | no | `good` |
| `R03-expanded-boundary-{white,black}` | R03 | 5/4 | 0 | 5: 120000 | no | `good` |
| `R03-expanded-one-{white,black}` | R03 | 5/4 | 1 | 5: 1000 | no | `mid` |
| `R03-expanded-two-{white,black}` | R03 | 5/4 | 2 | 5: 1000 | no | `bad` |
| `R03-expanded-wrong-slow-{white,black}` | R03 | 5/4 | 1 | 1: 120001 | no | `mid` |
| `R03-expanded-two-and-slow-{white,black}` | R03 | 5/4 | 2 | 5: 120001 | no | `bad` |
| `R03-expanded-one-and-slow-{white,black}` | R03 | 5/4 | 1 | 5: 120001 | no | `mid` |
| `R04-expanded-slow-{white,black}` | R04 | 5/4 | 0 | 1: 120001 | no | `mid` |
| `R04-expanded-illegal-slow-{white,black}` | R04 | 5/4 | 0 | 1: 120001 | sí | `mid` |
| `R04-expanded-illegal-boundary-{white,black}` | R04 | 5/4 | 0 | 1: 120000 | sí | `good` |
| `R04-eq-illegal-boundary-{white,black}` | R04 | 4/4 | 0 | 1: 120000 | sí | `good` |
| `R04-eq-illegal-slow-{white,black}` | R04 | 4/4 | 0 | 1: 120001 | sí | `mid` |

Las variantes `lt` controlan profundidad menor que tamaño; `eq`, igualdad;
`expanded`, mayor por una. En los casos `boundary` el bloque puede durar más
de 120000 ms sumando jugadas y seguir siendo `good`: el umbral es individual.
`wrong-slow` deja explícito que una incorrecta lenta sigue siendo un error
legal, sin sumar una correcta lenta. Los controles con ilegal previa conservan
el tiempo activo total del turno propio, sin reiniciar ni descontar ese tiempo.

## Variantes de nuevas — B01.02

Todos usan tamaño 4, D=2026-09-14, zona `America/Mexico_City` y tarjeta
actualmente `new` con intervalo 0.00. Salidas `good`: `review`, intervalo
1.00, due/nextDue=2026-09-15, sin reintento. Salidas `bad/mid`: conservan
tarjeta, reintento al final y nextDue=null. La columna reps/lapses muestra
entrada → salida final. La fecha previa es D salvo los casos con origen
`review`, vencidos desde 2026-09-10; estos reciben una tarjeta ya `new`,
sin ejecutar el lapse de R10.

| IDs (dos colores) | R | Profundidad/total → final | Origen / intento inicial | Notas | reps / lapses | Reintento |
|---|---|---|---|---|---|---|
| `R05-new-bad-{white,black}` | R05 | 4/10 → 4 | new / 1 | bad | 0→0 / 0→0 | intento 2 |
| `R05-new-mid-{white,black}` | R05 | 4/10 → 4 | new / 1 | mid | 0→0 / 0→0 | intento 2 |
| `R05-repeat-bad-{white,black}` | R05 | 8/10 → 8 | review / 7 | bad | 7→7 / 2→2 | intento 8 |
| `R05-repeat-mid-{white,black}` | R05 | 8/10 → 8 | review / 7 | mid | 7→7 / 2→2 | intento 8 |
| `R06-standard-{white,black}` | R06 | 4/10 → 8 | new / 1 | good | 0→1 / 0→0 | no |
| `R06-exact-{white,black}` | R06 | 4/8 → 8 | new / 1 | good | 0→1 / 0→0 | no |
| `R06-capped-{white,black}` | R06 | 4/6 → 6 | new / 1 | good | 0→1 / 0→0 | no |
| `R06-short-{white,black}` | R06 | 3/3 → 3 | new / 1 | good | 0→1 / 0→0 | no |
| `R06-max-{white,black}` | R06 | 10/10 → 10 | review / 7 | good | 7→8 / 2→2 | no |
| `R06-retained-{white,black}` | R06 | 8/10 → 10 | review / 7 | good | 7→8 / 2→2 | no |
| `R06-sequence-{white,black}` | R06 | 4/10 → 8 | new / 1 | bad, mid, good | 0→0→0→1 / 0→0→0→0 | 2, luego 3, luego ninguno |

Hay 26 transiciones declaradas en 22 variantes; la secuencia incluye sus
dos pasos R05 como precondiciones de graduación R06. Ambos colores reciben
los mismos totales propios, sin aplicar notas ni contadores al rival.

Al cerrar B01.02 estaban verificadas las tres combinaciones `new × nota`.
R07–R22 y `review × nota` estaban pendientes; el avance B01.03 figura abajo.
B01 sigue abierto. [Evidencia B01.02](evidencia/B01.02.md).

El manifiesto B01.01 identifica la versión histórica de reglas e índice:
sus ocho hashes pasaron al iniciar B01.02. Esta ampliación cambia ambos
documentos; sus hashes al cierre están en [B01.02.sha256](../../../Zephyriov/docs/blueprint/evidencia/B01.02.sha256).
Los cuatro JSON R01–R04 y su verificador conservan sus bytes originales.

## Variantes de repasos — B01.03

D significa el día de cada bloque. Todos usan bloque 4 y máximo propio 20;
profundidades válidas y notas ya verificadas. Fecha previa: 2026-09-10.
R07/R08 con varias fechas encadenan tarjetas entre sesiones. R10-relearn
encadena tres intentos de la misma sesión. Los casos de frontera y no-cap
son controles aritméticos, no historiales reales de graduación.

| IDs (dos colores) | R | Notas / intervalos | Fechas de bloques → vencimientos | Profundidad | reps / lapses |
|---|---|---|---|---|---|
| `R07-first-{white,black}` | R07 | good: 1.00→3.00 | 09-15→09-18 | 4→8 | 1→2 / 0→0 |
| `R07-sequence-{white,black}` | R07 | good, good: 1.00→3.00→7.50 | 09-15→09-18; 09-18→09-26 | 4→8→12 | 7→8→9 / 2→2→2 |
| `R08-sequence-{white,black}` | R08 | good×3: 7.50→18.75→46.88→117.20 | 09-15→10-04; 10-04→11-20; 11-20→2027-03-17 | 4→8→12→16 | 7→8→9→10 / 2 constante |
| `R08-below-half-{white,black}` | R08 | good: 2.59→6.48 (raw 6.475) | 09-15→09-21, +6 | 4→8 | 7→8 / 2→2 |
| `R08-half-{white,black}` | R08 | good: 2.60→6.50 (raw 6.500) | 09-15→09-22, +7 | 4→8 | 7→8 / 2→2 |
| `R08-above-half-{white,black}` | R08 | good: 2.61→6.53 (raw 6.525) | 09-15→09-22, +7 | 4→8 | 7→8 / 2→2 |
| `R08-no-cap-{white,black}` | R08 | good: 400000.00→1000000.00 | 09-15→4764-08-12, +1000000 | 4→8 | 7→8 / 2→2 |
| `R09-first-{white,black}` | R09 | mid: conserva 1.00 | 09-15→09-16 | 4→4 | 1→2 / 0→0 |
| `R09-retained-{white,black}` | R09 | mid: conserva 46.88 | 09-15→09-16 | 8→8 | 7→8 / 2→2 |
| `R10-first-{white,black}` | R10 | bad: 1.00→0.00 | Conserva 09-10; nextDue null | 4→4 | 1→1 / 0→1 |
| `R10-retained-{white,black}` | R10 | bad: 46.88→0.00 | Conserva 09-10; nextDue null | 8→8 | 7→7 / 2→3 |
| `R10-relearn-{white,black}` | R10 | bad, mid, good: 46.88→0.00→0.00→1.00 | 09-15: conserva 09-10 dos veces, luego 09-16 | 8→8→8→12 | 7→7→7→8 / 2→3→3→3 |

Fechas abreviadas pertenecen a 2026; la fecha completa está en JSON.
Reintento: R10-first 1→2; R10-retained 7→8; R10-relearn 7→8→9 y termina
sin reencolar. Todos mantienen origen review. Good/mid review no reencolan.

Las seis combinaciones estado×nota están verificadas documentalmente:
R05–R06 para new y R07–R10 para review. Hay 24 variantes nuevas,
34 transiciones y 86 variantes acumuladas; R11–R22 siguen pendientes.
[Reglas de repaso](reglas-srs.md), [informe](evidencia/B01.03.md) y
[manifiesto actual](evidencia/B01.03.sha256). Los diez hashes B01.02 pasaron
al entrar; ocho artefactos permanecen idénticos y reglas/índice se amplían.

## B01.04 — Profundidad máxima y selección

Versión `B01.04-v1`: 46 variantes añadidas, **132 acumuladas**. Los conteos
y cierres anteriores describen sus entregas históricas. R01–R10 intactos.

| Archivo | Familia | Variantes | Especificación documental | Dominio | HTTP | Android / web |
|---|---|---:|---|---|---|---|
| [R11.json](../src/domain/fixtures/R11.json) | R11 | 16 | Verificada | No ejecutado, B03.06 | No ejecutado, B06 | No ejecutado, C04/C06/C09 |
| [R12.json](../src/domain/fixtures/R12.json) | R12 | 20 | Verificada | No ejecutado, B03.07 | No ejecutado, B08/B09 | No ejecutado, C06/C09 |
| [R13.json](../src/domain/fixtures/R13.json) | R13 | 10 | Verificada | No ejecutado, B03.07 | No ejecutado, B08/B09 | No ejecutado, C06/C09 |

Cada `{white,black}` expande a dos IDs. Máximos W/B cuentan solo propias.
Todos R11 tienen nota good ya verificada; estado y bloque se fijan en JSON.

| IDs (dos colores) | Estado | Plies / máximo W/B | Profundidad + bloque | Salida W/B |
|---|---|---|---|---|
| `R11-new-cap-{white,black}` | new | 17 / 9/8 | 8+4 | 9/8 |
| `R11-review-cap-{white,black}` | review | 17 / 9/8 | 8+4 | 9/8 |
| `R11-exact-min-{white,black}` | review | 18 / 9/9 | 7+2 | 9/9 |
| `R11-below-min-{white,black}` | new | 24 / 12/12 | 2+2 | 4/4 |
| `R11-at-max-{white,black}` | review | 18 / 9/9 | 9+10 | 9/9 |
| `R11-short-{white,black}` | new | 3 / 2/1 | 2/1+10 | 2/1 |
| `R11-grow-max-{white,black}` | review | 42 / 21/21 | 10+10 | 20/20 |
| `R11-cap-max-{white,black}` | new | 35 / 18/17 | 10+10 | 18/17 |

Selección: día 2026-09-15; cinta `zero`, salvo other-seed con `keep`.
Todos los órdenes se declaran literalmente en JSON. Reviews por ID después
de las nuevas; trazas de mezcla según [reglas](reglas-srs.md).

| IDs (dos colores) | Cupo / bloque | Resultado ordenado |
|---|---|---|
| `R12-empty-{white,black}` | 6/4 | Vacío |
| `R12-only-reviews-{white,black}` | 6/4 | R1,R2,R3,R4 |
| `R12-reference-{white,black}` | 6/4 | B1,A1,R1,R2,R3,R4; R5 futura fuera |
| `R12-future-only-{white,black}` | 6/4 | Vacío; new y review futuras fuera |
| `R12-ineligible-{white,black}` | 6/4 | A1; inactivas, inválidas y vacía fuera |
| `R12-min-small-{white,black}` | 1/2 | B1,R1 |
| `R12-min-large-{white,black}` | 1/10 | B1,R1 |
| `R12-max-small-{white,black}` | 12/2 | A02…A13,R1,R2; 14 ítems |
| `R12-max-large-{white,black}` | 12/10 | A02…A13,R1,R2; 14 ítems |
| `R12-effective-cap-{white,black}` | 6/10 | A1,R1; efectivas W:9,3 / B:8,2 |
| `R13-uneven-{white,black}` | 12/4 | B1,C2,A2,C1,A3,A1 |
| `R13-replay-{white,black}` | 12/4 | Misma entrada/semilla/salida que uneven |
| `R13-reordered-{white,black}` | 12/4 | Entrada invertida, misma salida que uneven |
| `R13-other-seed-{white,black}` | 12/4 | A1,B1,C1,A2,C2,A3 |
| `R13-single-{white,black}` | 12/4 | A2,A3,A1 |

Las cintas son dobles de prueba, no generadores productivos. Plies/máximos
y validez son precondiciones, sin prueba SAN. Los verificadores históricos
que fijan 86 variantes se ejecutan sobre el snapshot de entrada conservado,
y sus artefactos se comprueban por hash al salir; no se reescriben para esta
ampliación. [Informe B01.04](evidencia/B01.04.md),
[manifiesto actual](evidencia/B01.04.sha256).
R14–R22 pendientes; B01 permanece abierto.

## B01.05 — Actividad, cancelaciones y racha sin nuevas

52 variantes nuevas, 116 pasos; **184 variantes acumuladas**.
R01–R13 conservan sus bytes. Conteos anteriores son cierres históricos.

| Archivo | Familia | Variantes | Especificación documental | Dominio | HTTP | Android / web |
|---|---|---:|---|---|---|---|
| [R14.json](../src/domain/fixtures/R14.json) | R14 | 16 | Verificada | No ejecutado, B03.08 | No ejecutado, B06/B08/B09 | No ejecutado, C05/C09 |
| [R15.json](../src/domain/fixtures/R15.json) | R15 | 16 | Verificada | No ejecutado, B03.08 | No ejecutado, B06/B08/B09 | No ejecutado, C05/C09 |
| [R16.json](../src/domain/fixtures/R16.json) | R16 | 20 | Verificada | No ejecutado, B03.08 | No ejecutado, B06/B08/B09 | No ejecutado, C05/C09 |

Cada `{white,black}` representa dos IDs completos en JSON.
0/1 indica alta de una fila de actividad en cada paso, no longitud de racha.

| IDs (dos colores) | Escenario | Altas por paso |
|---|---|---|
| `R14-three-bad-{white,black}` | Tres distintas bad entre cuatro nuevas | 0,0,1 |
| `R14-three-mixed-{white,black}` | good,mid,bad entre cuatro nuevas | 0,0,1 |
| `R14-repeat-one-{white,black}` | Tres intentos de una línea | 0,0,0 |
| `R14-two-distinct-{white,black}` | Dos distintas de cuatro | 0,0 |
| `R14-reviews-not-new-{white,black}` | Dos reviews y una nueva | 0,0,0 |
| `R14-fourth-dedup-{white,black}` | Cuarta nueva no duplica día | 0,0,1,0 |
| `R14-same-account-day-existing-{white,black}` | Día propio preexistente | 0,0,0 |
| `R14-other-account-same-day-{white,black}` | Mismo día de otra cuenta | 0,0,1 |
| `R15-one-bad-{white,black}` | Una nueva bad, reintento pendiente | 1 |
| `R15-one-mid-{white,black}` | Una nueva mid, reintento pendiente | 1 |
| `R15-two-mixed-{white,black}` | Dos nuevas bad/mid; review y reintentos pendientes | 0,1 |
| `R15-two-repeat-one-{white,black}` | Una de dos, repetida | 0,0 |
| `R15-reviews-partial-{white,black}` | Solo uno de dos reviews | 0 |
| `R15-reviews-complete-{white,black}` | Todos reviews, mid/good | 0,1 |
| `R15-review-lapse-retries-{white,black}` | Review bad, otro good, reintentos new mid/good, siempre origen review | 0,0,0,1 |
| `R15-review-practice-retry-{white,black}` | Práctica no completa reintento de review | 0,0 |
| `R16-empty-{white,black}` | Sesión vacía | 0 |
| `R16-cancel-new-{white,black}` | Todas nuevas canceladas sin ejercicio | 0 |
| `R16-cancel-reviews-{white,black}` | Todos reviews cancelados sin ejercicio | 0 |
| `R16-cancel-after-partial-new-{white,black}` | Una calificada y otras tres canceladas | 0,0 |
| `R16-cancel-before-exercise-{white,black}` | Cancelar dos; luego calificar las dos exigibles | 0,0,1 |
| `R16-preserve-earned-{white,black}` | Ganar día y cancelar todos los pendientes | 0,0,1,0 |
| `R16-cancel-after-partial-review-{white,black}` | Review completado y otro cancelado | 0,0 |
| `R16-practice-only-{white,black}` | Tres prácticas no califican nuevas | 0,0,0 |
| `R16-partial-only-{white,black}` | Bloque incompleto no califica | 0 |
| `R16-invalid-only-{white,black}` | Reporte inválido no califica | 0 |

[Reglas y precondiciones](reglas-srs.md),
[informe](evidencia/B01.05.md),
[manifiesto de esta entrega](evidencia/B01.05.sha256).
Verificación documental; no demuestra dominio, persistencia ni clientes.
R17–R22 pendientes. B01 sigue abierto; siguiente B01.06.

## B01.06 — Retiro, reactivación, color y generaciones

24 variantes nuevas, 34 pasos; **208 variantes acumuladas**.
R01–R16 y sus evidencias conservan sus bytes; los conteos anteriores son
cierres históricos. Expectativas declaradas desde B01 R17/B07/B08.

| Archivo | Familia | Variantes | Especificación documental | Dominio | HTTP/persistencia | Android / web |
|---|---|---:|---|---|---|---|
| [R17.json](../src/domain/fixtures/R17.json) | R17 | 24 | Verificada | No ejecutado | No ejecutado, B07/B08/B09 | No ejecutado, C06/C10 |

Cada `{white,black}` expande a dos variantes completas.

| IDs | Operaciones y resultado |
|---|---|
| `R17-remove-mixed-{white,black}` | Retiro conserva tarjetas; cancela propios, otro pendiente permanece |
| `R17-remove-close-{white,black}` | Retiro cancela últimos pendientes; cierra sin actividad |
| `R17-remove-earned-{white,black}` | Retiro cierra y conserva el día ganado |
| `R17-reactivate-same-{white,black}` | Reactiva sin reset ni reabrir cancelados |
| `R17-same-active-{white,black}` | Misma selección activa conserva progreso y plan |
| `R17-repeated-color-{white,black}` | Cambia y repite selección; un único reset |
| `R17-change-active-{white,black}` | Cambia ambas tarjetas, new y review; otros datos intactos |
| `R17-reactivate-other-{white,black}` | Reactiva en otro color con generación nueva |
| `R17-double-change-{white,black}` | Ida y vuelta; dos generaciones nuevas sin restaurar progreso |
| `R17-full-cycle-{white,black}` | Retiro, mismo color, cambio y vuelta; historial/actividad conservados |
| `R17-short-change-{white,black}` | Bloque 10, línea de 3 plies: reset a 2 blancas/1 negra |
| `R17-min-change-{white,black}` | Bloque 2: reset a 2 propias |

Completos aplicados, práctica y sin decisión permanecen en todos los pasos,
junto con ítems calificados, otras aperturas/cuentas y generación editorial.
Son resúmenes declarativos; no demuestra almacenamiento ni recepción tardía.
[Reglas y precondiciones](reglas-srs.md),
[informe](evidencia/B01.06.md) y
[manifiesto](evidencia/B01.06.sha256).
R18–R22 pendientes. B01 sigue abierto; siguiente B01.07, sin ejecutar.

## B01.07 — Conservación y reintentos

56 variantes nuevas, **264 acumuladas**. R01–R17 intactos. Cada nombre de
escenario siguiente tiene un ID `Rxx-escenario-white` y otro `-black` en JSON.
Conteos anteriores describen entregas históricas.

| Archivo | Variantes | Especificación | Dominio | HTTP | Android / web |
|---|---:|---|---|---|---|
| [R18.json](../src/domain/fixtures/R18.json) | 24 | Verificada documentalmente | No ejecutado | No ejecutado, B06 | No ejecutado, C04/C06/C09 |
| [R22.json](../src/domain/fixtures/R22.json) | 32 | Verificada documentalmente | No ejecutado | No ejecutado, B06/B09 | No ejecutado, C04/C09/C10 |

R18: `close-android`, `reload-web`, `suspend-android`, `suspend-web`,
`saved-before-send`, `sending-uncertain`, `receipt-failed`, `logout-owner`,
`web-network-pause`, `storage-failed`, `mixed-decisions`, `expired-suspended`.
Dos completos conservados, tercero reiniciado o suspendido según proceso;
fallo de guardado no permite anunciar ni continuar; identidad de cuenta aislada.

R22: `replay-applied`, `replay-practice`, `replay-invalid`, `replay-after-expiry`,
`reordered-payload`, `query-not-found`, `id-reused`, `new-bad`, `new-mid`,
`review-bad`, `review-mid`, `new-good`, `review-good`, `parent-pending`,
`parent-practice`, `parent-invalid`.
Reenvío recupera decisión; ejercicio pedagógico nuevo tiene padre; dependencia
pendiente y decisiones terminales no se confunden.

[Reglas y límites](reglas-srs.md), [informe](evidencia/B01.07.md),
[manifiesto de esta entrega](evidencia/B01.07.sha256).
B01.07 cerrado documentalmente; R19–R21 pendientes. B01 sigue abierto.

## B01.08 — Snapshots pedagógicos y sesión canónica

28 variantes nuevas, **292 acumuladas**. R01–R18 y R22 conservan sus bytes;
los conteos anteriores describen entregas históricas.

| Archivo | Variantes | Especificación | Dominio | HTTP | Android / web |
|---|---:|---|---|---|---|
| [R19.json](../src/domain/fixtures/R19.json) | 28 | Verificada documentalmente | No ejecutado | No ejecutado, B08/B09 | No ejecutado, C05/C06/C10 P10 |

Cada nombre forma los IDs `R19-nombre-white` y `R19-nombre-black`:

| Escenario | Expectativa |
|---|---|
| `save-android` | Guardar 10/6, mantener 6/4, aviso completo y ambos valores |
| `save-web` | Mismos snapshots, aviso de sesión; web sin descargas |
| `resume-canonical` | Reanudar plan y pedagogía existentes |
| `next-online` | Nueva sesión elegible usa 10/6 |
| `package-future` | Día proyectado de descarga anterior conserva 6/4 |
| `canonical-same-day` | Otra solicitud del mismo día conserva sesión/cupo |
| `old-package-compatible` | Evento 6/4 compatible con plan 10/6 puede aplicar |
| `outside-plan` | Línea de plan divergente es práctica; no unir cupos |
| `renewal-new` | Paquete nuevo 10/6; sesión/eventos anteriores intactos |
| `renewal-failed` | Sin cola resuelta ni commit no anunciar descarga lista |
| `offline-unaware` | Dispositivo desconectado mantiene preferencia conocida |
| `grade-old` | Profundidad5/error1 con tamaño4: mid; good nueva4 crece a8 |
| `grade-new` | Profundidad5/error1 con tamaño6: bad; good nueva4 crece a10 |
| `destination-canonical` | Día destino ya resuelto recupera sesión; sin cálculo de zona |

[Reglas y precondiciones](reglas-srs.md), [informe](evidencia/B01.08.md),
[manifiesto actual](evidencia/B01.08.sha256).
R20/R21 aún no especificados. B01 abierto; siguiente B01.09 en otra sesión.

## B01.09 — Fecha de bloque, zona y rachas

60 variantes nuevas, **352 acumuladas**. R01–R19/R22 conservan sus bytes.
Conteos y pendientes anteriores son estados históricos de cada entrega.

| Archivo | Variantes | Especificación | Dominio | HTTP | Android / web |
|---|---:|---|---|---|---|
| [R20.json](../src/domain/fixtures/R20.json) | 28 | Verificada documentalmente | No ejecutado, B03 fechas | No ejecutado, B08/B09 | No ejecutado, C03/C06/C09/C10 P11 |
| [R21.json](../src/domain/fixtures/R21.json) | 32 | Verificada documentalmente | No ejecutado, B03 fechas/racha | No ejecutado, B08/B09 | No ejecutado, C03/C06/C09/C10 P11 |

Cada nombre expande a `Rxx-nombre-white` y `Rxx-nombre-black`:

R20: `midnight`, `month`, `year`, `leap-enter`, `leap-exit`, `common-feb`, `century-common`, `century-leap`, `dst-forward`, `dst-backward`, `suspended`, `closed`, `expired-suspended`, `replace-pending`.

R21: `zone-forward`, `zone-backward`, `remote-during-block`, `offline-unaware`, `reconnected-next`, `destination-canonical`, `arrival-312`, `ends-yesterday`, `stale`, `gap-best`, `duplicate-date`, `empty`, `leap-streak`, `dst-short-day`, `dst-long-day`, `year-streak`.

[Reglas](reglas-srs.md), [informe](evidencia/B01.09.md), [manifiesto](evidencia/B01.09.sha256).
B01.09 completado; B01.10 pendiente de auditoría. No se ejecutó algoritmo ni I/O.

## B01.10 — Inventario vigente y cierre G01

**22 familias, 352 variantes, 176 pares de color; cero fixtures modificados.**
[Inventario JSON](../../../Zephyriov/docs/blueprint/evidencia/B01.10-inventario.json) enumera los 352 IDs con
posición JSON, fuentes y hash de expectativa. Las seis combinaciones estado×nota
tienen evidencia en ambos colores; las nueve verificaciones originales pasaron.

| Archivo | Variantes | Versión | Especificación | Dominio | HTTP | Android | Web |
|---|---:|---|---|---|---|---|---|
| [R01.json](../src/domain/fixtures/R01.json) | 8 | B01.01-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R02.json](../src/domain/fixtures/R02.json) | 8 | B01.01-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R03.json](../src/domain/fixtures/R03.json) | 14 | B01.01-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R04.json](../src/domain/fixtures/R04.json) | 10 | B01.01-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R05.json](../src/domain/fixtures/R05.json) | 8 | B01.02-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R06.json](../src/domain/fixtures/R06.json) | 14 | B01.02-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R07.json](../src/domain/fixtures/R07.json) | 4 | B01.03-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R08.json](../src/domain/fixtures/R08.json) | 10 | B01.03-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R09.json](../src/domain/fixtures/R09.json) | 4 | B01.03-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R10.json](../src/domain/fixtures/R10.json) | 6 | B01.03-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R11.json](../src/domain/fixtures/R11.json) | 16 | B01.04-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R12.json](../src/domain/fixtures/R12.json) | 20 | B01.04-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R13.json](../src/domain/fixtures/R13.json) | 10 | B01.04-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R14.json](../src/domain/fixtures/R14.json) | 16 | B01.05-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R15.json](../src/domain/fixtures/R15.json) | 16 | B01.05-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R16.json](../src/domain/fixtures/R16.json) | 20 | B01.05-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R17.json](../src/domain/fixtures/R17.json) | 24 | B01.06-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R18.json](../src/domain/fixtures/R18.json) | 24 | B01.07-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R19.json](../src/domain/fixtures/R19.json) | 28 | B01.08-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R20.json](../src/domain/fixtures/R20.json) | 28 | B01.09-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R21.json](../src/domain/fixtures/R21.json) | 32 | B01.09-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| [R22.json](../src/domain/fixtures/R22.json) | 32 | B01.07-v1 | Verificada | No ejecutado | No ejecutado | No ejecutado | No ejecutado |

Los puntos responsables de cada capa figuran por familia en el inventario.
Matriz estado×nota: R05-new-bad, R05-new-mid, R06-standard, R10-first,
R09-first y R07-first, cada uno white/black. Cubren contadores, fechas,
profundidad y reintento; los casos de redondeo añaden las fronteras decimales.

B01 completo documentalmente, **G01 de especificación** satisfecha. R18/R22
no se dan por probados en I/O por tener JSON. D12 contrato B02.05/ensayo B09.03
pendientes; no hay decisión de producto nueva. [Informe](evidencia/B01.10.md)
y [manifiesto de cierre](evidencia/B01.10.sha256). Siguiente T01 en API,
con transferencia trazable posterior; no hay dos copias activas ahora.
