# B05.08 — vinculación explícita y reciente

## Ficha

Entrada: B05.07 probado con Google real en web/Android; Better Auth 1.7.5.
Resultado: vincular el proveedor a un perfil existente mediante sesión
autenticada reciente, sin fusionar cuentas por email no verificado. Repositorio
API; `src/auth/`, `tests/auth/` y documentos de cierre. El usuario amplió
expresamente el alcance para terminar B05.08: `migrations/`, esquema/cargador
`src/persistence/` y pruebas de persistencia. No adelantar B05.09.

## Política implementada

- Linking explícito habilitado; `disableImplicitLinking:true`,
  `requireLocalEmailVerified:true`, `allowDifferentEmails:false` y lista vacía
  de proveedores que puedan saltarse la acreditación del correo.
- `/link-social` exige sesión consultada en persistencia, correo local
  verificado y creación hace menos de cinco minutos. Una renovación de la
  cookie no equivale a reautenticación: se usa `createdAt`, no `updatedAt`.
- El hook almacena únicamente el ID de la sesión inicial en
  `addOAuthServerContext`, la API oficial de estado confiable de Better Auth.
  El `additionalData` del cliente no puede sustituir ese dato ni el usuario.
- `validateUserInfo` en el callback comprueba otra vez que esa sesión exista,
  pertenezca al usuario ligado por el state, no haya vencido y siga siendo
  reciente, con correo local verificado e igual al del inicio. No depende de
  que el navegador móvil tenga la misma cookie que SecureStore.
- Better Auth exige además correo del proveedor verificado, coincidencia del
  email y propiedad exclusiva de una cuenta ya vinculada. La política de
  scopes mínimos y bloqueo de ID tokens directos se aplica también al linking.
- La validación de identidad se configura sólo cuando Google está habilitado;
  la inicialización interna de perfil del modo email anterior sigue intacta.

Cinco minutos es la ventana concreta elegida para la acción sensible B05.08;
no cambia la duración general de sesión ni las políticas de B05.09.

## Pruebas

`tests/auth/linking.test.ts` separa los tests de la lógica y usa el handler,
state y SQLite reales. Sólo controla intercambio/perfil del proveedor para
ejercer combinaciones que no se fabrican sobre cuentas Google reales.

Cubre sesión anónima/no verificada/antigua; las cuatro combinaciones de
verificación local/proveedor sin fusión implícita; vinculación explícita
idempotente, replay y login posterior sobre el perfil original; correo ajeno
o no acreditado; sesión revocada/antigua/no verificada durante el redirect;
intento de transferir un sujeto Google de otra cuenta; parámetros/scopes
extra y suplantación mediante additionalData.

## Unicidad durable y tratamiento de conflictos

La prueba concurrente reprodujo inicialmente dos cuentas para un mismo
sujeto. El usuario autorizó resolverlo, cerrando M17 local. La migración nueva
`007_account_identity.sql` añade `account_provider_subject_uidx`, UNIQUE sobre
`(provider_id, account_id)`. `migrateLocal` la incluye por defecto y Drizzle
refleja el mismo índice; las seis migraciones anteriores no se reescriben.

La actualización conserva datos válidos y es idempotente. Si hay duplicados
previos, SQLite rechaza el índice y la transacción revierte sin borrar filas
ni registrar la séptima migración. No se elige automáticamente un propietario.

Ante dos callbacks concurrentes, sólo una escritura gana. La otra devuelve
HTTP 409 `ACCOUNT_ALREADY_LINKED`, sin emitir sesión nueva ni exponer el error
SQL. Un nuevo flujo puede observar la cuenta ganadora, terminar idempotentemente
y acceder con Google al mismo perfil. Dos conexiones SQLite independientes
confirmaron también que un sujeto no puede asignarse a dos propietarios.

El router de Better Call imprime errores no reconocidos incluso con el logger
Auth deshabilitado. Por ello `onAPIError.onError` transforma sincrónicamente la
violación específica de unicidad en un APIError 409, y otros errores inesperados
en 500 `AUTH_INTERNAL_ERROR`. Los APIError existentes conservan su semántica.
Las pruebas verifican respuesta y ausencia de logs con parámetros/tokens.

## Resultado y límites

B05.08 completado: 15 pruebas de vinculación y tres de migración/unicidad;
regresión total de 256 pruebas locales aprobadas, lint, typecheck y build.
La migración del artefacto compilado también se aplicó dos veces con siete
entradas y el índice único activo. No hizo falta volver a usar el móvil:
Google real web/Android ya se acreditó en B05.07.

El ensayo remoto opt-in se actualizó a siete migraciones y un caso de dos
escritores, pero Turso respondió HTTP 401 durante la lectura inicial, antes
de escrituras. Sus cinco casos no se ejecutaron; no se afirma validación
remota de la migración 007. La aceptación de B05.08 aquí es local y conserva
esa limitación explícita. No se cambiaron credenciales ni bases remotas.

## Referencias

Better Auth. (s. f.). *User & accounts*. Recuperado el 27 de septiembre de
2026, de https://better-auth.com/docs/concepts/users-accounts

Contraste con Better Auth 1.7.5 instalado: `api/routes/account.mjs`,
`api/routes/callback.mjs`, `api/state/oauth.mjs`, `db/internal-adapter.mjs`
y tipos `BetterAuthOptions.user.validateUserInfo`.
