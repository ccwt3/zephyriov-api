# B05.11–B05.12 — correo real Resend, aislamiento A/B e inventario Auth

## Ficha

- **Repositorio/archivos:** API; `src/auth/` (`resend.ts` nuevo, límites y
  exportación de `exactOrigin`), `tests/auth/`, `tools/auth-mail/` (ensayo
  local), `contracts/auth-routes.md`, `package.json` (`files`), docs, README y
  Branch_changes. Sin migraciones, dependencias, SRS ni repositorios cliente.
- **Fuentes:** `docs/next-job`, plan agéntico §§3, B05, M07 y 13; backend §B05;
  Better Auth/Expo 1.7.5; documentación oficial de Resend (API de envío,
  errores, cuota Free) consultada el 2026-09-30; [M07](manual-M07.md).
- **Autorización:** el prompt del 2026-09-30 autorizó los dos puntos
  siguientes (B05.11 y B05.12), con envío real a los buzones de ensayo A/B.
- **Objetivo B05.11:** adaptador HTTPS Resend, cupos ajustados a la cuota real,
  coste de hashing medido y aceptación real N/N+1, concurrencia y reinicio.
- **Objetivo B05.12:** aislamiento A/B, recorrido de ambos consumidores
  mínimos (web y Expo/Android) e inventario Auth final en contrato.
- **Fuera de alcance:** rutas de negocio, sockets, despliegue, DMARC, dominios
  finales (C08/C10) y la repetición remota en Turso.
- **Estado de salida:** B05.11 `probado(local + Resend real)` y
  `aprobado_desarrollador` para recepción/SPF/DKIM. B05.12 **incompleto**:
  construido y probado localmente y en Firefox; recorrido Android pendiente
  de M03 (dispositivo no disponible el 2026-09-30).

## B05.11 — transporte Resend

`createResendTransport({ apiKey, from, linkOrigin, fetch?, timeoutMs? })`
devuelve `sendVerificationEmail`/`sendResetPassword` compatibles con
`AuthOptions`. Hace un único `POST https://api.resend.com/emails` con
`Authorization: Bearer`, remitente fijo, un destinatario, asunto, texto y HTML,
y una etiqueta `kind`. Sin SDK nuevo: `fetch` de Node, inyectable en pruebas.

Decisiones:

- **Sin reintentos** en el transporte. El cupo ya se consumió antes (B05.10);
  reintentar podría duplicar mensajes. Un fallo devuelve 503 y cuenta
  `email:failed:<kind>`; el usuario puede pedir reenvío dentro de su cupo.
- **Enlaces permitidos:** todo enlace debe tener exactamente el origen de la
  API (`linkOrigin`, HTTPS o loopback). Otro origen se rechaza antes de llamar
  al proveedor.
- **Errores seguros:** `ResendDeliveryError` guarda solo estado HTTP y código
  (`daily_quota_exceeded`, `validation_error`…). No encadena la causa ni copia
  el mensaje del proveedor, que puede incluir destinatarios.
- **Plantillas:** español, texto + HTML con el enlace escapado. El nombre del
  usuario no se muestra: es entrada no confiable.
- **Timeout** de 10 s con `AbortSignal.timeout` para no retener la petición Auth.
- **Configuración:** `resendConfigFromEnv` lee solo `RESEND_API_KEY` y
  `AUTH_EMAIL_FROM`. El tracking de clics/aperturas sigue apagado en el
  dominio (M07) para no reescribir enlaces de un solo uso.

## B05.11 — cupos ajustados a la cuota real

| Dato medido | Valor | Consecuencia |
| --- | --- | --- |
| Resend Free | 100/día (medianoche UTC), 3,000/mes, 10 req/s | `emailGlobal` baja de 100 a **80/día**: 80 × 31 = 2,480 < 3,000 sin contador mensual |
| Ventana diaria | Ventanas fijas desde epoch = medianoche UTC | Coincide con el reinicio del proveedor (prueba 23:59:59.5 → 00:00) |
| Rendimiento admitido | `signup` 10/min + `mail` 20/min | ≤ 0.5 envíos/s, muy por debajo de 10 req/s |
| scrypt Better Auth (N=16384, r=16, p=1) | ≈87 ms hash/verificación; 30 concurrentes ≈0.8 s (Node 24.19.0, i3-N305, pool libuv 4) | Peor caso `signup`+`login`+`password` = 50 hashes/min ≈ 4.4 s CPU/min; se mantienen los demás valores |

