if (sessionStorage.getItem('bw_token')) {
  switchView('dashboard');
} else {
  window.location.replace('/login');
}
