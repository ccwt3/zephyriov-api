# Reglas SRS — especificación B01

**Fuente normativa activa desde T01:** esta copia en el repositorio API.
Los 22 JSON se transfirieron sin cambiar bytes y se indexan en
[fixtures-srs.md](fixtures-srs.md). Los caminos `sources.path` de esos JSON
conservan su base original, `Zephyriov/docs/blueprint/fixtures-srs/`;
véase el [manifiesto de transferencia](evidencia/T01.md). Los pasajes que
describen B01 como pendiente de transferir registran el estado histórico.

Estado vigente al 2026-09-16: **B01.01–B01.10 completados documentalmente**,
22 familias R01–R22 y 352 variantes. Auditoría `B01.10-v1`, puerta G01 de
especificación; dominio, HTTP, persistencia y clientes no ejecutados.
[Inventario y cierre](evidencia/B01.10.md). Las secciones siguientes conservan
el contexto y alcance histórico de cada entrega; el cierre vigente está al final.

## Autoridad y ubicación

Fuentes, en orden operativo del [plan de trabajo](../../../Zephyriov/docs/blueprint/plan-trabajo-agentico.md), §2:

1. Instrucciones de esta sesión: únicamente B01.01, y autorización posterior
   para actuar sobre ambos repositorios de Zephyriov.
2. [Blueprint de backend](../../../Zephyriov/docs/blueprint/plan-accionable-backend.md), 11/09/2026, §B01
   «Especificación funcional y casos de referencia»: tabla R01–R04, unidades,
   variantes y metadatos.
3. [Plan base](../../../Zephyriov/docs/blueprint/plan-desarrollo-zephyriov.md), 10/09/2026, §2.3
   «Unidad, selección y limpieza» y «Calificación de cada bloque».
4. [README funcional](../../../Zephyriov/README.md), «Motor SRS» y «El tablero de estudio».

§5 «B01» y §11 «Alcance exacto del primer incremento» del plan de trabajo
definen esta entrega. Las fuentes consultadas concuerdan; no se detectó una
divergencia funcional ni se decidió una pedagogía nueva. El protocolo separado
no existe: se aplica §13 conforme al fallback de §14.

Esta es la única especificación activa de calificación del remake. Durante
B01 estuvo en el repositorio de referencia; T01 la trasladó aquí. El puntero
operativo único se mantiene en [next-job](next-job).

## Unidad y entradas mínimas

Se estudia desde el comienzo de la línea hasta la profundidad efectiva propia.
La profundidad y el tamaño de bloque cuentan **jugadas del estudiante**.
Los plies empiezan en 1: blancas impares, negras pares. Con cuatro propias,
los intentos blancos son `[1,3,5,7]`; los negros `[2,4,6,8]`. El rival avanza
la posición, pero no produce intentos calificables del estudiante.

Se recibe un bloque completo, profundidad efectiva positiva ya determinada,
tamaño de bloque del snapshot aplicable e intentos ya verificados. La
selección, el límite al final de línea y la captura/versionado del snapshot
pertenecen a sus puntos posteriores. Aquí se usan profundidades 3, 4 y 5 con
tamaño 4, sin inventar SAN ni una línea de catálogo.

«Primer bloque» significa profundidad menor o igual al tamaño aplicable;
«ampliado», profundidad mayor. No depende del número de intento del día,
de si la tarjeta es nueva o repaso, ni del color. Cambiar los colores solo
cambia los plies propios, conservando las mismas notas.

## Errores y tiempo activo

- Una jugada legal distinta de la continuación teórica cuenta como un error.
  Se muestra la continuación correcta; la corrección automática no se cuenta
  como un segundo intento del estudiante para ese ply.
- Una jugada ilegal rebota sin cambiar la posición, no añade error y no se
  convierte en intento reportado. El estudiante sigue en su turno. En los
  fixtures, la interacción previa es contexto local separado del reporte.
- Una correcta es lenta cuando su tiempo activo supera 120000 ms.
  Exactamente 120000 ms no es lenta; 120001 ms sí. El tiempo es individual,
  no la suma del bloque ni el tiempo del rival.
- El tiempo de una jugada incorrecta no convierte esa jugada en «correcta
  lenta». Sigue contando su error legal. Una ilegal previa no autoriza
  reiniciar ni descontar el tiempo activo declarado del turno propio.

La legalidad/corrección de estos ejemplos se declara como precondición, no se
demuestra reproduciendo ajedrez. El verificador futuro debe comprobarla contra
la teoría y rechazar reportes inválidos; excluir una interacción ilegal en UI
no significa aceptar una jugada ilegal enviada como intento al servidor.

## Tabla normativa de calificación

La tabla desarrolla sin cambiar la tabla de §2.3 del plan base y R01–R04 de
§B01 del backend. Los casos se excluyen entre sí: el umbral de errores que
produce `bad` conserva prioridad aunque también haya una correcta lenta.

| Profundidad frente al tamaño | Errores legales | Correctas lentas | Nota |
|---|---:|---|---|
| Menor o igual (primer bloque) | 0 | Ninguna | `good` |
| Menor o igual (primer bloque) | 0 | Una o más | `mid` |
| Menor o igual (primer bloque) | 1 o más | Cualquier cantidad | `bad` |
| Mayor (ampliado) | 0 | Ninguna | `good` |
| Mayor (ampliado) | 0 | Una o más | `mid` |
| Mayor (ampliado) | 1 | Cualquier cantidad | `mid` |
| Mayor (ampliado) | 2 o más | Cualquier cantidad | `bad` |

R01 fija la frontera temporal del primer bloque; R02, cualquier error legal
en ese bloque; R03, los ampliados con 0/1/2 errores; R04, la lentitud en
ampliados y la ausencia de penalización por ilegales. Los controles adicionales
por profundidad/color y prioridad figuran en el [índice](fixtures-srs.md).

## Contrato documental de los fixtures

Los JSON son ejemplos declarativos, **no DTO HTTP ni código de aplicación**.
Cada archivo de familia contiene `fixtureVersion`, `scope` y `fixtures`.
Cada variante incluye:

- `id` único y `rule`: trazabilidad al grupo R correspondiente.
- `sources`: ruta relativa al JSON, sección exacta y referencia R cuando aplica.
- `initialState`: color, profundidad efectiva, snapshot de tamaño y bloque completo.
- `input.verifiedAttempts`: un intento legal por ply propio, con corrección y
  milisegundos activos explícitos. `correct` es un dato verificado para este
  ejemplo puro, no una autoridad aceptada del cliente HTTP.
- `input.priorInteractions`: interacción ilegal local, cuando existe; no es
  parte de `verifiedAttempts` ni del reporte esperado.
- `clock` y `seed`: «no aplica», con motivo. La duración por jugada está fija;
  no intervienen fecha, zona ni aleatoriedad en estas notas.
- `expected`: nota literal, errores legales, correctas lentas, plies reportados
  e interacciones ilegales excluidas. Los conteos hacen revisable el ejemplo;
  no imponen la firma pública de un futuro `gradeBlock`.
- `forbiddenEffects`: no calificar al rival, no penalizar ilegales, no confundir
  tiempos y no aplicar scheduling ni escrituras desde la calificación aislada.

