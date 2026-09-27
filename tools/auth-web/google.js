const status = document.getElementById('status');
const identity = document.getElementById('identity');
const callbackURL = `${location.origin}/probe/google`;
const returnedError = new URL(location.href).searchParams.has('error');
history.replaceState(null, '', '/probe/google');
async function request(path, body) {
  const response = await fetch(path, { credentials: 'include',
    ...(body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
async function session() {
  const result = await request('/probe/google-proof?consumer=web');
  identity.textContent = result.verified ? `Identidad verificada · Perfil: ${result.profile}` : 'Sin sesión verificada';
  identity.dataset.verified = String(result.verified);
}
async function action(work) {
  for (const button of document.querySelectorAll('button')) button.disabled = true;
  try { await work(); status.textContent = 'Comprobación completada'; }
  catch { status.textContent = 'No se pudo completar. Comprueba la sesión o reintenta el acceso.'; }
  finally { for (const button of document.querySelectorAll('button')) button.disabled = false; }
}
document.getElementById('google').onclick = () => action(async () => {
  const result = await request('/api/auth/sign-in/social', { provider: 'google', callbackURL, errorCallbackURL: callbackURL, disableRedirect: true });
  location.assign(result.url);
});
document.getElementById('session').onclick = () => action(session);
document.getElementById('logout').onclick = () => action(async () => { await request('/api/auth/sign-out', {}); await session(); });
await action(session);
if (returnedError) status.textContent = 'Google cancelado o retorno rechazado. Puedes volver a intentarlo.';
