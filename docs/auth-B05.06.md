# B05.06 — consumidor Expo de ensayo

## Ficha de ejecución

- Repositorio: API. El backend §B05 permite consumidores mínimos en `tools/`;
  las aplicaciones de producto siguen en sus propios repositorios.
- Entrada: B02, B04 y B05.01–B05.05 documentados, HEAD `53c4666` limpio.
- Resultado requerido: APK firmado de prueba con navegador del sistema,
  deep link exacto, sesión Better Auth en SecureStore y consulta al handler real.
- Archivos: `src/auth/`, `tests/auth/`, `tools/auth-expo/`, dependencias/configuración
  mínimas, `docs/`, README y Branch_changes. Sin cambios SRS o migraciones.
- Aceptación: registro y sesión pendiente; persistencia tras cerrar el proceso;
  cancelación; verificación desde navegador; retorno ajeno/duplicado; logout.
  Regresión de Auth, pruebas locales, lint, typecheck y build.
- M03: Android conectado/autorizado por el usuario; instalación y licencias
  del toolchain aislado autorizadas explícitamente durante la sesión.
- Identificadores de ensayo confirmados por el usuario: paquete
  `dev.zephyriov.authprobe`, scheme `zephyriov-auth-probe`, retorno
  `zephyriov-auth-probe://verified`. No son decisiones de firma/distribución final.
- Google real y su configuración M08 corresponden al segundo punto, B05.07;
  no se simula su aceptación con verificación email.

## Frontera HTTP

`nativeOrigins` es opcional. La fábrica añade el plugin oficial
`@better-auth/expo` 1.7.5 sólo cuando se configura un scheme privado explícito.
La frontera valida `expo-origin` antes de pasarlo como `Origin` a Better Auth;
el plugin tiene `disableOriginOverride:true` para impedir otra sustitución.
Se rechazan schemes ajenos, un Origin simultáneo y cualquier header
`Sec-Fetch-*`. El preflight web sigue sin permitir `expo-origin`; los clientes
nativos no obtienen headers CORS. Estos controles de transporte no acreditan
identidad: ésta sigue dependiendo de la sesión real.

La lista de retornos continúa comparando URL completa. Habilitar un scheme
no habilita todos sus hosts, paths o parámetros. La validación se aplica
a cuerpo JSON y a cada aparición de los campos de retorno en query.
Los controles CSRF/origin de Better Auth permanecen activos. La guardia de
correo verificado para negocio conserva su función independiente.

## Consumidor y servidor aislados

`tools/auth-expo/` tiene manifiesto y lockfile propios, con Expo 57.0.24,
React Native 0.86.3, React 19.2.3 y versiones fijadas de los módulos Expo.
Es un workspace de herramientas dentro de API, sin un cuarto repositorio.
La API raíz sólo añade el plugin de servidor Expo 1.7.5; no depende de React
Native para construir el backend.

El cliente oficial usa las APIs asíncronas de SecureStore. `disableCache:true`
evita presentar un snapshot como confirmación: las lecturas de sesión consultan
al handler. La UI muestra únicamente estado y presencia de cookie, sin tokens.
La cuenta y contraseña son sintéticas, exclusivas del ensayo local.

El registro entrega cookie al plugin oficial y el correo se captura en
memoria. Un endpoint de herramienta entrega el enlace sólo a la sesión
propietaria; rechaza Origin/Fetch Metadata del navegador y exige el header
nativo de ensayo. El navegador del sistema abre el enlace de verificación y
regresa al deep link confirmado. La app consulta de nuevo la sesión existente;
no instala cookies recibidas por deep link ni emite sesiones alternativas.
Una compuerta en memoria acepta el retorno exacto una sola vez durante una
espera activa. Cancelar o recibir enlaces ajenos/duplicados no cambia la sesión.
El ensayo email no cubre el intercambio OAuth del plugin: éste espera B05.07.

`run.mjs` sirve exclusivamente `http://localhost:3402` en loopback y valida
Host. Usa SQLite temporal, secreto aleatorio y correo en memoria; no lee `.env`.
SIGINT/SIGTERM cierran el servidor y eliminan su base temporal.
`adb reverse tcp:3402 tcp:3402` conecta el Android físico al servidor local.
El permiso cleartext es exclusivo de este APK de ensayo; no demuestra HTTPS.
No desplegar los endpoints `/probe/*` ni este servidor.

## Construcción y pruebas

El SDK aislado vive en `tools/auth-expo/.build/sdk`: plataformas/build-tools
instalados se enlazan desde Unity; NDK 27.1.12297006 y CMake 3.30.5 se instalan
allí con autorización del usuario. Gradle instaló además CMake 3.22.1 para
Expo. La caché Gradle también queda en `.build/`.
No se modifica el SDK de Unity. Directorios nativos generados, cachés y APK
están ignorados por Git y lint.

Desde `tools/auth-expo/`:

```sh
pnpm install --frozen-lockfile
CI=1 node node_modules/expo/bin/cli prebuild --platform android --no-install
CI=1 node node_modules/expo/bin/cli export --platform android --output-dir .build/bundle-check
```

Desde su directorio `android/`, con `ANDROID_HOME` apuntando al SDK aislado
y `GRADLE_USER_HOME` a `.build/gradle`:

```sh
CI=1 ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --max-workers=2
```

La plantilla firma `release` con su clave debug de ensayo, identificable con
`apksigner verify --print-certs`. No distribuir el APK como beta de producto.
La aceptación Android es opt-in: iniciar `node tools/auth-expo/run.mjs` tras
el build API y ejecutar `node tests/auth/expo-android.mjs` con `ADB` y
`AUTH_PROBE_APK` apuntando al binario y APK. El runner rechaza sobrescribir
una instalación existente del paquete de ensayo; instala, prueba y desinstala
su APK y retira el reverse que abrió. Usa UIAutomator sólo para esta app.

Los resultados ejecutados y bloqueos vigentes se registran en el
[informe diario](evidencia/B05.06.md). El APK pasó los cinco grupos del runner
en Android 11. Si aparece el selector de navegador, abrir con Chrome sólo
para el ensayo y dejar que el runner haga la cancelación prevista; cerrar
manualmente el selector interrumpe la aceptación de verificación.

## Referencias

Better Auth. (s. f.). *Expo integration*. Recuperado el 22 de septiembre de
2026, de https://better-auth.com/docs/integrations/expo

Expo. (s. f.). *Expo SDK reference*. Recuperado el 22 de septiembre de 2026,
de https://docs.expo.dev/versions/latest/

Se contrastaron además los paquetes descargados: `@better-auth/expo` 1.7.5
(`dist/client.js`, `dist/index.js`), `expo` 57.0.24
(`bundledNativeModules.json`, plantilla Android) y `react-native` 0.86.3
(`gradle/libs.versions.toml`).
