// ── Globals ───────────────────────────────────────────────────────────────────
const socket = io(window.location.origin);
let userLat  = null;
let userLng  = null;
let userMap  = null;
let sosId    = null;

// ── Socket: watch for dispatch confirmation ───────────────────────────────────
socket.on('sos-resolved', payload => {
  if (payload.sosId === sosId) setState('dispatched');
});

// ── DOM ready ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sos-submit-btn').addEventListener('click', submitSOS);

  if (!navigator.geolocation) {
    useFallbackLocation();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      initMap();
      setState('form');
    },
    () => useFallbackLocation(),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

function useFallbackLocation() {
  userLat = 12.9716;
  userLng = 77.5946;
  initMap();
  setState('form');
  const note = document.getElementById('geo-note');
  if (note) {
    note.textContent = 'Location unavailable — using city centre. Your pin may not be accurate.';
    note.style.display = 'block';
  }
}

// ── Map ───────────────────────────────────────────────────────────────────────
function initMap() {
  if (userMap) return;
  userMap = L.map('user-map', { zoomControl: false, attributionControl: false })
    .setView([userLat, userLng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(userMap);
  L.circleMarker([userLat, userLng], {
    radius: 10,
    color: '#c0392b',
    fillColor: '#e74c3c',
    fillOpacity: 0.85,
    weight: 2,
  }).addTo(userMap).bindPopup('Your location').openPopup();
}

// ── State machine ─────────────────────────────────────────────────────────────
function setState(next) {
  document.querySelectorAll('.state').forEach(el => el.classList.remove('state--active'));
  const el = document.getElementById(`state-${next}`);
  if (el) el.classList.add('state--active');
  // Let Leaflet recalculate size when form becomes visible
  if (next === 'form') setTimeout(() => userMap && userMap.invalidateSize(), 120);
}

// ── SOS submission ────────────────────────────────────────────────────────────
function submitSOS() {
  const name     = document.getElementById('sos-name').value.trim();
  const severity = document.getElementById('sos-severity').value;
  const needs    = Array.from(document.querySelectorAll('.need-check:checked')).map(el => el.value);
  const errEl    = document.getElementById('form-error');

  if (!name || !severity || needs.length === 0) {
    errEl.textContent = 'Please fill in your name, select at least one need, and choose a severity.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  sosId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const payload = {
    id:        sosId,
    name,
    lat:       userLat,
    lng:       userLng,
    needs,
    severity,
    timestamp: new Date().toLocaleTimeString(),
  };

  const btn    = document.getElementById('sos-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  socket.emit('sos-report', payload);

  const details = document.getElementById('confirm-details');
  if (details) {
    details.innerHTML = `<b>${name}</b> &nbsp;&middot;&nbsp; ${needs.join(', ')} &nbsp;&middot;&nbsp; ${severity}`;
  }

  setTimeout(() => setState('sent'), 500);
}
