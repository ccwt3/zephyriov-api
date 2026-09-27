# B05.08 — vinculación explícita y reciente

## Ficha

Entrada: B05.07 probado con Google real en web/Android; Better Auth 1.7.5.
Resultado: vincular el proveedor a un perfil existente mediante sesión
autenticada reciente, sin fusionar cuentas por email no verificado. Repositorio
API; `src/auth/`, `tests/auth/` y documentos de cierre. No adelantar B05.09.

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

## Contradicción de persistencia y autorización pendiente

Una prueba adicional fuerza dos lecturas reales sin cuenta existente antes
de permitir dos escrituras concurrentes del mismo sujeto Google. Resultado:
**dos cuentas, donde debe existir una**. Las otras trece pruebas pasan.

Better Auth consulta antes de crear; `account` no tiene una restricción única
para `(provider_id, account_id)`. El adaptador rechaza después identidades
duplicadas, por lo que el problema también impide accesos posteriores.

La solución propuesta es una migración nueva con un índice UNIQUE para esa
pareja, reflejado en el esquema Drizzle y el cargador de migraciones. No se
reescribe SQL ya aplicado ni se eliminan duplicados automáticamente. Si una
base ya contiene duplicados, la migración debe fallar sin modificar sus datos.

`docs/next-job` excluía migraciones salvo contradicción resuelta con el usuario.
Se detuvo la implementación y se solicitó autorización específica para esta
ampliación de B05.08. **No se ha implementado la migración ni se cierra el punto.**

## Referencias

Better Auth. (s. f.). *User & accounts*. Recuperado el 27 de septiembre de
2026, de https://better-auth.com/docs/concepts/users-accounts

Contraste con Better Auth 1.7.5 instalado: `api/routes/account.mjs`,
`api/routes/callback.mjs`, `api/state/oauth.mjs`, `db/internal-adapter.mjs`
y tipos `BetterAuthOptions.user.validateUserInfo`.
