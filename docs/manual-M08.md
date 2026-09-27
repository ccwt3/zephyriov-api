# M08 — preparación para B05.07

Estado: `preparado_manual`; Google real todavía no integrado ni probado.
Dueño de la configuración y login: desarrollador, según plan agéntico §M08.
B05.06 ya probó el consumidor Expo con email; esta evidencia no sustituye OAuth.
El usuario indicó dejar B05.07 para otra sesión **manual/semimanual**, con
guía paso a paso. Al reanudar, acompañar cada paso desde el acceso a Google
Cloud Console hasta las variables `.env` y el login; no asumir preparación
externa completada ni solicitar el secreto por chat.

## Revalidación del 2026-09-27

Ambas variables Google están presentes y no vacías en `.env`. Se comprobó
sólo presencia, sin mostrar valores ni validar su autenticidad. Falta confirmar
con el desarrollador el cliente web, consentimiento/cuenta de prueba y callback
registrado, y coordinar el login real en ambos consumidores. M08 sigue abierto;
no se presume que falten las credenciales ni que su presencia cierre el punto.

## Datos concretos del ensayo

| Dato | Valor |
| --- | --- |
| API local propuesta para Google | `http://localhost:3402` |
| Base Auth instalada | `/api/auth` |
| Redirect OAuth a registrar en Google | `http://localhost:3402/api/auth/callback/google` |
| Tipo de cliente Google | Aplicación web (intercambio de código en backend) |
| Paquete Android confirmado | `dev.zephyriov.authprobe` |
| Scheme confirmado | `zephyriov-auth-probe` |
| Retorno a la app confirmado | `zephyriov-auth-probe://verified` |
| Certificado de prueba SHA-256 | `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` |

El callback se deriva del `baseURL` concreto y del endpoint instalado
`/callback/:id` de Better Auth 1.7.5. Es preparación local, no evidencia de
registro en Google ni de callback ya funcional. El deep link vuelve del
backend a la app; no se registra como redirect OAuth del cliente web Google.
El teléfono alcanza localhost mediante `adb reverse`, como en B05.06.

## Acción del desarrollador

1. Entrar a [Google Cloud Console](https://console.cloud.google.com/).
   Crear/elegir el proyecto Google y preparar consentimiento para ensayo,
   incluyendo la cuenta de prueba si se usa la modalidad de testing.
2. Crear el cliente OAuth de tipo Aplicación web y registrar literalmente
   el redirect de la tabla. Conservar los permisos limitados a identidad.
3. Guardar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en el `.env` local de
   esta API, que ya está ignorado por Git. No enviarlos por chat ni copiarlos
   al APK. Ambas claves estaban ausentes al comprobar nombres de variables.
4. Avisar cuando esté listo. El agente integrará el proveedor y conectará
   ambos consumidores de ensayo al mismo backend. El desarrollador realizará
   el login/consentimiento con la cuenta de Google cuando se abra el navegador.

La sesión actual no actúa en Google Cloud, no configura dominios definitivos
ni habilita EAS. Si se elige otro host/puerto, actualizar primero esta ficha y
los consumidores: una URL diferente requiere su propio registro exacto.

## Continuación autorizada y aceptación pendiente

Reanudar **B05.07**, primer punto pendiente de la sesión del 2026-09-27:
proveedor oficial, scopes mínimos, identidad acreditada/no acreditada,
un perfil por identidad en consumidores web/Expo, callbacks manipulados,
reutilizados/cancelados y ausencia de secretos en cliente/logs. La verificación
de Google será real; los tests locales aislados no la reemplazan.
B05.08 es el segundo punto autorizado el 2026-09-27 y sólo se inicia tras
completar B05.07. No cerrar B05 ni cambiar de repositorio por completar
este ensayo.

## Referencia

Better Auth. (s. f.). *Google*. Recuperado el 22 de septiembre de 2026,
de https://better-auth.com/docs/authentication/google

Contraste local: `better-auth` 1.7.5, `dist/api/routes/callback.mjs`,
`dist/api/routes/sign-in.mjs` y `dist/oauth2/utils.mjs`.
