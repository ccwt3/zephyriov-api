# Dominio B03.05–B03.06: nota y transición SRS

## B03.05 — Calificación del bloque

`gradeBlock` recibe un bloque completo y los intentos producidos por
`verifyAttempts`. Exige un intento legal por ply propio, en orden y con tiempo
entero no negativo. La corrección debe proceder del verificador SAN interno;
el DTO o el cliente no son una fuente de `correct` ni de `grade`.

Una correcta tarda demasiado solo si supera 120000 ms. Una incorrecta legal
cuenta como error, aun si tardó más, pero no como correcta lenta. En el primer
bloque (profundidad efectiva menor o igual al tamaño del snapshot), cualquier
error da `bad`. En un bloque ampliado, uno da `mid` y dos o más dan `bad`.
Sin errores, una correcta lenta da `mid`; el resto da `good`. El resultado
incluye conteos y plies para auditarlo. Las interacciones ilegales rechazadas
por la UI no entran al reporte ni se califican.

## B03.06 — Transición de la tarjeta

`applyGrade` recibe una nota calculada por el dominio, tarjeta, máximo de
jugadas propias de una línea validada, tamaño del bloque pedagógico, día civil
capturado al iniciar el bloque, origen del ítem y número de intento. Devuelve
una tarjeta nueva sin mutar el snapshot, `nextDue`, estado `graded` e indicación
de reintento. La cola y los IDs físicos de los ítems los administra el futuro
constructor/transacción; la indicación conserva origen, línea y sesión y pide
insertar el intento siguiente al final.

En `new`, `bad/mid` conservan tarjeta y reencolan; `good` pasa a `review`,
intervalo `1.00`, vencimiento D+1, profundidad limitada al máximo propio y
`reps+1`. En `review`, `good` amplía profundidad y usa el cálculo decimal
B03.03; `mid` conserva intervalo y profundidad, programa D+1 y suma una rep;
`bad` pasa a `new`, reinicia intervalo, suma un lapse, conserva profundidad,
reps y vencimiento almacenado y reencola con `nextDue:null`. Las transiciones
posteriores de un reintento se rigen por el estado actual de la tarjeta,
mientras su `originType` permanece fijo.

La función rechaza profundidades fuera del máximo validado y contadores que
desbordarían enteros seguros. No verifica SAN ni autoriza la nota que recibe:
esas condiciones corresponden a la composición con B03.04–B03.05 y a la
frontera HTTP futura. Tampoco persiste el resultado ni acredita transacciones,
actividad, generación de planes o compatibilidad Android.

Se contrastaron las 40 variantes B01 R01–R04, 60 transiciones R05–R10 y
16 variantes de profundidad R11 sin modificar las expectativas originales.
