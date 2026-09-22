# B05.04–B05.05 — frontera HTTP y consumidor web local

## Fichas de ejecución

| Punto | Resultado observable | Pruebas de aceptación |
| --- | --- | --- |
| B05.04 | Cookie host API, CORS exacto, origen/CSRF y retornos registrados | HTTPS Secure/HttpOnly/Lax sin Domain; credenciales; preflight; orígenes ajenos/nulos/ausentes; retornos manipulados; regresión Auth |
| B05.05 | Página mínima que consume el handler Auth real desde otro origen | Firefox: registro, sesión pendiente, reenvío/verificación, recuperación/reset, revocación y login; errores; ausencia de almacenamiento de sesión |

Repositorio propietario: API. Archivos permitidos: `src/auth/`, `tests/auth/`,
`docs/`, README, Branch_changes y, para B05.05, `tools/auth-web/` como
herramienta de ensayo. El backend §B05 sitúa explícitamente los consumidores
mínimos en API; no son UI de producto ni repositorios cliente. Entrada: HEAD
`110a644`, árbol limpio, B02/B04 y B05.01–B05.03 probados. Fuentes: plan
agéntico §3, §5 B05 y §13 y plan backend §B05 en
`/home/cacawatin/code/personal/Zephyriov/docs/blueprint/`.

Revisión: agente principal. Salida: `construido_local` y `probado` en SQLite,
Request/Response y Firefox local. No se cierra ninguna familia SRS R01–R22
ni la fase API. Google, Expo, correo real, despliegue, limitadores definitivos
y las rutas de negocio permanecen en sus puntos posteriores.

## Política HTTP

`createZephyriovAuth` exige `baseURL` como origen canónico, `webOrigins` y
`allowedReturnURLs`. Sólo admite HTTPS, excepto HTTP de loopback para ensayos.
Las listas rechazan wildcards, credenciales en URL y configuraciones no
canónicas; cada retorno absoluto debe pertenecer a un origen permitido.
La lista de retornos es exacta, incluido path/query: no autoriza todos los
paths de un origen. Un retorno relativo sólo se acepta si su concatenación
literal con el origen API está registrada. Los cuatro campos `callbackURL`,
`redirectTo`, `errorCallbackURL` y `newUserCallbackURL` se validan en JSON y
en todos los valores de query, incluidos repetidos. Los tokens de Better Auth
siguen siendo administrados por la biblioteca.

La fábrica conserva el objeto Auth y envuelve su `handler` con la frontera
HTTP. `auth.api` sigue siendo una interfaz interna del servidor. Los futuros
consumidores deben montar este handler, no crear otro Better Auth sin esta
política. Cada ruta de negocio futura sigue requiriendo `requireVerifiedSession`.

Cookies: `HttpOnly`, `SameSite=Lax`, `Path=/`, sin `Domain` ni compartición
entre subdominios; `Secure` en HTTPS. HTTP local usa cookies sin `Secure`;
no es configuración de despliegue. API/web de producción deben pertenecer
al mismo sitio para este uso de Lax. Los puertos no aíslan cookies: el ensayo
localhost valida CORS entre orígenes, no aislamiento entre hosts distintos.
La matriz HTTPS usa `api.example.test` y `web.example.test` sin red ni DNS.

Todo POST exige un Origin exacto y JSON. Un Origin ausente, `null`, con path,
puerto distinto o dominio ajeno se rechaza antes de efectos/correo. Las
navegaciones GET con enlaces de verificación/reset pueden omitir Origin;
sus retornos y tokens sí se validan. No se relajan controles de Better Auth:
`disableOriginCheck:false` y `disableCSRFCheck:false` también bajo Vitest.
Una prueba de navegación cross-site comprueba el rechazo de la biblioteca.
Esta frontera es para el consumidor web actual; B05.06 deberá integrar el
transporte móvil oficial sin desactivar controles globalmente.

