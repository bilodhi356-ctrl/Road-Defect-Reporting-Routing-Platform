const loginForm = document.querySelector('#loginForm');
const forgotPasswordForm = document.querySelector('#forgotPasswordForm');
const resetPasswordForm = document.querySelector('#resetPasswordForm');
const pageTitle = document.querySelector('#pageTitle');
const pageDescription = document.querySelector('#pageDescription');
let resetToken = new URLSearchParams(window.location.hash.slice(1)).get('resetToken');

if (resetToken) {
  loginForm.hidden = true;
  document.querySelector('#forgotPasswordLink').hidden = true;
  resetPasswordForm.hidden = false;
  pageTitle.textContent = 'Choose a new password';
  pageDescription.textContent = 'Set a new password for your staff account.';
  window.history.replaceState(null, '', window.location.pathname);
}

document.querySelector('#forgotPasswordLink').addEventListener('click', () => {
  loginForm.hidden = true;
  document.querySelector('#forgotPasswordLink').hidden = true;
  forgotPasswordForm.hidden = false;
  pageTitle.textContent = 'Reset your password';
  pageDescription.textContent = 'Enter your staff email and we’ll send a reset link if the account is active.';
});

document.querySelector('#backToLogin').addEventListener('click', () => {
  forgotPasswordForm.hidden = true;
  loginForm.hidden = false;
  document.querySelector('#forgotPasswordLink').hidden = false;
  pageTitle.textContent = 'Secure staff sign in';
  pageDescription.textContent = 'Only authorised KeRRA staff can access and update reports.';
});

document.querySelector('#requestAnotherReset').addEventListener('click', () => {
  resetToken = null;
  resetPasswordForm.hidden = true;
  forgotPasswordForm.hidden = false;
  document.querySelector('#forgotPasswordMessage').textContent = '';
  pageTitle.textContent = 'Reset your password';
  pageDescription.textContent = 'Enter your staff email and we’ll send a reset link if the account is active.';
});

forgotPasswordForm.addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#forgotPasswordMessage');
  const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
  message.textContent = '';
  submitButton.disabled = true;
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: document.querySelector('#resetEmail').value })
    });
    const data = await response.json().catch(() => ({ message: 'Unexpected server response.' }));
    if (!response.ok) throw new Error(data.message || 'Unable to request a password reset.');
    message.textContent = data.message;
  } catch (error) {
    message.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

resetPasswordForm.addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#resetPasswordMessage');
  const submitButton = resetPasswordForm.querySelector('button[type="submit"]');
  const password = document.querySelector('#newPassword').value;
  const confirmation = document.querySelector('#confirmPassword').value;
  message.textContent = '';
  if (password !== confirmation) {
    message.textContent = 'The passwords do not match.';
    return;
  }
  submitButton.disabled = true;
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password })
    });
    const data = await response.json().catch(() => ({ message: 'Unexpected server response.' }));
    if (!response.ok) throw new Error(data.message || 'Unable to reset your password.');
    resetToken = null;
    resetPasswordForm.hidden = true;
    loginForm.hidden = false;
    document.querySelector('#forgotPasswordLink').hidden = false;
    pageTitle.textContent = 'Secure staff sign in';
    pageDescription.textContent = 'Only authorised KeRRA staff can access and update reports.';
    document.querySelector('#loginError').textContent = data.message;
  } catch (error) {
    message.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

loginForm.addEventListener('submit', async event => {
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
    window.location.assign('/staff');
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});