Las expectativas se transcribieron de las fuentes anteriores. La herramienta
documental comprueba su consistencia con 20 filas de referencia literales;
no implementa ni invoca un algoritmo nuevo de calificación.

## Límites de la evidencia

40 variantes en [R01](../src/domain/fixtures/R01.json), [R02](../src/domain/fixtures/R02.json),
[R03](../src/domain/fixtures/R03.json) y [R04](../src/domain/fixtures/R04.json). Cada escenario tiene
ambos colores; profundidad 4 prueba igualdad y 5 prueba mayor por una; 3
controla el lado menor del comparador. Se verifica la nota del bloque completo.

El índice distingue especificación de dominio, HTTP y clientes. R05–R22,
las seis combinaciones estado×nota con sus transiciones, scheduling, contadores,
graduación, reintento, racha, selección, suspensión y persistencia permanecen
fuera de esta entrega. No se marca B01 entero completo.

[Informe diario y verificaciones reproducibles](evidencia/B01.01.md).

## B01.02 — Nuevas: reintento, graduación y contadores

Ampliación documental `B01.02-v1`, 14 de septiembre de 2026. Las secciones
anteriores conservan la entrega B01.01; esta sección añade únicamente R05–R06.
La fuente activa sigue en este repositorio hasta T01.

### Fuentes y alcance

Autoridad: instrucción actual y `zephyriov-api/docs/next-job`; [plan de
trabajo](../../../Zephyriov/docs/blueprint/plan-trabajo-agentico.md), §5 B01.02 y §11 día 2; [backend](../../../Zephyriov/docs/blueprint/plan-accionable-backend.md),
§B01 R05–R06 y §B03 (`nextDue`); [plan base](../../../Zephyriov/docs/blueprint/plan-desarrollo-zephyriov.md),
§2.3 «Unidad, selección y limpieza» y «Scheduling y profundidad»;
[README funcional](../../../Zephyriov/README.md), «Motor SRS» y «Manejo de fechas».
Lectura puntual de `lib/srs/scheduler.ts` solo para corroborar la conservación
de campos en nuevas: no se copia ni ejecuta su algoritmo como oráculo.
No se detectó discrepancia funcional entre estas fuentes.

Entrada: tarjeta actualmente `new`, bloque completo con nota ya verificada,
profundidad válida limitada al total de jugadas propias, tamaño del snapshot
aplicable, día civil D fijado al inicio del bloque y cola restante conocida.
La nota es una entrada pura, nunca una nota confiada al cliente HTTP.
`originType` es la clasificación al seleccionar la línea; puede ser `review`
aunque la tarjeta ya esté `new`. Su transición anterior queda fuera de R05–R06.

### Matriz de nuevas

| Nota | Estado posterior | Intervalo | Vencimiento almacenado | Profundidad propia | reps | lapses | Reintento / nextDue |
|---|---|---|---|---|---|---|---|
| `bad` | `new` | Conserva 0.00 | Conserva anterior | Conserva | Conserva | Conserva | Al final / `null` |
| `mid` | `new` | Conserva 0.00 | Conserva anterior | Conserva | Conserva | Conserva | Al final / `null` |
| `good` | `review` | 1.00 | D+1 | Suma tamaño, limitada al total | +1 | Conserva | Ninguno / D+1 |

Los intervalos de los JSON son cadenas decimales de dos posiciones según
backend «Convenciones comunes y arquitectura». D es 2026-09-14 en
`America/Mexico_City`; D+1 es
2026-09-15. Una tarjeta vencida desde 2026-09-10 también gradúa respecto de D,
no respecto de su vencimiento anterior. R05 conserva esa fecha antigua en la
tarjeta, pero `nextDue:null` comunica el reintento en la misma sesión.

Cada bloque completo queda calificado incluso con `bad/mid`. Reencolar crea
otro intento de la misma línea y sesión al final de los pendientes, incluidos
reintentos existentes, manteniendo la clasificación original. No hay tope
pedagógico de reintentos: los casos con intento 7 deben producir intento 8.
No aumenta el cupo de líneas nuevas. La racha y el contrato de eventos/IDs
dependientes se especificarán en B01.05 y B01.07, respectivamente.

La graduación suma exactamente una repetición aun después de varios fallos;
no reinicia reps ni lapses previos. Ejemplos literales revisados:
4+4=8 de 10; 4+4=8 de 8; 4+4 limitado a 6 da 6; 3 de 3 queda en 3;
10 de 10 queda en 10; 8+4 limitado a 10 da 10. Son variantes de graduación
de nueva, sin ejecutar la familia R11 ni las transiciones de repaso R07–R10.

### Formato y evidencia R05–R06

[R05](../src/domain/fixtures/R05.json) contiene 8 variantes y [R06](../src/domain/fixtures/R06.json)
14: once escenarios por ambos colores, 22 variantes y 26 transiciones
declaradas. La secuencia aislada `bad → mid → good` conserva reps=0 en los
dos reintentos y termina con reps=1, profundidad 8, intervalo 1.00 y sin
reintento. Las otras variantes incluyen una cola mixta cuyo orden se conserva.

Cada variante incluye ID, familia, fuentes/secciones, `initialState` (tarjeta,
color, origen, número de intento y pendientes), `input` (notas verificadas,
bloque completo, tamaño y total), reloj fijo, semilla no aplicable con motivo,
`expected.steps` y efectos prohibidos. Cada paso esperado contiene tarjeta,
nota, intento calificado, estado `graded`, reintento, `nextDue` y cola. En la
secuencia, la salida de un paso es la precondición del siguiente; el escenario
solo contiene la línea estudiada. Los nombres de cola son etiquetas abstractas,
no UUID ni DTO. El color no cambia las transiciones: todas las profundidades
y máximos ya cuentan exclusivamente jugadas del estudiante.

Las expectativas se transcriben de una matriz literal antes del dominio.
El verificador comprueba documentos/JSON y trazabilidad; no calcula un nuevo
scheduler, no selecciona líneas ni ejecuta transporte o persistencia.
Con B01.01 quedan 62 variantes documentales. El [índice por capa](fixtures-srs.md)
mantiene dominio/HTTP/Android/web sin ejecutar. B01 sigue abierto; R07–R22
permanecen para sus puntos. [Informe B01.02](evidencia/B01.02.md).

## B01.03 — Repasos, redondeo y lapse

Ampliación documental `B01.03-v1`, 15 de septiembre de 2026. Añade únicamente
R07–R10; las secciones anteriores son el registro de B01.01/B01.02.
Fuente activa en referencia hasta T01. Planificación antes de API e
infraestructura; después Android y web, cada cliente en su repositorio.

### Fuentes, entrada y matriz de repaso

Autoridad: instrucción actual y puntero API; [plan de trabajo](../../../Zephyriov/docs/blueprint/plan-trabajo-agentico.md),
§5 B01.03 y §11 día 3; [backend](../../../Zephyriov/docs/blueprint/plan-accionable-backend.md), convenciones
decimales, §B01 R07–R10 y §B03; [plan base](../../../Zephyriov/docs/blueprint/plan-desarrollo-zephyriov.md),
§2.3 «Scheduling y profundidad»; [README funcional](../../../Zephyriov/README.md),
«Motor SRS» y «Manejo de fechas». Lectura corroborativa del scheduler antiguo
para conservación del vencimiento en lapse; no se copia ni ejecuta como oráculo.
No hay discrepancia funcional. §13 del plan es el protocolo aplicable según §14.

