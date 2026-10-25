if (sessionStorage.getItem('bw_token')) {
  switchView('dashboard');

  const pageTabs = {
    '/staff': 'reports',
    '/reports': 'reports',
    '/enrol-staff': 'enrollment',
    '/staff-management': 'management'
  };
  const requestedTab = pageTabs[window.location.pathname]
    || new URLSearchParams(window.location.search).get('tab');

  if (['enrollment', 'management'].includes(requestedTab)
      && JSON.parse(sessionStorage.getItem('bw_user') || 'null')?.role !== 'admin') {
    window.location.replace('/overview');
  } else if (['overview', 'reports', 'enrollment', 'management'].includes(requestedTab)) {
    document.querySelector(`.side-nav[data-tab="${requestedTab}"]`)?.onclick?.();
  }

  const pagePaths = {
    reports: '/reports',
    enrollment: '/enrol-staff',
    management: '/staff-management'
  };
  document.querySelectorAll('.side-nav[data-tab], [data-tab-jump]').forEach(link => {
    link.addEventListener('click', event => {
      const tab = link.dataset.tab || link.dataset.tabJump;
      if (!pagePaths[tab]) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(pagePaths[tab]);
    }, true);
  });
} else {
  window.location.replace('/login');
}
