let position = null;
const $ = selector => document.querySelector(selector);

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4500);
}

$('#locateBtn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('Location is not supported by this browser.');
    return;
  }

  $('#locationLabel').textContent = 'Finding location…';
  navigator.geolocation.getCurrentPosition(
    result => {
      position = { latitude: result.coords.latitude, longitude: result.coords.longitude };
      $('#locationLabel').textContent = 'Location captured';
      $('#locationNote').textContent = `GPS captured: ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`;
    },
    () => {
      position = { latitude: -0.3031, longitude: 36.08 };
      $('#locationLabel').textContent = 'Sample location used';
      $('#locationNote').textContent = 'Location permission unavailable — a sample location is selected for this demo.';
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
    $('#locationLabel').textContent = 'Use my location';
    $('#photoLabel').textContent = 'Add photo';
    $('#locationNote').textContent = `Report ${data.report.reference} was routed to ${data.report.office}. Keep this reference to track updates.`;
    position = null;
    showToast(`Report sent successfully. Reference: ${data.report.reference}`);
  } catch (error) {
    $('#locationNote').textContent = `Report could not be sent: ${error.message}`;
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalLabel;
  }
});