Entrada: tarjeta `review`, nota de bloque completo ya verificada, profundidad
y total propios válidos, tamaño del snapshot y día civil D fijado al inicio
de ese bloque. La nota es precondición del ejemplo, no autoridad HTTP.
El estado de tarjeta puede cambiar a `new`, pero el origen del ítem permanece
`review`. Cada aparición se estudia acumulativamente desde el comienzo.

| Nota | Estado | Intervalo persistido | Vencimiento / nextDue | Profundidad | reps | lapses | Reintento |
|---|---|---|---|---|---|---|---|
| good | review | 1.00→3.00; después ×2.5 a dos decimales | D + entero redondeado del valor sin redondear | Suma tamaño, limitada al total propio | +1 | Conserva | No |
| mid | review | Conserva, aun si es fraccionario | D+1 / D+1 | Conserva | +1 | Conserva | No |
| bad | new | 0.00 | Conserva anterior / null | Conserva | Conserva | +1 | Al final |

Los casos de crecimiento usan total propio 20 y bloque 4, sin alcanzar el
máximo: prueban ampliación en repasos; R11 y su frontera se reservan a B01.04.
Los máximos propios son precondición verificada para ambos colores; no se
cuentan movimientos rivales. Todos conservan los demás pendientes de la cola.

### Cálculos decimales y fechas de referencia

La fecha y el intervalo persistido derivan por separado del intervalo sin
redondear. Conservar centésimas entre bloques; no persistir los días enteros
de la fecha ni arrastrar fracciones descartadas. Para valores positivos,
las mitades se redondean hacia arriba, tanto a días enteros como a centésimas
(semántica decimal conservada de la referencia). No usar coma flotante binaria.

D es el día de inicio de **cada** bloque; los D+3/D+8 y D+19/D+47 de la
tabla fuente son desplazamientos respecto de su D correspondiente, no
respecto del primer bloque de la cadena. La tarjeta de entrada está vencida
desde 2026-09-10: no se programa desde aquel vencimiento.

| Intervalo previo | D | Valor sin redondear | Persistido | Días fecha | Próximo vencimiento |
|---|---|---|---|---|---|
| 1.00 | 2026-09-15 | 3.00 (primer repaso) | 3.00 | 3 | 2026-09-18 |
| 3.00 | 2026-09-18 | 7.500 | 7.50 | 8 | 2026-09-26 |
| 7.50 | 2026-09-15 | 18.750 | 18.75 | 19 | 2026-10-04 |
| 18.75 | 2026-10-04 | 46.875 | 46.88 | 47 | 2026-11-20 |
| 46.88 | 2026-11-20 | 117.200 | 117.20 | 117 | 2027-03-17 |
| 2.59 | 2026-09-15 | 6.475 | 6.48 | 6 | 2026-09-21 |
| 2.60 | 2026-09-15 | 6.500 | 6.50 | 7 | 2026-09-22 |
| 2.61 | 2026-09-15 | 6.525 | 6.53 | 7 | 2026-09-22 |
| 400000.00 | 2026-09-15 | 1000000.000 | 1000000.00 | 1000000 | 4764-08-12 |

2.59/2.60/2.61 y 400000.00 son controles aritméticos con entradas decimales
admitidas por la convención documental; no se afirma que esas entradas
provengan de una cadena de graduaciones real. 6.525→6.53 distingue el
redondeo de centésimas de un empate al par. El caso grande demuestra la
expectativa sin tope heredado de `numeric(8,2)`, no un tiempo de uso real.

Con entrada de dos decimales y factor 2.5, las fracciones del producto van
en pasos de 0.025. Redondearlo a centésimas antes de redondear a días no
cambia el entero en estos casos: la salida JSON sola no puede detectar
ese orden incorrecto. Se documenta y verifica la ecuación desde
`rawInterval`; B03 deberá revisar la implementación. No fabricar un
intervalo previo con más de dos decimales para aparentar cubrir esa diferencia.

La zona fija es `America/Mexico_City`; se suman días civiles, no horas
transcurridas. El cambio de mes/año de estas sumas no acredita medianoche,
DST, cambios de zona ni atribución temporal de R20–R21, reservados a B01.09.

### Lapse y regraduación

Un `review/bad` conserva profundidad, reps y fecha almacenada; pasa a new,
intervalo 0.00 y lapses+1. El resultado completo queda `graded`. Se añade
otro intento al final, manteniendo línea, sesión y origen review; `nextDue`
es null aunque la tarjeta conserve la fecha antigua. Intento 7 produce 8,
sin límite pedagógico ni cupo adicional de nuevas.

La secuencia R10-relearn enlaza R10 con reglas R05–R06 ya especificadas:
review con profundidad 8, reps 7 y lapses 2 → bad: new/8/7/3 →
mid: new/8/7/3 → good: review/12/8/3, intervalo 1.00 y D+1.
Solo el fallo ocurrido en estado review suma lapse; el reintento new/mid
no suma reps ni lapses. Graduar suma una rep y no recupera el intervalo 46.88.
Esta secuencia no prueba racha, identidad de eventos ni persistencia.

### Formato y evidencia R07–R10

[R07](../src/domain/fixtures/R07.json), [R08](../src/domain/fixtures/R08.json),
[R09](../src/domain/fixtures/R09.json) y [R10](../src/domain/fixtures/R10.json): 12 escenarios
por dos colores, 24 variantes y 34 transiciones. Total acumulado: 86 variantes.
Las seis combinaciones estado×nota quedan especificadas documentalmente.

Cada fixture conserva el formato de metadatos anterior. `clock.studyDates`
y `input.attemptNumbers` se corresponden con las notas y salidas por índice.
En cadenas de repaso de varios días, cada bloque pertenece a su sesión y usa
intento 1; solo se encadena el estado de tarjeta. En R10-relearn los intentos
7/8/9 son de la misma sesión y día. Las cadenas usan una cola aislada; los
casos simples comprueban una cola mixta. No se está probando el builder diario.

`expected.steps[].arithmetic.rawInterval` registra el valor previo a
redondear de review/good; es null en las otras ramas.
`dateOffsetDays` es el desplazamiento civil esperado o null si reencola.
Son campos de explicación documental, no un contrato público de la API.

Expectativas literales contrastadas con fuentes y verificación Decimal de
ecuaciones/fechas; ningún algoritmo nuevo genera sus propias expectativas.
[Índice por capa](fixtures-srs.md) e [informe diario](evidencia/B01.03.md).
Dominio, HTTP y clientes no ejecutados. B01 permanece abierto; siguiente
B01.04, sin ejecutarlo ni transferir fuentes a API.

## B01.04 — Profundidad máxima y selección reproducible

Versión documental `B01.04-v1`, 15 de septiembre de 2026. Añade R11–R13.
Las secciones anteriores conservan el estado histórico de sus entregas.
Fuentes: [backend](../../../Zephyriov/docs/blueprint/plan-accionable-backend.md), B01 R11–R13, B02 Settings
(solo límites ya aprobados) y B03; [plan base](../../../Zephyriov/docs/blueprint/plan-desarrollo-zephyriov.md),
§2.3 «Unidad, selección y limpieza» / «Scheduling y profundidad»;
[plan de trabajo](../../../Zephyriov/docs/blueprint/plan-trabajo-agentico.md), §5 B01.04 y §11 día 4.
README «Motor SRS» corrobora nuevas primero y round-robin. Fuentes concordantes.