Preflight: GET/POST y Content-Type, credenciales habilitadas sólo para un
origen de la lista exacta; nunca `*`. Respuestas permitidas, incluidos errores,
incluyen el origen aprobado y `Vary: Origin`; preflight añade variación por
método/headers. Los rechazos de origen no incluyen permisos CORS. La frontera
fija `Cache-Control: no-store` y `Referrer-Policy: no-referrer`. Los errores
propios usan 403 `AUTH_HTTP_FORBIDDEN`, 415 `UNSUPPORTED_MEDIA_TYPE` y
400 `INVALID_JSON`, sin devolver el retorno rechazado ni tokens. B05.12
completará el inventario contractual de rutas Auth.

## Consumidor B05.05

`tools/auth-web/run.mjs` abre exclusivamente loopback:

- API `http://localhost:3400`, base Auth `/api/auth`.
- Página `http://localhost:3401/`, único retorno registrado.
- Correo de ensayo `http://localhost:3401/__mail`, sólo para fetch del mismo
  origen, con validación de Host/Origin/Fetch Metadata y sin caché.

No lee `.env` ni usa Turso/Resend/Google. Crea SQLite temporal y un secreto
aleatorio en memoria; guarda correos sólo en memoria y elimina su directorio
al recibir SIGINT/SIGTERM. Un cierre forzado del proceso puede dejar el
directorio temporal. Sólo se permiten cuentas ficticias. El buzón local no
se monta en el handler/producto; los enlaces sensibles no se escriben en logs.

La página usa `fetch` con `credentials:include`. Muestra sólo identidad y
estado de verificación, nunca token de sesión ni respuesta Auth completa.
No usa localStorage/sessionStorage/IndexedDB. Extrae el token de reset a una
variable temporal y limpia la barra de direcciones con `replaceState`; tras
recargar habrá que abrir de nuevo el enlace. Limpia contraseñas después de
cada operación y deshabilita botones mientras espera. Los mensajes/enlaces
se insertan con APIs DOM, sin `innerHTML`. CSP limita script al propio origen,
conexiones a la API local y prohíbe formularios, bases y embedding.

## Reproducción

Después del build, ejecutar en terminales separadas:

```sh
node tools/auth-web/run.mjs
mkdir -p /tmp/zephyriov-b05-firefox-profile
firefox --headless --no-remote --profile /tmp/zephyriov-b05-firefox-profile --remote-debugging-port 9224
node tests/auth/web-browser.mjs
```

El script usa WebDriver BiDi nativo y no añade dependencias. Es opt-in, fuera
de Vitest; no abre perfiles personales. Detener servidor y navegador al
terminar. En esta sesión Firefox falló con código 139 dentro del sandbox;
tras autorización del usuario se ejecutó fuera de él y aprobó en Firefox
156.0. No fue necesario Chrome. La escalación no modificó configuración del
sistema. Estos pasos no equivalen a probar TLS real, Safari/Chrome, Android,
retornos OAuth ni dominios definitivos.

Comandos de validación usados con las dependencias instaladas:

```sh
node node_modules/vitest/vitest.mjs run --reporter=dot
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node contracts/generate.mjs
node node_modules/typescript/bin/tsc -p tsconfig.json
```

Son los ejecutables de los scripts test/lint/typecheck/build del paquete.
El lanzador pnpm falló verificando su identidad contra el registro dentro del
sandbox; no se deshabilitó esa verificación ni se alteraron dependencias.
[Informe y resultados](evidencia/B05.04-B05.05.md).

## Referencias

Better Auth. (s. f.). *Cookies*. Recuperado el 22 de septiembre de 2026, de
https://better-auth.com/docs/concepts/cookies

Better Auth. (s. f.). *Security*. Recuperado el 22 de septiembre de 2026, de
https://better-auth.com/docs/reference/security

Las opciones se contrastaron además con Better Auth 1.7.5 instalado:
`dist/cookies/index.mjs`, `dist/api/middlewares/origin-check.mjs` y
`dist/integrations/node.mjs`. La lista exacta de retornos y CORS son política
de esta API, adicional a la comprobación de orígenes de la biblioteca.
