# Rutas Auth efectivas — contrato B05.12

Inventario de la superficie HTTP que expone `createZephyriovAuth` con
`better-auth` y `@better-auth/expo` **1.7.5** (lockfile), Google y el plugin
Expo activos. `tests/auth/auth-routes.test.ts` compara esta tabla con las
rutas exportadas por la versión instalada y con el grupo de cupo de
`src/auth/usage-limits.ts`: una actualización de Better Auth que añada o quite
rutas rompe la prueba hasta revisar este contrato.

Todas las rutas cuelgan de `${BETTER_AUTH_URL}/api/auth`. Rutas y
cuerpos son los de Better Auth; el proyecto no reimplementa contraseñas,
tokens ni sesiones. Las rutas de negocio (`/v1/...`) están en `openapi.json`.

## Reglas comunes

- **Transporte web (C09):** `fetch` con `credentials: 'include'` desde un
  origen exacto de `WEB_ORIGIN`. La sesión viaja en la cookie
  `better-auth.session_token` (`__Secure-` en HTTPS), `HttpOnly`,
  `SameSite=Lax`, `Path=/`, sin `Domain`. El cliente nunca lee ni guarda el
  token. CORS expone solo `Retry-After`; preflight admite `GET`/`POST` y
  `Content-Type`.
- **Transporte Android (C02):** cliente oficial `@better-auth/expo` con
  `expo-origin: <ANDROID_APP_SCHEME>://`, sin `Origin` ni cabeceras
  `Sec-Fetch-*`; sesión en SecureStore gestionada por el plugin. Google y
  verificación usan el navegador del sistema y deep link exacto.
- **Mutaciones (`POST`)** exigen `Origin` permitido (o `expo-origin` nativo) y
  `Content-Type: application/json`. Sin ellos: `403 AUTH_HTTP_FORBIDDEN`.
- **Retornos** (`callbackURL`, `redirectTo`, `errorCallbackURL`,
  `newUserCallbackURL`) deben coincidir exactamente con la lista del entorno;
  si no, `403` antes de cualquier efecto.
- **Errores comunes:** cuerpo JSON `{ code, message }`.
  `429 RATE_LIMITED` con `Retry-After` (segundos, entero ≥ 1) cuando se agota
  un cupo; el cliente espera y no descarta trabajo pendiente.
  `503 SERVICE_UNAVAILABLE` si falla la base o el envío de correo (el cupo
  consumido no se devuelve). `500 AUTH_INTERNAL_ERROR` nunca incluye SQL ni
  datos del proveedor. `400 INVALID_AUTH_PATH` para rutas con `%` o `//`.
- **Negocio:** una sesión válida no basta; `requireVerifiedSession` devuelve
  `401 AUTH_REQUIRED` o `403 EMAIL_UNVERIFIED` hasta verificar el correo.

## Rutas usadas por C02/C09