### R11: máximo propio y bloque acumulado

Con nota `good` ya verificada, tanto new como review amplían a
`min(profundidad + movesPerBlock, máximo propio)`. Llegar al final no inventa
jugadas ni impide futuros repasos. No hay un máximo universal de diez propias.
Las demás consecuencias de good ya están especificadas en R06–R08.
R11 aísla la proyección de profundidad, sin repetir el scheduler completo.

Para una secuencia validada de N plies contiguos desde blancas, las propias
son los impares para blancas y los pares para negras. Máximos: `(N+1)//2`
y `N//2`, respectivamente. Con 17 plies hay 9 propias blancas y 8 negras:
profundidad 8 + bloque 4 da 9 y 8. El ejemplo R11 total propio 9 aplica
igualmente a negras en una línea de 18 plies (variante exact-min).
Cada bloque vuelve desde la primera jugada hasta su profundidad efectiva;
no se estudia solo el tramo recién desbloqueado.

La profundidad efectiva al seleccionar es el mínimo de la almacenada y el
máximo real del color. No se recorta al tamaño del bloque: una tarjeta con
profundidad 4 y bloque 2 sigue estudiando cuatro propias. Recortar lo que se
estudia no modifica la tarjeta persistida. Esta proyección no especifica
reconciliación editorial, generaciones ni cambios de preferencias R17/R19.

Los JSON usan número de plies y máximos de una línea **previamente validada**.
No contienen SAN ni acreditan legalidad; secuencia desde blancas es precondición.
Las líneas vacías, inválidas o sin propias del color no entran al plan.

### R12: elegibilidad, cupos y agotamiento

Entrada: nueva construcción diaria, candidatos únicos por lineId con color,
apertura, revisión/generaciones y tarjeta de la base vigente. D=2026-09-15,
zona America/Mexico_City. Participan solo aperturas activas, líneas válidas
con propias del color y tarjetas `dueDate <= D`, tanto new como review.
No incluye futuras aunque sobren cupos. Se filtra **antes** de mezclar.
La validez/generación ya comprobada es precondición; no hay reconciliación aquí.

Se eligen hasta `newLinesPerDay` nuevas, se añaden **todos** los reviews
vencidos y se presentan nuevas primero. El límite 1–12 restringe nuevas,
no el total diario: doce nuevas más dos reviews dan catorce ítems.
Con dos nuevas, objetivo seis, cuatro reviews vencidos y uno futuro,
resultan exactamente seis ítems. No repetir nuevas para completar seis.
Si se agotan nuevas, todavía entran los reviews; si todo está vacío o futuro,
el plan queda vacío. No se deriva racha ni estado de sesión completada aquí.

Las preferencias permitidas son 1–12 nuevas (inicial 6) y 2–10 propias
por bloque (inicial 4). Cuatro variantes cruzan los extremos 1/12 × 2/10.
Tamaño del bloque y profundidad acumulada son independientes; los snapshots
de ejemplo ya están fijados. Los reintentos futuros se añaden al final según
R05/R10 y no dan otro cupo. Reanudar una sesión y resolver conflictos de
planes pertenecen a B08/B09; aquí se construye un plan fresco.

### R13: orden canónico y aleatoriedad explícita de prueba

Antes de mezclar se ordenan por ID estable los candidatos elegibles, los
IDs de apertura y las líneas dentro de cada grupo. Los IDs ASCII de estos
fixtures se comparan por sus caracteres, sin locale ni orden de consulta.
Los reviews mantienen el orden canónico por lineId después de las nuevas.
Se mezcla cada grupo de nuevas en orden canónico de apertura y después
la lista de aperturas. Se recorre esa lista por rondas, una línea por grupo
no agotado, hasta alcanzar el cupo o agotar todos. Saltar un grupo agotado
no termina la selección ni autoriza duplicados.

Para fijar órdenes esperados sin implementar el motor nuevo, estos fixtures
inyectan un **doble de prueba** `fixture-tape-v1`. Es una cinta explícita de
valores en [0,1), elegida por la semilla textual `zero` o `keep`:

- `zero`: cada extracción vale 0.
- `keep`: cada extracción vale la fracción exacta 65535/65536.
- Mezcla de prueba: para i=n−1 hasta 1, intercambiar i con
  `floor(u × (i+1))`, consumiendo una extracción por intercambio.
- Listas de cero o un elemento no consumen valores. Las cintas JSON tienen
  exactamente el número consumido; agotarlas antes o consumir de más falla.
- Las listas de prueba tienen como máximo trece elementos. `zero` rota cada
  lista una posición a la izquierda; `keep` deja su orden intacto.

Es una convención del adaptador de pruebas, **no** la elección de PRNG,
derivación de semilla por cuenta/día, distribución aleatoria ni versión SRS
productivas. Esas decisiones y su ejecución corresponden a B03.07. El contrato
exige reloj/semilla/versión explícitos y la misma salida para la misma base.
B03 deberá consumir estos fixtures con el doble inyectado y añadir vectores
del generador productivo elegido; estos ejemplos no prueban paridad runtime.

Ejemplo literal independiente: A=[A1,A2,A3], B=[B1], C=[C1,C2].
Con `zero`, grupos mezclados A=[A2,A3,A1], B=[B1], C=[C2,C1]; aperturas
[B,C,A]. Rondas: [B1,C2,A2], [C1,A3], [A1]. Resultado esperado:
**B1,C2,A2,C1,A3,A1**. Con `keep`: **A1,B1,C1,A2,C2,A3**.
Repetir entrada/semilla, invertir el orden recibido o cambiar color sin
cambiar elegibilidad conserva el primer orden. Un único grupo [A1,A2,A3]
con `zero` produce **A2,A3,A1**. No se exige que toda semilla diferente
produzca siempre orden distinto: solo se verifica este par concreto.

### Formato, cobertura y evidencia R11–R13

[R11](../src/domain/fixtures/R11.json): 16 variantes; [R12](../src/domain/fixtures/R12.json):
20; [R13](../src/domain/fixtures/R13.json): 10. Son 23 escenarios por ambos colores,
46 variantes nuevas y **132 acumuladas**. Cada variante conserva fuentes,
estado, entrada, reloj, semilla explícita o no aplicable, expectativas y
efectos prohibidos. Nombres de IDs y campos de trazas son documentales,
no DTO definitivos. `expected.shuffleTrace` permite revisar los intercambios
sin usar un builder nuevo como oráculo. Los órdenes finales son literales;
el verificador audita permutaciones, rondas, filtros y cuentas por separado.

[Índice por capa](fixtures-srs.md), [informe](evidencia/B01.04.md).
Solo especificación comprobada. Dominio, HTTP y clientes pendientes;
B01 sigue abierto. Siguiente B01.05, sin ejecutarlo. Fuentes en referencia
hasta T01; planificación → API → infraestructura → Android → web.

## B01.05 — Actividad, cancelaciones y racha sin nuevas

