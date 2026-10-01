if (sessionStorage.getItem('bw_token')) {
  switchView('dashboard');
  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  if (['overview', 'reports', 'enrollment', 'management'].includes(requestedTab)) {
    document.querySelector(`.side-nav[data-tab="${requestedTab}"]`)?.click();
  }
} else {
  window.location.replace('/login');
}