| Método | Ruta | Entrada | Salida 2xx | Errores propios |
| --- | --- | --- | --- | --- |
| POST | `/sign-up/email` | `{ name, email, password (8–128), callbackURL? }` | `200 { token, user }` + cookie; envía verificación | `422 USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, `400 PASSWORD_TOO_SHORT`/validación |
| POST | `/sign-in/email` | `{ email, password, rememberMe?, callbackURL? }` | `200 { redirect: false, token, user }` + cookie | `401 INVALID_EMAIL_OR_PASSWORD` |
| POST | `/send-verification-email` | `{ email, callbackURL? }` | `200 { status: true }` (también para correo desconocido) | `400 EMAIL_ALREADY_VERIFIED` con sesión verificada |
| GET | `/verify-email` | `?token&callbackURL?` (enlace del correo) | `302` a `callbackURL`, o `200 { status: true }` sin él | `401 INVALID_TOKEN`/`TOKEN_EXPIRED` (o `?error=` en el retorno) |
| POST | `/request-password-reset` | `{ email, redirectTo? }` | `200 { status: true, message }` (no revela existencia) | — |
| GET | `/reset-password/:token` | `?callbackURL` (enlace del correo) | `302` a `callbackURL?token=…` | `302` con `?error=INVALID_TOKEN` |
| POST | `/reset-password` | `{ token, newPassword }` | `200 { status: true }`; revoca todas las sesiones | `400 INVALID_TOKEN` (usado, alterado o vencido) |
| POST | `/change-password` | `{ currentPassword, newPassword, revokeOtherSessions? }` | `200 { token, user }` (`token` nulo salvo revocación) | `400 INVALID_PASSWORD`, `401` |
| POST | `/sign-in/social` | `{ provider: 'google', callbackURL, errorCallbackURL?, newUserCallbackURL?, disableRedirect? }` | `200 { url, redirect }` (abrir `url` en navegador del sistema) | `403` retorno no permitido |
| GET | `/callback/google` | `?state&code` o `?error` (lo invoca Google) | `302` al retorno con cookie, o `?error=` | `302 ?error=please_restart_the_process`/`access_denied`/`state_mismatch`… |
| POST | `/link-social` | `{ provider: 'google', callbackURL }` con sesión verificada de < 5 min | `200 { url, redirect }` | `401 AUTH_REQUIRED`/`LINK_REAUTHENTICATION_REQUIRED`, `403 EMAIL_UNVERIFIED`, `409 ACCOUNT_ALREADY_LINKED` |
| GET | `/expo-authorization-proxy` | `?authorizationURL` (solo cliente Expo) | `302` al proveedor con cookie de estado | `400` |
| GET/POST | `/get-session` | cookie o almacenamiento Expo | `200 { session, user }` o `200 null` | — |
| POST | `/sign-out` | `{}` | `200 { success: true }`; borra cookie | — (idempotente) |
| GET | `/list-sessions` | sesión | `200 [session]` solo del titular | `401` |
| POST | `/revoke-session` | `{ token }` de una sesión propia | `200 { status: true }` (token ajeno: sin efecto) | `401` |
| POST | `/revoke-other-sessions` | `{}` | `200 { status: true }` | `401` |
| POST | `/revoke-sessions` | `{}` | `200 { status: true }` | `401` |
| GET | `/list-accounts` | sesión | `200 [{ providerId, accountId, … }]` del titular | `401` |
| POST | `/unlink-account` | `{ providerId, accountId }` (ambos obligatorios en 1.7.5) | `200 { status: true }` | `400 VALIDATION_ERROR`/`FAILED_TO_UNLINK_LAST_ACCOUNT`/`ACCOUNT_NOT_FOUND` |
| POST | `/update-user` | `{ name?, image? }` (email y verificación no son editables) | `200 { status: true }` | `400` campos no permitidos, `401` |

La verificación y el reset llegan por correo Resend desde `AUTH_EMAIL_FROM`;
los enlaces siempre apuntan a `BETTER_AUTH_URL` y caducan en una hora. Las
sesiones duran siete días y se renuevan una vez al día de uso.

## Inventario completo y cupo explícito

Cada ruta exportada tiene un grupo de `DEFAULT_USAGE_LIMITS`. «No usada»
significa que C02/C09 no deben llamarla; sigue expuesta por la biblioteca
y queda acotada por su grupo.

| Método | Ruta | Grupo | Uso |
| --- | --- | --- | --- |
| `GET` | `/api/auth/account-info` | `oauth` | No usada; consulta al proveedor |
| `GET\|POST` | `/api/auth/callback/:id` | `oauth` | Callback Google |
| `POST` | `/api/auth/change-email` | `mail` | No usada; deshabilitada (`400 CHANGE_EMAIL_DISABLED`) |
| `POST` | `/api/auth/change-password` | `password` | C02/C09 |
| `GET` | `/api/auth/delete-user/callback` | `password` | No usada; borrado deshabilitado (404) |
| `POST` | `/api/auth/delete-user` | `password` | No usada; borrado deshabilitado (404) |
| `GET` | `/api/auth/error` | `other` | Página de error de la biblioteca |
| `GET` | `/api/auth/expo-authorization-proxy` | `oauth` | Cliente Expo (C02) |
| `POST` | `/api/auth/get-access-token` | `oauth` | No usada; scopes solo de identidad |
| `GET\|POST` | `/api/auth/get-session` | `session` | C02/C09 |
| `POST` | `/api/auth/link-social` | `oauth` | C02/C09 |
| `GET` | `/api/auth/list-accounts` | `session` | C02/C09 |
| `GET` | `/api/auth/list-sessions` | `session` | C02/C09 |
| `GET` | `/api/auth/ok` | `other` | Sonda de la biblioteca; no es `/health/ready` |
| `POST` | `/api/auth/refresh-token` | `oauth` | No usada; acceso Google `online` |
| `POST` | `/api/auth/request-password-reset` | `mail` | C02/C09 |
| `POST` | `/api/auth/reset-password` | `password` | C02/C09 |
| `GET` | `/api/auth/reset-password/:token` | `password` | Enlace de correo |
| `POST` | `/api/auth/revoke-other-sessions` | `session` | C02/C09 |
| `POST` | `/api/auth/revoke-session` | `session` | C02/C09 |
| `POST` | `/api/auth/revoke-sessions` | `session` | C02/C09 |
| `POST` | `/api/auth/send-verification-email` | `mail` | C02/C09 |
| `POST` | `/api/auth/sign-in/email` | `login` | C02/C09 |
| `POST` | `/api/auth/sign-in/social` | `oauth` | C02/C09 |
| `POST` | `/api/auth/sign-out` | `session` | C02/C09 |
| `POST` | `/api/auth/sign-up/email` | `signup` | C02/C09 |
| `POST` | `/api/auth/unlink-account` | `oauth` | C02/C09 |
| `POST` | `/api/auth/update-session` | `session` | No usada |
| `POST` | `/api/auth/update-user` | `other` | C02/C09 |
| `GET` | `/api/auth/verify-email` | `verification` | Enlace de correo |
| `POST` | `/api/auth/verify-password` | `password` | No usada; ejecuta scrypt |

`/set-password` solo existe como llamada de servidor (sin ruta HTTP); su
grupo `password` queda reservado. Una ruta desconocida responde 404 y
consume el grupo `other`.

## Cupos efectivos (valores de ensayo aceptados en B05.11)

| Grupo | Límite | Ámbito |
| --- | --- | --- |
| `signup` | 10/min y 3/h | Global y por correo (HMAC) |
| `login` | 30/min y 10/min | Global y por correo (HMAC) |
| `mail` | 20/min | Global |
| `password` | 10/min | Global |
| `verification` | 30/min | Global |
| `oauth` | 30/min | Global |
| `session` | 120/min | Global |
| `other` | 60/min | Global |
| Presupuesto de correo | 80/día UTC y 5/h | Global y por correo; se consume antes de enviar |
| Negocio lectura / eventos | 60/min y 30/min | Por cuenta (`requireLimitedSession`) |

Coste medido de scrypt (N=16384, r=16, p=1) en Node 24.19.0, Intel i3-N305:
≈87 ms por hash o verificación; 30 verificaciones concurrentes ≈0.8 s con el
pool libuv por defecto. `signup`+`login`+`password` limitan el peor caso a
50 hashes/min (≈4.4 s de CPU/min). Resend Free: 100/día, 3,000/mes, 10
peticiones/s; 80/día × 31 = 2,480 < 3,000.
