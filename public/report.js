let position = null;
let locationSource = null;
const $ = selector => document.querySelector(selector);
const kenyaCenter = [0.4, 37.9];
let locationMap = null;
let locationMarker = null;

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4500);
}

function selectLocation(latitude, longitude, source) {
  position = { latitude, longitude };
  locationSource = source;
  if (locationMap) {
    const point = [latitude, longitude];
    if (locationMarker) locationMarker.setLatLng(point);
    else locationMarker = L.marker(point, { draggable: true, keyboard: true }).addTo(locationMap);
    locationMarker.off('dragend');
    locationMarker.on('dragend', event => {
      const { lat, lng } = event.target.getLatLng();
      selectLocation(lat, lng, 'map');
    });
    if (source === 'GPS') locationMap.setView(point, 15);
  }

  if (source === 'GPS') {
    $('#locationLabel').textContent = 'GPS captured — confirm pin';
    $('#locationNote').textContent = 'GPS captured from this device. Confirm the pin marks the defect, not where you are submitting the report; click or drag the pin to correct it.';
  } else {
    $('#locationLabel').textContent = 'Map pin selected';
    $('#locationNote').textContent = 'Map pin selected. Drag the pin to adjust it if needed.';
  }
}

if (window.L) {
  locationMap = L.map('reportLocationMap', { center: kenyaCenter, zoom: 6 });
  L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    subdomains: 'abc',
    maxZoom: 17
  }).addTo(locationMap);
  locationMap.on('click', event => selectLocation(event.latlng.lat, event.latlng.lng, 'map'));
} else {
  $('#locationNote').textContent = 'The map could not be loaded. You can still use current GPS; refresh the page to place a map pin.';
}

$('#locateBtn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('Location is not supported by this browser. Select the defect on the map instead.');
    return;
  }

  $('#locationLabel').textContent = 'Finding location…';
  navigator.geolocation.getCurrentPosition(
    result => {
      selectLocation(result.coords.latitude, result.coords.longitude, 'GPS');
    },
    error => {
      const message = error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied.'
        : error.code === error.TIMEOUT
          ? 'Getting your GPS location timed out.'
          : 'Your GPS location is unavailable.';
      $('#locationLabel').textContent = locationSource === 'map'
        ? 'Map pin selected'
        : locationSource === 'GPS'
          ? 'GPS captured — confirm pin'
          : 'Use current GPS';
      $('#locationNote').textContent = `${message}${position ? ' Your previously selected pin is unchanged.' : ' Select the defect location on the map instead.'}`;
      showToast(message);
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

$('#photo').addEventListener('change', event => {
  const photo = event.target.files[0];
  $('#photoLabel').textContent = photo ? `${photo.name.slice(0, 16)} ✓` : 'Add photo';
});

$('#contactConsent').addEventListener('change', event => {
  const consentGiven = event.target.checked;
  $('#contactFields').hidden = !consentGiven;
  updateContactRequirements();
});

['#contactEmail', '#contactPhone'].forEach(selector => {
  $(selector).addEventListener('input', updateContactRequirements);
});

function updateContactRequirements() {
  const consentGiven = $('#contactConsent').checked;
  $('#contactEmail').required = consentGiven && !$('#contactPhone').value;
  $('#contactPhone').required = consentGiven && !$('#contactEmail').value;
}

$('#reportForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!position) {
    showToast('Please capture your location before sending the report.');
    return;
  }

  const form = new FormData();
  ['category', 'severity', 'description', 'roadName', 'landmark', 'contactEmail', 'contactPhone']
    .forEach(id => form.append(id, $(`#${id}`).value));
  form.append('contactConsent', $('#contactConsent').checked);
  form.append('latitude', position.latitude);
  form.append('longitude', position.longitude);
  if ($('#photo').files[0]) form.append('photo', $('#photo').files[0]);

  const submitButton = $('#reportForm button[type="submit"]');
  const originalLabel = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.textContent = 'Sending report…';
  try {
    const response = await fetch('/api/reports', { method: 'POST', body: form });
    const data = await response.json().catch(() => ({ message: 'Unexpected server response.' }));
    if (!response.ok) throw new Error(data.message || 'Unable to send report.');

    $('#reportForm').reset();
    $('#contactFields').hidden = true;
    $('#locationLabel').textContent = 'Use current GPS';
    $('#photoLabel').textContent = 'Add photo';
    $('#locationNote').textContent = `Report ${data.report.reference} was routed to ${data.report.office}. Keep this reference to track updates.`;
    position = null;
    locationSource = null;
    if (locationMarker) {
      locationMap.removeLayer(locationMarker);
      locationMarker = null;
    }
    if (locationMap) locationMap.setView(kenyaCenter, 6);
    showToast(`Report sent successfully. Reference: ${data.report.reference}`);
  } catch (error) {
    $('#locationNote').textContent = `Report could not be sent: ${error.message}`;
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalLabel;
  }
});