Versión `B01.05-v1`, 15 de septiembre de 2026. Ampliación limitada a
R14–R16. Fuentes: [backend](../../../Zephyriov/docs/blueprint/plan-accionable-backend.md), B01 R14–R16,
B03, B06 y B08; [plan base](../../../Zephyriov/docs/blueprint/plan-desarrollo-zephyriov.md), §2.3
«Racha y progreso» y «Unidad, selección y limpieza»;
[plan agéntico](../../../Zephyriov/docs/blueprint/plan-trabajo-agentico.md), §5 B01.05, §11 día 5 y D16.
Las fuentes concuerdan. B08 precisa la limpieza del conjunto exigible;
no se introduce una regla pedagógica distinta.

### Criterio de ejercicio y origen

La unidad para actividad con nuevas es la línea distinta seleccionada con
`originType:new`, calificada por un bloque completo, válido y aplicado.
`bad`, `mid` y `good` cuentan por igual. Intentos adicionales de la misma
línea no aumentan ese conjunto. Reviews no lo aumentan, aunque un lapse
cambie su tarjeta a `new`: el ítem y todos sus reintentos mantienen
`originType:review` (D16). El estado actual de tarjeta no clasifica esfuerzo.

- R14: con cuatro nuevas, tres líneas distintas calificadas conceden el día,
  aun con `bad/mid` y con la cuarta, reviews o reintentos todavía pendientes.
  Calificar una línea tres veces, o solo dos líneas, no alcanza.
- R15: con una o dos nuevas exigibles, se califican todas. No se exige
  graduarlas ni terminar sus reintentos para actividad. Sin nuevas,
  se completan todos los repasos y sus reintentos pendientes; review/mid
  no reencola, pero review/bad sí. Su reintento new/mid vuelve a reencolar:
  sigue siendo un repaso a efectos de actividad hasta terminar esa cadena.
- La fila de actividad se deduplica por `(accountId, studyDate)`.
  Una cuarta línea o una evaluación posterior no añade otra fila.
  Una fila de otra cuenta en la misma fecha no satisface ni bloquea la propia.
  Una fila ya obtenida se conserva.

### Cancelación y sesión vacía

`pending`, `graded` y `cancelled` son estados separados. Una cancelación
no tiene nota, no incrementa completados ni líneas calificadas y no borra
bloques completos. Puede dejar cero pendientes y cerrar el plan sin
actividad. Tampoco una práctica, parcial o reporte inválido califica un
ítem canónico ni completa un reintento.

Se recalcula el conjunto exigible después de cancelar: una línea original
sin ningún ejercicio aplicado y cuyos pendientes se cancelaron deja de ser
exigible. Una línea ya calificada conserva esa evidencia aunque se cancele
su reintento. No se rellena el cupo con otra línea.

Cancelar por sí solo no concede un día que antes faltaba, incluso si ya
había ejercicio parcial de la sesión. Ejemplos: calificar una de cuatro
nuevas y cancelar las otras tres; o completar un review y cancelar el otro.
Ambos cierran el plan sin fabricar actividad. Si primero se cancelan dos
de cuatro nuevas y luego se califican las dos restantes, ese ejercicio sí
satisface el conjunto reducido. Cancelar después de haber ganado el día
preserva su fila. Son aplicaciones del texto explícito de B08, no equivalencia
entre cierre de sesión y actividad.

Una sesión inicialmente vacía no es ejercicio. El predicado «todos
completados» sobre un conjunto vacío no concede actividad.

### Formato y límites de la evidencia

[R14](../src/domain/fixtures/R14.json) contiene 16 variantes,
[R15](../src/domain/fixtures/R15.json) 16 y [R16](../src/domain/fixtures/R16.json) 20:
26 escenarios × dos colores, 52 variantes y 116 pasos nuevos;
184 variantes acumuladas. Los dos colores conservan el mismo criterio de
esfuerzo. El [índice](fixtures-srs.md) enumera cada escenario y capa.

`initialState.items` declara ítems pendientes, líneas y origen; las tarjetas
antes/después, notas y decisiones de `input.operations` son precondiciones
ya verificadas en otras familias. `retry` declara identidad, padre e igual
origen de un nuevo intento; no es reenvío técnico ni contrato definitivo.
Cada paso tiene expectativa literal de líneas distintas, pendientes,
completados, cancelados y alta de actividad (0/1).
`activityDaysAfter` contiene el registro final esperado de cuenta/día.

Las operaciones son trazas abstractas de evidencia para actividad: no
certifican navegación de la cola ni orden de presentación. El contraejemplo
de repetir una línea tres veces aísla el conteo de líneas de R14; no permite
saltarse el orden pedagógico. `pendingItemIds` enumera el inventario restante
en su orden de declaración, no una implementación nueva del builder.
La actividad preexistente es una precondición del registro, no permiso para
crear otra sesión del mismo día. No se reconstruye aquí su historial.

Fecha/zona fijas, semilla no aplicable; la atribución civil ya viene resuelta.
Sin ensayo de medianoche, DST, cambio de zona, llegadas de días desordenados
o longitud de rachas (R20–R21/B01.09). Las decisiones aplicadas/práctica,
legalidad y almacenamiento son precondiciones; no se demuestra HTTP ni
durabilidad con JSON. No se ejecuta `deriveActivity` nuevo.
Dominio B03.08, persistencia B06/B08/B09 y clientes C05 siguen pendientes.

[Informe y verificación](evidencia/B01.05.md).
B01.05 completado documentalmente; B01 sigue abierto.
Siguiente: B01.06 (R17), sin ejecutarlo. Fuentes en referencia hasta T01.

## B01.06 — Repertorio, color y generaciones (R17)

Versión `B01.06-v1`, 15 de septiembre de 2026. Solo R17.
Fuentes: [backend](../../../Zephyriov/docs/blueprint/plan-accionable-backend.md), B01 R17, B07 y B08;
[plan base](../../../Zephyriov/docs/blueprint/plan-desarrollo-zephyriov.md), §2.3 «Unidad, selección y
limpieza» y §2.5 (identidad/generaciones);
[plan agéntico](../../../Zephyriov/docs/blueprint/plan-trabajo-agentico.md), §5 B01.06, §11 día 6 y §13.
B08 precisa el reset y la cancelación. El README antiguo describe borrado
de pendientes; el remake usa `cancelled` conforme a B01/B08. Es la
distinción ya acordada en el plan, no una divergencia nueva.

### Retiro y reactivación

Retirar una apertura de la cuenta fija `active=false`. Conserva sus
tarjetas con color, generación personal, generación editorial y todos los
campos SRS. Solo cancela sus ítems pendientes de hoy, incluidos reintentos;
un ítem calificado no se convierte en cancelado. No toca pendientes de
otras aperturas ni tarjetas de otra cuenta. El catálogo global y las
revisiones de contenido permanecen.

Se recalcula el estado de sesión: si queda otro pendiente, sigue pendiente;
si no queda ninguno, puede cerrar. No rellena el cupo con nuevas líneas.
La cancelación no tiene nota, no es esfuerzo ni crea actividad. El día ya
ganado y su evidencia permanecen, como se especificó en R14–R16.

