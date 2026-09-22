const api = 'http://localhost:3400/api/auth';
const returnURL = 'http://localhost:3401/';
const get = (id) => document.getElementById(id);
const query = new URLSearchParams(location.search);
let resetToken = query.get('token');
get('reset').disabled = !resetToken;
get('return-error').textContent = query.has('error') ? `Retorno rechazado: ${query.get('error')}` : '';
// Keep the reset token only in this document's memory; never in storage or rendered output.
history.replaceState(null, '', '/');

async function authRequest(path, body) {
  const response = await fetch(`${api}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'include',
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
  get('status').dataset.http = String(response.status);
  const data = await response.json();
  if (!response.ok) throw new Error(data.code ?? `HTTP ${response.status}`);
  return data;
}

async function showSession() {
  const data = await authRequest('/get-session');
  const identity = get('identity');
  identity.textContent = data ? `${data.user.email} — ${data.user.emailVerified ? 'Verificado' : 'Pendiente de verificación'}` : 'Sin sesión';
  identity.dataset.verified = data ? String(data.user.emailVerified) : '';
  identity.dataset.email = data?.user.email ?? '';
}

async function action(callback) {
  get('status').dataset.busy = 'true';
  for (const button of document.querySelectorAll('button')) button.disabled = true;
  try {
    await callback();
    get('status').textContent = 'Operación completada';
  } catch (error) {
    get('status').textContent = `Error: ${error.message}`;
  } finally {
    get('password').value = '';
    get('new-password').value = '';
    for (const button of document.querySelectorAll('button')) button.disabled = false;
    get('reset').disabled = !resetToken;
    get('status').dataset.busy = 'false';
  }
}
const bind = (id, callback) => get(id).addEventListener('click', () => action(callback));
const email = () => get('email').value;
const password = () => get('password').value;
bind('signup', () => authRequest('/sign-up/email', { name: get('name').value, email: email(), password: password(), callbackURL: returnURL }));
bind('login', () => authRequest('/sign-in/email', { email: email(), password: password() }));
bind('resend', () => authRequest('/send-verification-email', { email: email(), callbackURL: returnURL }));
bind('recovery', () => authRequest('/request-password-reset', { email: email(), redirectTo: returnURL }));
bind('reset', async () => {
  await authRequest('/reset-password', { token: resetToken, newPassword: get('new-password').value });
  resetToken = null;
});
bind('session', showSession);
bind('mail', async () => {
  const response = await fetch('/__mail', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const messages = await response.json();
  get('mailbox').replaceChildren();
  for (const message of messages) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = message.url;
    link.dataset.kind = message.kind;
    link.textContent = `${message.kind === 'reset' ? 'Recuperación' : 'Verificación'}: ${message.email}`;
    item.append(link);
    get('mailbox').append(item);
  }
});
await action(showSession);
