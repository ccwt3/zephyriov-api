# B03.10 — consumidor mínimo del dominio en Android

## Alcance y fuentes

El punto B03.10 de `Zephyriov/docs/blueprint/plan-trabajo-agentico.md` pide
un consumidor de ensayo en el runtime Android dentro de herramientas API,
independiente de C02. Se contrastó con `plan-accionable-backend.md` B03,
el SRS activo y `docs/next-job`. La comparación normalizada de los 352
fixtures y los casos especiales corresponde a B03.11, no a este ensayo.

## Construcción

`tools/android-consumer/build.mjs` empaqueta la API local con `pnpm pack`,
extrae `dist/domain` del tarball y lo agrupa con Vite 8.3.0 en una sola
secuencia JavaScript para WebView. Vite se fijó como dependencia de desarrollo
porque el ensayo necesita convertir los módulos ESM y `chess.js` a un recurso
que Android pueda ejecutar sin red. El archivo empaquetado contiene las
funciones compiladas; la resolución local de `chess.js` usa el `node_modules`
del repositorio como simulación de una instalación del paquete. El export
público e inmutable del dominio sigue reservado a B03.12.

El APK se construye con Android SDK platform 34/build-tools 36 y Java 21,
sin Gradle ni repositorio cliente. Usa `WebView` con un solo asset local,
sin permiso de red, sin almacenamiento de datos de usuario y sin copia de
seguridad. La clave de firma de ensayo se genera en `/tmp` para cada build;
no es una firma de distribución. La app emite solo un JSON de resultado con
la etiqueta `ZephyriovDomainProbe`. El código fuente del ensayo permanece
en API; no hay módulo Android de producto.

Para repetir el build local, ejecutar `pnpm build` y después
`ANDROID_SDK_ROOT=<ruta-del-SDK> node tools/android-consumer/build.mjs`.
El último comando imprime la ruta del APK y los hashes del bundle. El
dispositivo no se modifica durante el build.

El smoke test ejercita fecha bisiesta, zona IANA, intervalo decimal,
legalidad/SAN con `chess.js`, nota, transición, plan y proyección local.
No acredita aún paridad de todos los fixtures, persistencia, HTTP, offline,
ni ejecución dentro del futuro cliente. Esas pruebas pertenecen a B03.11
y a las puertas posteriores.

## Seguridad del dispositivo y repetición

Antes de instalar se comprueba que `dev.zephyriov.domainprobe` no exista.
Después de leer el resultado se desinstala solo ese paquete y se verifica
que ya no figura instalado. No se limpiaron logs del sistema, cambiaron
ajustes ni leyeron datos de otras aplicaciones. Los comandos y el resultado
están en el [informe diario](evidencia/B03.10.md).