Reactivar con el mismo color conserva íntegro el progreso existente y las
generaciones. Seleccionar una apertura ya activa con el mismo color también
lo conserva. Alta/reactivación crea solo tarjetas faltantes; estos fixtures
parten de todas las tarjetas presentes y por ello esperan cero altas.
No reabre cancelados ni inserta nuevas líneas en una sesión ya iniciada:
reanudar conserva el plan, y la selección normal siguiente corresponde al
builder. No se implementa aquí el alta de variantes editoriales.

### Cambio y doble cambio de color

Seleccionar otro color permitido, tanto estando activa como al reactivar,
crea una generación personal nueva para cada tarjeta de esa apertura.
La identidad cuenta/línea y la generación editorial permanecen. El estado
efectivo de cada tarjeta queda así:

| Campo | Valor después de cada cambio |
|---|---|
| Color / generación personal | Color elegido / identificador nuevo, distinto de los anteriores |
| Estado / intervalo | `new` / `"0.00"` |
| Reps / lapses / última nota | `0` / `0` / `null` |
| Profundidad | Mínimo entre tamaño de bloque aplicable y jugadas propias reales |
| Vencimiento | Día local de la operación, ya atribuido en estos ejemplos |

El límite cuenta blancas en plies impares y negras en pares. Con 7 plies y
bloque 4 el reset es a 4 propias blancas o 3 negras; con 3 plies y bloque 10,
a 2 blancas o 1 negra. Con bloque 2 y líneas suficientemente largas, es 2.
No hereda profundidad, intervalos, reps, lapses ni nota del progreso anterior.

El segundo cambio de vuelta al color inicial crea otra generación nueva y
otro reset. No restaura la primera generación ni un progreso guardado por
color. Repetir la selección del color ya aplicado conserva el primer reset;
no duplica tarjetas ni produce otro reinicio. Los identificadores
`old/first/second` de los JSON son símbolos opacos para comparar igualdad,
no contadores ni formato de ID productivo.

Se cancelan pendientes incompatibles y se recalcula la sesión sin sustituirlos
ni fabricar actividad. Los fixtures tienen pendientes del color inicial;
por eso todos los pendientes propios de la apertura resultan incompatibles
con el primer cambio. Otras aperturas/cuentas permanecen intactas.

### Completos e historial

Retiro/reactivación/cambio de color nunca borran resultados completos,
intentos, revisiones ni decisiones previas. El color y generación de un
completo histórico no se reescriben para coincidir con la tarjeta reiniciada.
Esto incluye completos aplicados, práctica y completos aún sin decisión:
se conservan como evidencia, sin volverlos automáticamente aplicables.

La generación anterior no puede reactivar progreso viejo. La recepción
futura de un resultado incompatible requiere práctica con motivo y teoría
histórica según B07/B09; aquí es un efecto prohibido y una obligación futura,
no una prueba de ingestión, idempotencia, outbox o muerte del proceso.
Esos ensayos siguen en sus puntos propios; R18/R22 no se ejecutan aquí.

### Fixtures y límites

[R17.json](../src/domain/fixtures/R17.json): 12 escenarios × dos colores, 24 variantes
y 34 pasos; **208 variantes acumuladas** con R01–R16 intactos.
Cada variante declara estado inicial, operaciones, reloj, semilla no
aplicable, salida por paso, datos preservados y efectos prohibidos.
`expected.preserved` debe conservarse en **todos** los pasos.
`createdCardIds/createdItemIds` vacíos también rigen para toda la traza.

Los resultados completos son resúmenes abstractos preexistentes.
`attemptExcerpt` es un extracto, no el reporte completo ni un DTO aceptable
por HTTP; legalidad, nota, decisión y durabilidad son precondiciones.
Los estados de tarjeta no reconstruyen el historial que los originó.
Los días de actividad ganados ya están atribuidos; no se recalculan rachas.

No se fijan versiones de transporte, respuestas a PUT con precondición
obsoleta, confirmación UI ni formato productivo de generaciones. La selección
repetida supone una operación admitida; solo fija que no debe resetear otra vez.
El tamaño aplicable ya viene resuelto y es constante; no se ejecuta R19.

Especificación documental verificada; dominio y transacciones B07/B08,
conflictos tardíos B09 y clientes C06/C10 siguen sin ejecutar.
[Índice por capa](fixtures-srs.md) e
[informe](evidencia/B01.06.md). B01 abierto; siguiente B01.07.

## B01.07 — Parciales, completos y dos clases de reintento

Versión `B01.07-v1`, 2026-09-16. Solo R18/R22; 56 variantes añadidas,
264 acumuladas. Fuentes: [backend](../../../Zephyriov/docs/blueprint/plan-accionable-backend.md), B01 R18/R22,
B02/B06/B09; [plan base](../../../Zephyriov/docs/blueprint/plan-desarrollo-zephyriov.md), §2.5/§3.4;
[cliente](../../../Zephyriov/docs/blueprint/plan-accionable-cliente.md), acuerdos/C03/C04/C06/C09, y
[plan agéntico](../../../Zephyriov/docs/blueprint/plan-trabajo-agentico.md), §5 B01.07/§11 día 7/§13.
Fuentes concordantes; no divergencia ni intervención M02.

### Conservación R18

El parcial contiene posición, intentos y tiempo activo únicamente en memoria.
Suspender con proceso vivo conserva esa memoria, fecha y zona de inicio;
pausa tiempo/animaciones. Matar proceso, cerrar o recargar pestaña descarta
el parcial: el bloque elegible se inicia desde teoría inicial, sin calificar
el incompleto. No existen checkpoint durable por jugada ni envío parcial.

Dos completos **ya confirmados por commit local** sobreviven al cierre durante
el tercero: se recuperan sus eventos y, cuando existen, recibos. Completo
pendiente de decisión no equivale a progreso remoto confirmado. `sending`
tras reinicio es incierto: consultar o reenviar mismo evento/payload.
Una respuesta remota cuyo recibo local falló tampoco permite destruir el
único payload. Applied/practice/invalid son decisiones definitivas distintas;
resolver cola no implica que las tres avanzaran SRS.

Al fallar el commit local del tercero, conservar `complete_unsaved` en memoria,
no anunciar guardado y no permitir Continuar a otro bloque. No se afirma que
ese resultado todavía no guardado sobreviva a matar el proceso. El ensayo
futuro debe inyectar fallos antes/después de commit local y remoto; no deducir
atomicidad a partir de estos JSON. Completos no se borran por logout: permanecen
bajo la cuenta original, invisibles e intransmisibles para otra cuenta.

Web pausa ante pérdida de red y conserva parcial solo mientras viva la
pestaña; IndexedDB de completos no habilita estudio offline. Android suspendido
con paquete vencido no puede continuar hasta reconciliar/renovar: conservar
memoria no concede vigencia. El fixture recibe `expired` como precondición;
no ensaya límites temporales ni R20/R21.

### Identidad y reintento R22

Un reenvío técnico conserva ID y contenido congelado, recupera exactamente la
decisión original y no aplica SRS otra vez ni crea práctica duplicada. La
recuperación sucede antes de reevaluar caducidad, tras autenticar propietario.
Orden de claves distinto conserva contenido; ID igual con contenido distinto
rechaza `EVENT_ID_REUSED`, conserva decisión y detiene reenvío automático del
payload en conflicto. Un 404 de consulta permite reenviar el mismo evento;
no autoriza crear otro ID. Nunca se cambia ID para forzar avance.

