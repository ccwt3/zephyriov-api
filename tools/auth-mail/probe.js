// Return page for B05.11 links. Keeps the reset token only in memory and never renders it.
const status = document.getElementById('status');
const query = new URLSearchParams(location.search);
const token = query.get('token');
const error = query.get('error');
history.replaceState(null, '', '/probe/mail');

async function resetOnce(newPassword) {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, newPassword }),
  });
  return response.status;
}

async function run() {
  if (error) {
    status.textContent = `Retorno con error: ${error}`;
  } else if (token) {
    // Synthetic password: the trial account is disposable and never used again.
    const password = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');
    const first = await resetOnce(password());
    const reuse = await resetOnce(password());
    await fetch('/probe/mail-proof', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reset: first === 200, reuseStatus: reuse }),
    });
    status.textContent = first === 200 && reuse >= 400
      ? 'Contraseña restablecida; la reutilización del enlace fue rechazada.'
      : `Resultado inesperado: restablecimiento HTTP ${first}, reutilización HTTP ${reuse}.`;
  } else {
    status.textContent = 'Retorno de verificación recibido. El script de ensayo comprobará la cuenta.';
  }
}
run().catch(() => { status.textContent = 'Error de red en la página de ensayo.'; });