La medición se reproduce con `node tools/auth-mail/hash-cost.mjs [rondas]`.
Es de esta máquina; B11 debe repetirla en la instancia de despliegue.

## B05.11 — ensayo real

`tools/auth-mail/run.mjs <dir> [limits-json]` levanta la API en
`http://localhost:3403` con el transporte Resend real, SQLite y secreto HMAC
persistentes en `<dir>` (un reinicio conserva los contadores) y una página de
retorno `/probe/mail`. Esa página consume el enlace de reset con una contraseña
sintética, intenta reutilizarlo y reporta solo los códigos HTTP. La evidencia
(`/probe/mail-evidence`) entrega agregados, nunca tokens ni enlaces, y rechaza
peticiones con metadatos de navegador. **No desplegar `/probe/*`.**

`node tests/auth/resend-live.mjs <buzón-A> <buzón-B>` (tras `pnpm build`) usa
ventanas de 30 días para que un paso manual lento no cruce un reinicio, con
cupo global 5 e identidad 2. Envía exactamente cuatro mensajes reales.
Resultados en el [informe](evidencia/B05.11-B05.12.md).

## B05.12 — aislamiento A/B

`tests/auth/isolation.test.ts` complementa las pruebas de sesiones y linking:
listados de sesiones/cuentas solo del titular; `update-user` con
identificadores de B cambia solo A; email/verificación no editables;
`change-password`/`unlink-account` no alcanzan a B; el enlace de verificación
de B abierto con la cookie de A no cambia ni desbloquea la sesión de A;
`sessionLifecycle.check` rechaza referencias cruzadas. Las cuatro pasaron sin
cambiar código: no se encontró fuga. Estado, eventos, paquetes y tickets no
tienen rutas todavía; B06/B08–B10 deben repetir A/B en ellas.

## B05.12 — grupos de cupo explícitos e inventario

`authRouteGroup` sustituye el antiguo `authGroup` por un mapa explícito de las
31 rutas exportadas. Cambios de grupo: `/verify-password`, `/delete-user` y su
callback pasan a `password` (scrypt o destructivas); `/change-email` a `mail`;
`/expo-authorization-proxy`, `/get-access-token`, `/refresh-token` y
`/account-info` a `oauth`; `/update-session` y `/list-accounts` a `session`.
Una ruta desconocida sigue consumiendo `other`. Así ninguna ruta sensible queda
sin valor explícito, como pide el backend §B05.

[`contracts/auth-routes.md`](../contracts/auth-routes.md) documenta método,
path, entrada, salida y errores de las rutas usadas por C02/C09 y el grupo de
todas. `tests/auth/auth-routes.test.ts` falla si la versión instalada de
Better Auth expone una ruta distinta o si tabla y código divergen. El archivo
se incluye en `files` del paquete para que los clientes lo reciban fijado.
No se deshabilitó ninguna ruta de la biblioteca: `get-access-token`,
`refresh-token`, `account-info`, `update-session` y `verify-password` siguen
expuestas, aunque los clientes no las usan. Deshabilitarlas es una decisión
pendiente (D-B05.12a), no un requisito del punto.

## B05.12 — recorrido de consumidores

- **Web (Firefox 156.0.1 headless, WebDriver BiDi):** `tests/auth/web-browser.mjs`
  repitió registro, reenvío, verificación, cookie HttpOnly/Lax, reset,
  revocación, login inválido/válido y retornos rechazados. Ahora añade una
  cuenta B en un `userContext` aislado: cada contexto ve solo su sesión, B lista
  una sesión y su logout no afecta a A. **Pasó.**
- **Android (Expo APK de ensayo):** `tests/auth/expo-android.mjs` no se ejecutó.
  No había dispositivo conectado y el desarrollador indicó que no estaba
  disponible hoy. **Pendiente M03**; el APK de B05.07 sigue en
  `tools/auth-expo/android/app/build/outputs/apk/release/app-release.apk`.

B05.12 no se cierra hasta ejecutar el recorrido Android con este build. B05
y la puerta G04 siguen abiertos.

## Referencias

Resend. (s. f.). *Send email*. Recuperado el 30 de septiembre de 2026, de
https://resend.com/docs/api-reference/emails/send-email

Resend. (s. f.). *Errors*. Recuperado el 30 de septiembre de 2026, de
https://resend.com/docs/api-reference/errors

Resend. (s. f.). *Pricing*. Recuperado el 30 de septiembre de 2026, de
https://resend.com/pricing