Un reintento pedagógico existe por new bad/mid o review bad (R05/R10), conserva
clasificación original, aumenta número de intento y crea ítem al final con
padre explícito. Al **completar ese nuevo ejercicio**, se congela otro evento
que depende del resultado que produjo su base. No se crea un evento completo
solo porque se haya encolado el ítem. New/review good y review mid no reencolan.
El nuevo ejercicio puede aplicar si padre y base son válidos; no se trata como
copia de transporte ni como otra línea nueva para actividad.

Padre aún ausente: `DEPENDENCY_PENDING`, sin decisión terminal y con reintento
posterior. Padre práctica: descendiente práctica `DEPENDENCY_PRACTICE` sin
avance. Padre inválido terminal: descendiente invalid/`DEPENDENCY_INVALID`,
sin reintento automático de ese payload, conservando evidencia. Tarjetas
independientes no adquieren dependencia artificial. Conteos de actividad y
scheduling se rigen por R05–R16; estos escenarios no recalculan esas reglas.

### Forma y límites

Los IDs, payloadRef, positionRef y cardAfterRef son símbolos documentales de
objetos inmutables, no UUID/DTO ni reporte SAN. `retainedEvents` describe lo
conservado, no impone que un worker mantenga `sending` en lugar de normalizarlo
a pending. `newEventIds` de escenarios pedagógicos se refiere al siguiente
bloque completado, explícito en `nextCompletedEvent`; no al mero encolado.
Ambos colores declaran dos/cuatro jugadas propias, sin penalizar al rival.
Expectativas literales independientes del algoritmo nuevo; reloj fijo y sin
semilla porque no se seleccionan planes. `additionalSrsApplications` cuenta
aplicaciones de bloque, no incremento de reps; bad nuevo no aumenta reps.

[Índice](fixtures-srs.md) y [evidencia](evidencia/B01.07.md).
Especificación documental verificada; dominio no ejecutado. B06/B09 demostrarán
HTTP/decisiones; C04/C06/C09/C10 almacenamiento y cierre reales. B01 abierto.

## B01.08 — Snapshots pedagógicos, sesión canónica y aviso

Versión `B01.08-v1`, 2026-09-16. R19 añade 28 variantes (14 escenarios ×
dos colores); **292 acumuladas**. Fuentes: [backend](../../../Zephyriov/docs/blueprint/plan-accionable-backend.md),
acuerdos del 11/09/B01 R19/B08/B09; [cliente](../../../Zephyriov/docs/blueprint/plan-accionable-cliente.md),
acuerdos/C05/C06; [plan base](../../../Zephyriov/docs/blueprint/plan-desarrollo-zephyriov.md), §2.5/§3.4;
[plan agéntico](../../../Zephyriov/docs/blueprint/plan-trabajo-agentico.md), §5 B01.08/§13. Sin divergencia M02.

### Preferencia deseada y pedagogía en uso

Guardar 6 líneas nuevas/4 jugadas propias como 10/6 crea una nueva revisión
de preferencia deseada. La sesión iniciada conserva su snapshot 6/4, su plan
y cupo; reanudar no sortea otra vez ni agrega cuatro líneas. La próxima sesión
online elegible, sin sesión canónica ni procedencia de paquete anterior, usa
10/6. Una descarga vigente conserva 6/4 para todos los días que proyecte,
aunque el perfil ya tenga 10/6. No se invalida un evento solo porque su versión
de preferencias difiera del perfil actual.

Cuenta/día tiene una sesión canónica. Otro dispositivo que solicita ese día
recupera la existente y su pedagogía, sin crear una segunda sesión para
multiplicar cupo. Incluso al resolver otro huso a un día ya existente se
conserva esa sesión; aquí el día destino es precondición explícita, no cálculo
de zona ni fixture R20/R21.

La reconciliación de un evento de paquete antiguo usa su snapshot para nota
y crecimiento, pero exige compatibilidad con el plan canónico. Una línea
compatible puede aplicar con 6/4 aunque la sesión canónica conserve 10/6;
un ítem fuera del plan es práctica `OUTSIDE_DAILY_PLAN`, sin avanzar SRS,
sesión ni actividad. No unir pools o cupos y no convertir la diferencia de
preferencias por sí sola en conflicto. Los fixtures presuponen reporte,
base, generaciones, dependencias y ventana válidos salvo conflicto indicado.

### Renovación y avisos

Renovar exige cola resuelta, revisión vigente e instalación íntegra. Un
paquete nuevo usa 10/6 para sus próximas sesiones elegibles; no reescribe
sesiones canónicas preexistentes ni eventos/paquetes anteriores. Si la
renovación falla, conservar el último paquete válido y no anunciar descarga
lista. Sin red, un dispositivo no conoce cambios hechos en otro dispositivo;
usa su snapshot conocido hasta reconectar, sin fabricar actualización remota.

Aviso aprobado que debe mostrarse antes o junto a Guardar y mantener en la
confirmación posterior:

> Los cambios se aplicarán a las próximas sesiones. La sesión iniciada y las sesiones de tus descargas vigentes conservarán sus preferencias anteriores hasta que renueves la descarga.

Mostrar valores guardados y valores en uso cuando difieren: «Guardado para
próximas sesiones: 10 líneas / 6 jugadas» y «Sesión actual: 6 líneas / 4 jugadas».
Para descarga vigente, mostrar vigencia y acción Renovar al reconectar, sin
sugerir que Guardar alteró la descarga. En web sin descargas puede omitirse la
segunda oración; se conserva el aviso de sesión iniciada. Esa excepción está
explícita en acuerdos del cliente y concuerda con la web online.

La zona se informa por separado: «El cambio de zona se aplicará al siguiente
bloque. No cambiará tus días anteriores.» No sustituye el snapshot pedagógico;
su atribución detallada corresponde a B01.09, sin ejecutarlo aquí.

### Discriminadores y límites de evidencia

El probe con profundidad propia 5, un error legal y cero correctas lentas da
`mid` bajo tamaño antiguo 4 (ampliado), pero `bad` bajo tamaño nuevo 6 (primer
bloque). Otro probe independiente, nueva good/profundidad4/máximo20, crece a
8 con tamaño4 y a10 con tamaño6. Son expectativas de R02/R03/R06 ya fijadas;
no se cambia grading ni se crean nuevas reglas. Probes no son eventos SAN
ni decisiones HTTP; ambos colores cuentan solo jugadas propias.

`effectiveSettings` es la pedagogía del ejercicio/proyección consultada;
`canonicalQuota` es el cupo del plan canónico o el previsto al crear el plan
elegible; `canonicalSessionAfter` representa la sesión autoritativa existente.
Pueden diferir para evento compatible de paquete anterior. Sesión ausente
conserva `canonicalSessionAfter: null`: se especifica selección de snapshot,
no se finge haber construido/transaccionado una sesión. Fechas/planes y
vigencia son precondiciones; no se ejecuta builder, reloj ni proveedor.

[Índice](fixtures-srs.md) y [evidencia](evidencia/B01.08.md).
Solo especificación documental; B08/B09 demostrarán snapshots persistidos;
C05/C06/C10 P10 avisos/paridad reales. R20/R21 y auditoría B01.10 pendientes.

## B01.09 — R20/R21: fecha de bloque, zona y rachas

