# M08 — Google en el ensayo B05.07

Estado: **probado(Google real web/Android)** el 2026-09-27, con intervención
del desarrollador. La preparación histórica del 2026-09-22 se cerró mediante
login real en ambos consumidores y comprobación del backend.

## Configuración acreditada

| Dato | Valor |
| --- | --- |
| API de ensayo | `http://localhost:3402` |
| Base Auth | `/api/auth` |
| Callback OAuth Google | `http://localhost:3402/api/auth/callback/google` |
| Cliente OAuth | Aplicación web; intercambio de código sólo en backend |
| Página/retorno web | `http://localhost:3402/probe/google` |
| Paquete Android | `dev.zephyriov.authprobe` |
| Scheme | `zephyriov-auth-probe` |
| Retorno a la app | `zephyriov-auth-probe://verified` |

El callback del proveedor y el deep link de regreso son distintos. El
callback deriva de la ruta oficial Better Auth 1.7.5; ambos recorridos reales
lo usaron. El teléfono llega al backend mediante `adb reverse` de ensayo.
Las variables `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` existen sólo en
`.env` backend y fueron confirmadas por el usuario. No se imprimieron valores;
se comprobó que el secreto no aparece en el APK ni en las fuentes consumidoras.
No copiar secretos al chat, a los clientes o a documentos versionados.

## Evidencia y preparación para repetir

El usuario completó Google primero en la página web y después en Android
con la misma cuenta. `node tests/auth/google-live.mjs` comprobó sesiones
verificadas, un usuario compartido, una cuenta Google y un perfil, además
de callbacks alterados/cancelados/reutilizados sin sesiones nuevas.

El usuario confirmó sesión, SecureStore y perfil conservados después de
force-stop/reapertura, y retorno del navegador cancelado sin perder sesión.
El aviso de instalación del APK se resolvió manualmente. Al terminar se
retiraron APK/reverse y servidor/SQLite temporales; el toolchain sigue aislado.

Para repetir, ejecutar los pasos de [B05.07](auth-B05.07.md), con el cliente
OAuth/consentimiento/cuenta de prueba configurados por el desarrollador y
credenciales sólo en backend. No asumir que el puerto esté ocupado por un
servidor anterior: el ensayo de esta sesión quedó detenido y limpiado.

## Límites y continuación

M08 queda acreditado para este entorno local; debe repetirse con orígenes,
callback y APK finales en las etapas correspondientes. HTTP loopback no
acredita TLS ni despliegue. No se cierra B05 antes de B05.12 ni se cambia
al repositorio de un cliente.

B05.08 se completó después de que el usuario autorizara expresamente la
migración de unicidad (M17 local resuelto). Su validación local no requirió
repetir el ensayo móvil. [Informe B05.08](evidencia/B05.08.md).

## Referencias

Better Auth. (s. f.). *Expo integration*. Recuperado el 27 de septiembre de
2026, de https://better-auth.com/docs/integrations/expo

Contraste: Better Auth/Expo 1.7.5 instalados. [Informe B05.07](evidencia/B05.07.md).
