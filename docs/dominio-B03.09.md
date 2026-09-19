# B03.09 — proyección local de eventos completos pendientes

## Fuentes y entrada

Se contrastaron `docs/reglas-srs.md` R18/R22 y los JSON activos R18/R22 con
`Zephyriov/docs/blueprint/plan-trabajo-agentico.md` §5 B03.09 y §13,
`plan-accionable-backend.md` B03 y el contrato B02 de eventos. No hay
contradicción: R18 exige conservar completos; R22 distingue reenvío técnico
del nuevo ejercicio dependiente. B03.09 solo cubre la parte calculable sin
almacenamiento, consulta remota ni clasificación HTTP.

`projectPendingEvents` recibe tarjetas y actividad confirmadas, eventos
completos en orden causal, y decisiones de dependencias externas ya
clasificadas. Cada evento declara su resultado local (`applied`, `practice`,
`invalid` o `unresolved`) y, si aplica, nota verificada y datos pedagógicos.
La función no valida intentos crudos ni decide si un evento debe aplicarse en
el servidor. Las decisiones de autoridad siguen en B06/B09.

## Resultado

La función copia tarjetas, actividad y eventos; aplica `applyGrade` y
`deriveActivity` solamente a eventos `applied` con todos sus padres aplicados.
Conserva los completos omitidos o no resueltos en `retainedEvents`, con sus
campos adicionales de payload y recibo. La salida lleva `confirmed:false`.
Un mismo input repetido produce el mismo resultado; un nuevo ejercicio usa
otro ID, depende de su padre y puede cambiar la tarjeta una vez. Rechaza IDs
duplicados, padres ausentes o no aplicados, dos avances de la misma línea sin
arista causal, ítems que no coinciden y reintentos incoherentes. La función
no crea IDs de transporte, recibos o decisiones autoritativas.

El caller debe mantener congelado el payload completo y guardar base y cola
atómicamente cuando corresponda; esta copia en memoria no es durabilidad. La
entrada de una sesión solo proyecta su actividad; reconciliación entre
dispositivos, cambios de versión/generación, autorización, expiración,
ordenamiento de lotes y rechazo de conflictos pertenecen a B06/B08/B09.
R18 se ensaya aquí únicamente como conservación de los dos registros completos;
suspensión, cierre, fallo de commit y aislamiento real de cuenta esperan los
clientes y su almacenamiento.

[Informe diario](evidencia/B03.09.md).
