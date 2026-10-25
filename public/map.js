const token = sessionStorage.getItem('bw_token');
const user = JSON.parse(sessionStorage.getItem('bw_user') || 'null');
const statusMessage = document.querySelector('#mapStatus');
const displayName = user?.name?.trim() || 'Staff member';
document.querySelector('#staffName').textContent = displayName;
document.querySelector('#staffRole').textContent = user?.role || 'Authenticated staff';
document.querySelector('#staffOffice').textContent = user?.office || 'KERRA STAFF PORTAL';
document.querySelector('#staffAvatar').textContent = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
document.querySelector('#enrollmentLink').hidden = user?.role !== 'admin';
document.querySelector('#managementLink').hidden = user?.role !== 'admin';
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
    if (boundariesResult.status === 'fulfilled') {
      const counties = L.geoJSON(boundariesResult.value, {
        style: { color: '#52786a', weight: 1.25, fillColor: '#c4ddcb', fillOpacity: 0.12 },
        onEachFeature: (feature, layer) => {
          const county = feature.properties?.COUNTY;
          if (county) layer.bindTooltip(escapeHtml(county));
        }
      }).addTo(map);
      const bounds = counties.getBounds();
      if (bounds.isValid()) {
        const viewBounds = bounds.pad(0.04);
        map.fitBounds(viewBounds, { padding: [12, 12], maxZoom: 7 });
        map.setMaxBounds(viewBounds.pad(0.35));
      }
    }

    if (reportsResult.status === 'fulfilled') {
      document.querySelector('#reportCount').textContent = reportsResult.value.length;
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

    const messages = [];
    if (reportsResult.status === 'rejected') messages.push(reportsResult.reason.message);
    if (boundariesResult.status === 'rejected') messages.push(boundariesResult.reason.message);
    statusMessage.textContent = messages.join(' ');
    map.invalidateSize();
  });
}
