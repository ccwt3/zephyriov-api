# Dominio B03.03–B03.04: intervalo y verificación de intentos

## Intervalo decimal

`calculateReviewInterval(previous, studyDate)` acepta una cadena decimal
canónica no negativa de dos posiciones y un día civil válido. Devuelve
`rawInterval` con tres posiciones, `intervalDays` con dos, el desplazamiento
entero y la fecha civil de vencimiento. El primer `review/good` con intervalo
`1.00` produce `3.00`; a partir de ahí se multiplica por `2.5`. Es la
excepción de R07 confirmada por el desarrollador el 2026-09-19, que se aclaró
también en `Zephyriov/docs/blueprint/plan-accionable-backend.md` §B03.

El cálculo convierte la cadena a centésimas `bigint` y multiplica por un
factor entero de décimas. Redondea por separado las milésimas exactas a
centésimas persistidas y a días enteros, en ambos casos con mitades hacia
arriba. Después suma días civiles con `addCivilDays`; no usa coma flotante,
horas locales ni un tope derivado de `numeric(8,2)`. Un desplazamiento que
exceda un entero seguro o el calendario 0001–9999 se rechaza. No se añadió
una dependencia decimal: `bigint` cubre la escala y el factor fijo de estas
reglas con una representación pequeña y reproducible en Node 24.

## SAN y plies

`verifyAttempts({ theorySan, color, effectiveMoves, attempts })` reproduce
desde la posición inicial cada ply teórico hasta la profundidad propia
efectiva. Exige exactamente un intento por ply del estudiante en el orden
correcto, `playedSan` legal y canónico, y `elapsedMs` entero seguro no negativo.
Compara la SAN de cada intento con la jugada teórica en esa posición y devuelve
`legal: true` y `correct` calculado. Tras un error legal deshace el intento y
avanza por la jugada teórica. Rechaza intentos ilegales, teoría inválida,
promociones distintas de dama y secuencias incompletas; no cuenta las jugadas
del rival ni interacciones ilegales que la UI ya descartó.

Se fijó `chess.js` 1.4.0, la versión presente en la referencia, para legalidad
y SAN estricto. Es una dependencia de ejecución de TypeScript puro; el dominio
no importa HTTP, base de datos, Auth ni cliente. B03.04 valida tiempos, pero
el umbral de 120000 ms y la nota se aplicarán en B03.05. Los fixtures R01–R04
son declarativos y no contienen SAN: sus 40 variantes comprueban cobertura de
plies y conteos temporales; las pruebas con SAN real cubren ambos colores,
errores legales seguidos de teoría, enroque, captura al paso, promoción y
rechazos. Esto no acredita todavía `gradeBlock`, eventos HTTP ni persistencia.

El paquete local incluye los archivos compilados en `dist/domain/`, pero aún
no publica un subpath estable de dominio. B03.10–B03.12 probarán el consumidor
Android y fijarán el artefacto compartido; ningún cliente final se desarrolló
en estos puntos.
