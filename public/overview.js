const token = sessionStorage.getItem('bw_token');
const user = JSON.parse(sessionStorage.getItem('bw_user') || 'null');
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[character]));

if (!token) {
  window.location.replace('/login');
} else {
  const displayName = user?.name || 'Staff member';
  $('#staffName').textContent = displayName;
  $('#staffRole').textContent = user?.role || 'Authenticated staff';
  $('#staffOffice').textContent = user?.office || 'KERRA STAFF PORTAL';
  $('#staffAvatar').textContent = displayName.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  $('#welcomeHeading').textContent = `Good morning, ${displayName.split(/\s+/)[0]}.`;
  $('#enrollmentLink').hidden = user?.role !== 'admin';
  $('#managementLink').hidden = user?.role !== 'admin';

  $('#signOut').addEventListener('click', () => {
    sessionStorage.removeItem('bw_token');
    sessionStorage.removeItem('bw_user');
    window.location.replace('/login');
  });

  const map = window.L && L.map('overviewMap', {
    center: [0.4, 37.9],
    zoom: 5,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false
  });
  if (map) {
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: OpenTopoMap',
      subdomains: 'abc',
      maxZoom: 17
    }).addTo(map);
    map.on('tileerror', () => {
      $('#overviewMessage').textContent = 'Terrain map tiles could not be loaded.';
    });
  } else {
    $('#overviewMessage').textContent = 'The map could not be initialized. Open the full map to retry.';
  }

  const statusColor = report => report.severity === 'Critical'
    ? '#d64c3b'
    : report.status === 'In progress' ? '#4f83b9' : '#e58032';

  const loadSummary = async () => {
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
      throw new Error(data.message || 'Unable to load reports.');
    }

    const reports = data.reports || [];
    const resolvedThisMonth = reports.filter(report => report.status === 'Resolved').length;
    $('#newCount').textContent = reports.filter(report => report.status === 'New').length;
    $('#progressCount').textContent = reports.filter(report => report.status === 'In progress').length;
    $('#resolvedCount').textContent = resolvedThisMonth;
    $('#reportCount').textContent = reports.length;

    const attentionReports = reports.filter(report => report.status === 'New').slice(0, 4);
    $('#attentionList').innerHTML = attentionReports.length
      ? attentionReports.map(report => `
        <article class="report-row">
          <span class="report-icon">${report.category === 'Pothole' ? '◉' : '△'}</span>
          <div class="report-info">
            <strong>${escapeHtml(report.category)}</strong>
            <small>${escapeHtml(report.reference)} · ${escapeHtml(report.office)} · ${new Date(report.createdAt).toLocaleString()}</small>
          </div>
          <span class="status ${escapeHtml(report.status.replace(/\s+/g, '-'))}">${escapeHtml(report.status)}</span>
        </article>`).join('')
      : '<p>No reports are waiting for review.</p>';

    if (map) {
      reports.forEach(report => {
        if (typeof report.location?.lat !== 'number' || typeof report.location?.lng !== 'number') return;
        L.circleMarker([report.location.lat, report.location.lng], {
          radius: 6,
          color: '#fff',
          weight: 2,
          fillColor: statusColor(report),
          fillOpacity: 1
        }).addTo(map);
      });
      try {
        const boundaryResponse = await fetch('/api/reports/boundaries');
        if (!boundaryResponse.ok) throw new Error('County boundaries are currently unavailable.');
        const boundaries = await boundaryResponse.json();
        L.geoJSON(boundaries, {
          style: { color: '#0066cc', weight: 2, fillOpacity: 0.05 }
        }).addTo(map);
      } catch {
        $('#overviewMessage').textContent = 'County boundaries are currently unavailable.';
      }
    }
    map?.invalidateSize();
  };

  loadSummary().catch(error => {
    $('#attentionList').textContent = error.message;
  });
}
