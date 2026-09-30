# M07 — Correo transaccional Resend para B05.11

Estado: **resuelto** el 2026-09-30 al cerrar B05.11. Dominio verificado,
cuatro mensajes reales entregados en bandeja (A: verificación y reset; B: dos
verificaciones), SPF y DKIM `pass` confirmados por el desarrollador, enlace de
reset consumido una vez. [Informe](evidencia/B05.11-B05.12.md).

## Configuración acreditada

| Dato | Valor |
| --- | --- |
| Proveedor | Resend, plan Free; el usuario **no autoriza cargos** |
| Dominio de envío | `mail.zephyriov.reicot.dev` (zona Cloudflare `reicot.dev`) |
| Región | `us-east-1` |
| Remitente (`AUTH_EMAIL_FROM`) | `Zephyriov <no-reply@mail.zephyriov.reicot.dev>` |
| Envío / recepción | Envío activado; recepción desactivada |
| API key | `RESEND_API_KEY` sólo en `.env` backend, permiso de envío |

Registros DNS creados por el usuario y marcados *Verified* por Resend; los
dos CNAME en modo DNS only. El DKIM y `send.mail.zephyriov` se comprobaron
además por DNS público (DoH de Cloudflare) el 2026-09-30:

| Tipo | Nombre | Destino |
| --- | --- | --- |
| TXT | `resend._domainkey.mail.zephyriov` | clave pública DKIM de Resend |
| CNAME | `send.mail.zephyriov` | `send.forge.rmta.net` (SPF/MX vía destino) |
| CNAME | `rsend.mail.zephyriov` | `rsend.forge.rmta.net` |

Resend genera CNAME para SPF en dominios creados desde agosto de 2026, en
lugar del par MX+TXT anterior. No hay DMARC en `reicot.dev` ni en el
subdominio: es opcional para verificar. Si en B05.11 los correos caen en
spam, crear TXT `_dmarc.mail.zephyriov` = `v=DMARC1; p=none;` sin tocar la raíz.
No se creó subdominio de tracking: click/open tracking deben seguir apagados
para no reescribir los enlaces de verificación y reset.

## Cuota del plan Free (fuentes oficiales, consultadas el 2026-09-30)

- 100 correos/día y 3,000/mes; al agotarse, error `daily_quota_exceeded`
  sin cargo por excedente. El día se reinicia a medianoche UTC.
- 10 peticiones/s por equipo; al excederlo, 429 con `retry-after`.

Aplicado en B05.11: `emailGlobal` bajó a 80/día (ventana alineada a
medianoche UTC); 80 × 31 = 2,480 < 3,000/mes. El rendimiento admitido
(≤ 0.5 envíos/s) queda lejos de 10 req/s. Un cambio de plan exige revisarlo.

## Buzones de ensayo

- `social@reicot.dev` (A) y `contacto@reicot.dev` (B), recibidos mediante
  Cloudflare Email Routing (MX `route*.mx.cloudflare.net`).
- Sin DMARC: los mensajes llegaron a bandeja; si en el futuro caen en spam,
  aplicar el TXT `_dmarc.mail.zephyriov` descrito arriba.

Fuentes: [Resend — Pricing](https://resend.com/pricing),
[Resend — Rate limit](https://resend.com/docs/api-reference/rate-limit),
[Resend — Add a domain](https://resend.com/docs/add-a-domain).
