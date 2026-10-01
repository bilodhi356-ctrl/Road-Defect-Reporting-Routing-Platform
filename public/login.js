document.querySelector('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const errorMessage = document.querySelector('#loginError');
  const submitButton = document.querySelector('#loginForm button[type="submit"]');
  errorMessage.textContent = '';
  submitButton.disabled = true;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.querySelector('#loginEmail').value,
        password: document.querySelector('#loginPassword').value
      })
    });
    const data = await response.json().catch(() => ({ message: 'Unexpected server response.' }));
    if (!response.ok) throw new Error(data.message || 'Unable to sign in.');

    sessionStorage.setItem('bw_token', data.token);
    sessionStorage.setItem('bw_user', JSON.stringify(data.user));
    window.location.assign('/dashboard');
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});
