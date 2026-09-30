import type { AuthEmail } from './auth.js';
import { exactOrigin } from './http-security.js';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const USER_AGENT = 'zephyriov-api/0.0.1';

export interface ResendConfig {
  apiKey: string;
  /** Verified sender, e.g. `Zephyriov <no-reply@mail.zephyriov.reicot.dev>`. */
  from: string;
}

export interface ResendTransportOptions extends ResendConfig {
  /** Exact API origin; every Auth link must stay on it. */
  linkOrigin: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

/** Safe delivery failure: carries only HTTP status and the provider error code. */
export class ResendDeliveryError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(`Resend delivery failed (${status} ${code})`);
    this.name = 'ResendDeliveryError';
  }
}

type MailKind = 'verification' | 'reset';

const templates: Record<MailKind, { subject: string; intro: string; action: string }> = {
  verification: {
    subject: 'Verifica tu correo en Zephyriov',
    intro: 'Confirma que esta dirección te pertenece para activar tu cuenta de Zephyriov.',
    action: 'Verificar correo',
  },
  reset: {
    subject: 'Restablece tu contraseña de Zephyriov',
    intro: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta de Zephyriov.',
    action: 'Restablecer contraseña',
  },
};

function escapeHTML(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

/** The user-chosen display name is deliberately not rendered: it is untrusted input. */
function render(kind: MailKind, url: string) {
  const { subject, intro, action } = templates[kind];
  const expiry = 'El enlace caduca en una hora. Si no hiciste esta solicitud, ignora este mensaje.';
  const text = `${intro}\n\n${action}: ${url}\n\n${expiry}\n`;
  const link = escapeHTML(url);
  const html = `<!doctype html><html lang="es"><body><p>${intro}</p>` +
    `<p><a href="${link}">${action}</a></p><p>${link}</p><p>${expiry}</p></body></html>`;
  return { subject, text, html };
}

export function resendConfigFromEnv(env: Record<string, string | undefined>): ResendConfig {
  const apiKey = env.RESEND_API_KEY;
  const from = env.AUTH_EMAIL_FROM;
  if (!apiKey) throw new TypeError('Set RESEND_API_KEY in the backend environment');
  if (!from) throw new TypeError('Set AUTH_EMAIL_FROM in the backend environment');
  return { apiKey, from };
}

/** HTTPS transport for Auth mail. Budget admission stays in usage-limits; this never retries. */
export function createResendTransport(options: ResendTransportOptions) {
  const { apiKey, from, timeoutMs = 10_000, fetch = globalThis.fetch } = options;
  if (!/^re_\S+$/.test(apiKey)) throw new TypeError('Resend API key is missing or malformed');
  if (/[\r\n]/.test(from) || !/^(?:[^<>@]+ <[^\s<>@]+@[^\s<>@]+>|[^\s<>@]+@[^\s<>@]+)$/.test(from)) {
    throw new TypeError('AUTH_EMAIL_FROM must be an address or "Name <address>"');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new TypeError('timeoutMs must be a positive integer');
  const linkOrigin = exactOrigin(options.linkOrigin);

  async function send(kind: MailKind, message: AuthEmail) {
    let origin: string;
    try { origin = new URL(message.url).origin; } catch { origin = 'null'; }
    if (origin !== linkOrigin) throw new ResendDeliveryError(0, 'link_origin_rejected');
    let response: Response;
    try {
      response = await fetch(RESEND_EMAILS_URL, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'user-agent': USER_AGENT },
        body: JSON.stringify({ from, to: [message.user.email], ...render(kind, message.url), tags: [{ name: 'kind', value: kind }] }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      // Never chain the cause: runtime errors may echo request data.
      throw new ResendDeliveryError(0, 'network_error');
    }
    if (response.ok) return;
    const body = await response.json().catch(() => null) as { name?: unknown } | null;
    const code = typeof body?.name === 'string' && /^[a-z_]{1,64}$/.test(body.name) ? body.name : 'provider_error';
    throw new ResendDeliveryError(response.status, code);
  }

  return {
    sendVerificationEmail: (message: AuthEmail) => send('verification', message),
    sendResetPassword: (message: AuthEmail) => send('reset', message),
  };
}
