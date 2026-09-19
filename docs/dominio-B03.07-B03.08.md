# B03.07–B03.08 — plan diario y actividad

## Alcance y fuentes

Se implementaron dos puntos consecutivos de dominio puro. B03.07 cubre R12–R13
y B03.08 cubre R14–R16 y la derivación de racha de R21. Las fuentes son
`docs/reglas-srs.md` y los JSON activos de `src/domain/fixtures/`, contrastados
con `Zephyriov/docs/blueprint/plan-trabajo-agentico.md` §5/§13,
`plan-accionable-backend.md` B01/B03 y `plan-desarrollo-zephyriov.md` §2.3.
Las fuentes coinciden: nuevas primero, reviews vencidos después, reintentos al
final y actividad por esfuerzo aplicado. No se modificaron reglas ni fixtures.

## B03.07: selección y semilla

`buildDailyPlan` recibe fecha civil, color, candidatos de un catálogo ya
validado, preferencias, semilla textual y versión del generador. Filtra por
color, apertura activa, movimientos válidos, al menos un ply propio y
`dueDate <= studyDate` antes de mezclar. Ordena IDs por código de caracteres,
sin locale. Mezcla cada grupo nuevo y la lista de aperturas mediante
Fisher–Yates; toma una línea por apertura en rondas hasta el cupo 1–12. Añade
todos los reviews elegibles en orden de ID. La profundidad efectiva usa el
menor de la profundidad almacenada y el total de jugadas propias; el tamaño de
bloque 2–10 se valida pero no recorta esa profundidad.

Versión productiva `fnv1a-xorshift32-v1`: FNV-1a de 32 bits sobre bytes UTF-8
de la semilla (offset 2166136261, multiplicador 16777619), estado cero
reemplazado por `0x9e3779b9`, luego xorshift32 con desplazamientos 13, 17 y 5.
Cada salida sin signo se divide por `2^32` para obtener `[0,1)`. La semilla
debe venir del material estable de cuenta/día emitido por la capa que construye
o admite el plan; esta función no inventa identidad ni lee reloj o red.
Cambiar el algoritmo exige otra versión. El vector `account-A/2026-09-15`
comienza con estado FNV `0xde66b154` y enteros xorshift
`30055218, 120766180, 1294779635, 1676348266, 1380912905`; para el grupo
desigual de R13 produce `C2,A2,B1,C1,A3,A1`. `fixture-tape-v1` solo se habilita
con cinta explícita en pruebas y exige consumo exacto; no es PRNG productivo.

Cada ítem lleva clave lógica con componentes UTF-8 de longitud prefijada:
versión, semilla, fecha, color, ID de línea, generación de tarjeta, generación
de contenido y revisión de línea. El replay de la misma base produce la misma
clave; la capa de admisión asignará UUID canónico y guardará el vínculo en B08/B09.
No hay export instalable de dominio hasta B03.12.

## B03.08: actividad y racha

`deriveActivity` reduce una decisión ya clasificada sobre una copia de la
sesión. Solo un bloque completo aplicado califica un ítem `pending`. `bad`,
`mid` y `good` cuentan igual para una línea nueva distinta; reintentos
conservan `originType`, línea y padre, aunque la tarjeta ya sea `new` tras un
lapse de review. Práctica, parcial e inválido no cambian el inventario.
Cancelar cambia `pending` a `cancelled`, no a `graded`; recalcula las nuevas
exigibles y nunca crea actividad por sí solo. La fila ganada se conserva y se
deduplica por cuenta/fecha. Con nuevas exigibles se requieren tres distintas o
todas si quedan menos de tres; una sesión nacida sin nuevas exige todos sus
reviews y reintentos calificados, con al menos un ejercicio. La función no
acepta decisiones de transporte ni persiste la fila.

`deriveStreak` recibe fechas civiles ya elegibles para una cuenta y una fecha
de referencia calculada en la zona vigente. Deduplica y ordena; recomputa
racha mejor y racha actual que termina hoy o ayer. Usa días gregorianos, no
duraciones de 24 horas, por lo que soporta años bisiestos, DST y llegadas
desordenadas. La atribución de fecha/zona de un bloque sigue en B03.02 y su
verificación confiable/persistencia en B08/B09. Las garantías de transacción,
sesión canónica y sincronización permanecen en esos puntos.

[Informe diario y comandos](evidencia/B03.07-B03.08.md).
