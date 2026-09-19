# Dominio B03.01–B03.02: fixtures y fechas

## Runner de fixtures B01

`src/domain/fixture-runner.ts` recibe las familias B01 ya cargadas y visita
cada variante en orden de familia. Valida regla, prefijo e ID único; devuelve
el número de casos. No lee archivos, importa servicios ni produce expectativas.
El test carga los 22 JSON activos sin modificarlos, comprueba 352 IDs únicos y
que las entradas y expectativas siguen idénticas tras el recorrido. También
revisa imports estáticos/dinámicos de las fuentes de producción bajo
`src/domain/`; las lecturas de archivos pertenecen únicamente al test.

Esta es infraestructura de ensayo. Los resultados SRS completos se probarán
en los puntos B03 posteriores con funciones de dominio independientes; los
fixtures de I/O mantienen sus puertas B06–B09.

## Tiempo civil y UTC

`src/domain/civil-time.ts` expone `civilDateAt(instant, timezone)`,
`addCivilDays(date, days)`, `currentCivilDate(timezone, clock)` e
`isWithinUtcWindow(instant, start, end)`. Los instantes aceptados usan UTC
RFC 3339 canónico con milisegundos. Las fechas civiles válidas usan calendario
gregoriano `yyyy-mm-dd`, años 0001–9999. La ventana UTC es `[start, end)`:
el instante exacto del vencimiento queda fuera. El reloj se recibe como función
y se consulta una vez por llamada; la zona conocida la elige el llamador.

La implementación usa `Date` para aritmética de días en UTC e `Intl` para
resolver la fecha de un instante en una zona IANA. No convierte un día civil
en 24 horas locales: las transiciones DST pueden durar 23 o 25 horas. Se
eligieron primitivas del runtime para evitar una dependencia nueva en estas
funciones pequeñas. La versión ensayada para producción es Node 24.21.0,
ICU 78.3 y tzdata 2026c; cambios de runtime/tzdata pueden cambiar reglas de
zonas futuras y exigen repetir los fixtures. Los casos R20/R21 comprueban
solo sus campos temporales, no sesiones, actividad, historial de zona ni
autorización. La compatibilidad Android y el paquete publicable se verifican
en B03.10–B03.12.

La zona del bloque se captura al inicio fuera de estas funciones. La
procedencia confiable de esa zona y las ventanas de paquete/evento se
comprueban en B08/B09; aquí se calcula la fecha y la pertenencia temporal
después de recibir los valores.