Versión `B01.09-v1`. Autoridad: acuerdos del 11/09 y B01/B03/B08/B09 del
[backend](../../../Zephyriov/docs/blueprint/plan-accionable-backend.md), C03/C06/C09 y C10 P11 del
[cliente](../../../Zephyriov/docs/blueprint/plan-accionable-cliente.md), fechas/racha del
[plan base](../../../Zephyriov/docs/blueprint/plan-desarrollo-zephyriov.md). Se añaden exclusivamente R20/R21.

### R20 — Inicio inmutable y Continuar

Fijar `startedAt`, `studyDate` y `studyTimezone` al iniciar cada bloque.
Completar de 23:58 a 00:03 atribuye evento, actividad elegible y scheduling
al día de inicio. Recepción posterior tampoco reemplaza esa fecha. Una nueva
good sigue R06: D+1, aunque ya sea hoy al terminar. El reloj UTC de auditoría
no es una fecha de sesión. No se confunde tiempo de pared con tiempo activo
para grading: la nota y compatibilidad están precondicionadas en estos casos.

Continuar resuelve fecha vigente usando la zona conocida y recupera/construye
ese plan desde tarjetas; nunca concatena pendientes de ayer. Una tarjeta
puede volver a ser elegible por el builder, pero eso no es arrastrar su ítem.
Sustituir pendientes no califica, no programa repaso ni concede actividad.
La evidencia obtenida mediante completos permanece.

Suspensión con proceso vivo conserva parcial, inicio/zona y tiempo activo en
memoria; no escribe checkpoint. Cierre/recarga pierde ese parcial: el siguiente
bloque arranca desde cero y con fecha vigente. La vigencia prevalece: en el
instante `expiresAt` un suspendido conserva memoria pero no admite jugadas ni
otro bloque hasta reconciliar/renovar. No se promete recuperar ese parcial
tras una renovación incompatible. Completos previos siempre se conservan.

Sumar días civiles usa calendario gregoriano, no horas locales/24. Hay febrero
bisiesto (incluido 2000), febrero común (incluido 2100), cambios de mes/año y
DST. En Nueva York, 2024-03-10 00:00→2024-03-11 00:00 son 23 h; el
2024-11-03→2024-11-04 son 25 h: ambas parejas están a un día civil. Instantes
UTC desambiguan la hora repetida de otoño y evitan fabricar la hora ausente.
La biblioteca temporal productiva y su versión se seleccionan/prueban en B03.

### R21 — Zona conocida, historial aplicable y unicidad

Cambiar zona afecta el siguiente bloque que conozca el ajuste, sin modificar
el bloque activo ni reconvertir fechas históricas. Offline conserva la zona
conocida de descarga hasta reconectar. Pedagogía y zona por bloque son
independientes: la sesión canónica del día destino conserva su snapshot/cupo,
aunque el nuevo bloque use otra zona. Una cuenta/fecha civil tiene una sesión
y una entrada de actividad; no se duplica por distinta zona o reenvío.

**D12, expectativa y evidencia mínima:** conservar revisiones inmutables de
settings y la procedencia del estado conocido por el dispositivo (snapshot
entregado o paquete emitido). Al iniciar el bloque fijar en memoria la referencia
a esa evidencia junto con fecha/zona; al completar, conservar la evidencia
necesaria para interpretar el evento. El servidor contrasta cronología y
fecha con la zona conocida acreditada por ese historial, sin exigir que sea
la zona actual al recibir. No basta confiar en una zona arbitraria declarada.
Ejemplo: snapshot v1 México conocido antes de 01:00Z; otro dispositivo cambia
a v2 Tokio a 01:01Z; bloque 01:00–01:05Z conserva día 16 en México; tras conocer
v2 a 01:06Z, el bloque de 01:07Z usa día 17 en Tokio. Si sigue offline, usa v1.

Los campos `knownAtStart`, `settingsHistory` y `newSettingsKnownAt` son evidencia
simbólica de fixture, no nuevos DTO ni prueba de recepción real. B02.05 debe
fijar la referencia verificable y su transporte sin confundirla con la versión
pedagógica; B09.03 debe persistir/resolver ese historial y probar el caso remoto,
la descarga anterior y la ausencia/incoherencia de evidencia. Esta entrega
resuelve la expectativa de D12 en B01; sus garantías de contrato/I/O permanecen
pendientes con esos dueños. No se aprueba un mecanismo de confianza solo porque
el JSON declare evidencia disponible ni se cambia producto (sin M02).

### R21 — Racha derivada de fechas

Entrada: conjunto de fechas que ya cumplen R14/R15 para una cuenta. Llegadas
3,1,2 producen conjuntos {3}, {1,3}, {1,2,3}; a fecha 3, racha actual/mejor:
1/1, 1/1, 3/3. No se incrementa ciegamente un contador por llegada. Duplicados
no agregan fecha. Actual: tramo contiguo que acaba hoy o ayer; si el último día
fue anterior a ayer, cero. Mejor: máximo tramo histórico contiguo. La referencia
hoy usa la zona vigente del perfil; las fechas ya atribuidas quedan iguales.
Esto no autoriza procesar una dependencia antes de su padre: B09 reconstruye
DAG/planes y solo decisiones aplicadas elegibles aportan fechas. Prácticas,
inválidos, parciales y cancelaciones no fabrican racha.

[Fixtures R20](../src/domain/fixtures/R20.json), [R21](../src/domain/fixtures/R21.json) e
[informe](evidencia/B01.09.md): 60 variantes, 352 acumuladas. Solo especificación;
dominio B03, atribución B08/B09 y ciclo real C03/C06/C09/C10 P11 no ejecutados.
B01.09 completado documentalmente; B01.10 auditará las 22 familias antes de G01.

## B01.10 — Cierre de especificación y trazabilidad

Auditoría `B01.10-v1`: R01–R22, **352 variantes**, expectativas independientes
y seis combinaciones new/review × bad/mid/good. Cada ID enlaza archivo/posición,
fuentes, hash de expectativa y capas futuras en el
[inventario completo](../../../Zephyriov/docs/blueprint/evidencia/B01.10-inventario.json). No se cambia ninguna
regla funcional ni fixture en esta auditoría. Se actualizan cabeceras vigentes
para no presentar conteos históricos como el estado actual.

**G01 satisfecha exclusivamente para especificación.** Nueve verificadores
originales reejecutados con sus fixtures intactos en vistas documentales
acotadas; scripts/manifiestos anteriores no se reescriben. R18 sigue requiriendo
cierre real y almacenamiento; R22 idempotencia/transacciones; R19–R21 atribución,
contratos y clientes. D12 tiene expectativa/evidencia mínima explícita en R21;
B02.05 debe concretar su referencia verificable, B09.03 persistirla/probarla.
D01–D04 de navegación/protocolo son deuda ya registrada; se usan rutas correctas
y §13/§14. D14/D15 pertenecen a sus incrementos futuros. Sin divergencia M02.

La transferencia T01 conservó los hashes de los 22 JSON y fijó esta ubicación
como fuente normativa activa. M01 local cuenta con ruta API explícita;
remotos/owner/distribución se resuelven cuando correspondan.
[Informe y límites](evidencia/B01.10.md), [manifiesto](evidencia/B01.10.sha256).
