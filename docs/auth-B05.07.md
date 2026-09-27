# B05.07 — Google en los consumidores de ensayo

## Ficha y límites

API e infraestructura permanecen en esta raíz; las páginas y el APK de
`tools/` son consumidores mínimos permitidos por backend §B05. B05.07 exige
Google real en web/Android, identidad acreditada, perfil único y callbacks
negativos. B05.08 es el segundo punto autorizado y sólo comienza después
de cerrar esta aceptación. No se avanza a B05.09 ni a clientes de producto.

Entrada: B02/B03/B04 y B05.01–B05.06 documentados, Better Auth/Expo 1.7.5;
credenciales en `.env` confirmadas por el desarrollador. Android se reconectó
y autorizó durante la sesión del 2026-09-27. Archivos permitidos: `src/auth/`,
`tests/auth/`, consumidores `tools/auth-web/` y `tools/auth-expo/`, y documentación
de cierre. No se requieren nuevas dependencias ni migraciones.

## Configuración del proveedor

La fábrica recibe `google: { clientId, clientSecret }` sólo desde backend.
Utiliza el proveedor Google oficial, authorization code y PKCE S256, con
`openid email profile`, acceso online y sin acumular permisos concedidos.
La frontera HTTP rechaza scopes/parámetros adicionales y acceso por ID token
enviado por el cliente. El callback efectivo es
`http://localhost:3402/api/auth/callback/google`; el retorno móvil sigue siendo
`zephyriov-auth-probe://verified`. Son direcciones distintas.

`requireEmailVerification:true` impide emitir sesión para una cuenta pendiente
de verificación. El acceso a negocio sigue pasando por `requireVerifiedSession`.
B05.07 mantuvo la vinculación deshabilitada; B05.08 añadió después la
política explícita, cuyo bloqueo actual se documenta en [su diseño](auth-B05.08.md). El logger interno de Auth
se deshabilita para evitar que errores del intercambio impriman respuestas
con tokens. La observabilidad de operación queda para su fase correspondiente.

## Reproducción del ensayo real

1. Construir API con `node contracts/generate.mjs` y
   `node node_modules/typescript/bin/tsc -p tsconfig.json`.
2. Desde la raíz ejecutar `node tools/auth-expo/run.mjs --google`.
   Este modo carga `.env` únicamente en el proceso servidor. Sin `--google`,
   el ensayo email anterior no carga credenciales externas.
3. Abrir `http://localhost:3402/probe/google` y completar el login Google con
   la cuenta de prueba. La página no guarda sesión en storage del navegador;
   consulta la cookie HttpOnly y muestra sólo estado y una huella del perfil.
4. Construir/instalar el APK con el SDK aislado según [B05.06](auth-B05.06.md),
   configurar `adb reverse tcp:3402 tcp:3402` y pulsar «Google sign in».
   Usar la misma cuenta. El plugin Expo oficial abre el navegador del sistema,
   procesa el retorno y conserva la cookie en SecureStore. «Check session»
   consulta el servidor y muestra la misma huella del perfil.
5. Ejecutar `node tests/auth/google-live.mjs`. La evidencia de loopback sólo
   contiene booleans y conteos; exige que ambos consumidores hayan consultado
   una sesión Google verificada del mismo usuario, un perfil y una cuenta.
6. Comprobar persistencia tras reiniciar el APK, cancelación y logout; retirar
   APK y reverse al concluir. SIGTERM al servidor elimina su SQLite temporal.

Los endpoints `/probe/*` nunca se despliegan. SQLite y secreto Auth son
temporales, no se conecta Turso. El modo Google usa una cuenta real de ensayo;
el correo sigue capturado en memoria. HTTP loopback no acredita HTTPS.

## Pruebas y alcance de la evidencia

`tests/auth/google.test.ts` prueba inicio oficial, permisos, PKCE, retorno
exacto, ausencia de secreto en la URL de autorización, rechazo de parámetros
fuera de alcance, state alterado/cookie ausente, cancelación y reutilización.
Los casos de identidad controlan únicamente la frontera del proveedor para
ensayar HTTP/DB con `emailVerified` verdadero/falso. **No prueban Google real**;
la aceptación en navegador/dispositivo y `google-live.mjs` es independiente.
Estado y resultados ejecutados se registran en el informe diario al cierre.

## Referencias

Better Auth. (s. f.). *Expo integration*. Recuperado el 27 de septiembre de
2026, de https://better-auth.com/docs/integrations/expo

Better Auth. (s. f.). *User & accounts*. Recuperado el 27 de septiembre de
2026, de https://better-auth.com/docs/concepts/users-accounts

Se contrastaron además los paquetes instalados 1.7.5: proveedor Google,
callback, state, link-account y plugin Expo (servidor/cliente). La ejecución
real usa esos paquetes fijados por el lockfile.
