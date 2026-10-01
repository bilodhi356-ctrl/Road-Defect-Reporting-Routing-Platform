const token = sessionStorage.getItem('bw_token');
const statusMessage = document.querySelector('#mapStatus');
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[character]));

document.querySelector('#signOut').addEventListener('click', () => {
  sessionStorage.removeItem('bw_token');
  sessionStorage.removeItem('bw_user');
  window.location.replace('/login');
});

if (!token) {
  window.location.replace('/login');
} else if (!window.L) {
  statusMessage.textContent = 'The map library could not be loaded. Refresh the page to try again.';
} else {
  const kenyaBounds = L.latLngBounds([[-4.8, 33.0], [5.3, 41.9]]);
  const map = L.map('reportMap', {
    center: [0.4, 37.9],
    zoom: 6,
    maxBounds: kenyaBounds,
    maxBoundsViscosity: 1,
    minZoom: 5
  }).fitBounds(kenyaBounds);
  let tileFailureReported = false;

  L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://viewfinderpanoramas.org/">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    subdomains: 'abc',
    maxZoom: 17
  }).on('tileerror', () => {
    if (tileFailureReported) return;
    tileFailureReported = true;
    statusMessage.textContent = 'Terrain tiles could not be loaded. Check your connection and refresh the page.';
  }).addTo(map);

  const loadReports = async () => {
    const response = await fetch('/api/reports', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json().catch(() => ({ message: 'Unexpected server response.' }));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem('bw_token');
        sessionStorage.removeItem('bw_user');
        window.location.replace('/login');
      }
      throw new Error(data.message || 'Unable to load road defect reports.');
    }
    return data.reports || [];
  };

  const loadBoundaries = async () => {
    const response = await fetch('/api/reports/boundaries');
    if (!response.ok) throw new Error('Verified county boundaries are unavailable.');
    return response.json();
  };

  Promise.allSettled([loadReports(), loadBoundaries()]).then(results => {
    const [reportsResult, boundariesResult] = results;
    if (reportsResult.status === 'fulfilled') {
      reportsResult.value.forEach(report => {
        if (typeof report.location?.lat !== 'number' || typeof report.location?.lng !== 'number') return;
        const color = report.severity === 'Critical'
          ? '#d64c3b'
          : report.status === 'In progress' ? '#4f83b9' : '#e58032';
        L.circleMarker([report.location.lat, report.location.lng], {
          radius: 8,
          color: '#fff',
          weight: 2,
          fillColor: color,
          fillOpacity: 1
        }).addTo(map).bindPopup(
          `<strong>${escapeHtml(report.category)}</strong><br>${escapeHtml(report.reference)}<br>${escapeHtml(report.office)}<br><em>${escapeHtml(report.status)}</em>`
        );
      });
    }

    if (boundariesResult.status === 'fulfilled') {
      L.geoJSON(boundariesResult.value, {
        style: { color: '#0066cc', weight: 2, fillOpacity: 0.05 }
      }).addTo(map);
    }

    const messages = [];
    if (reportsResult.status === 'rejected') messages.push(reportsResult.reason.message);
    if (boundariesResult.status === 'rejected') messages.push(boundariesResult.reason.message);
    statusMessage.textContent = messages.join(' ');
    map.invalidateSize();
  });
}
