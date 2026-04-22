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
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      // If browser gives a bogus IP-based location (common on desktop), snap
      // to a random point inside the demo area around Atria Institute of Technology.
      if (lat >= 12.97 && lat <= 13.04 && lng >= 77.53 && lng <= 77.61) {
        userLat = lat;
        userLng = lng;
      } else {
        userLat = 12.97 + Math.random() * 0.07;
        userLng = 77.53 + Math.random() * 0.08;
        const note = document.getElementById('geo-note');
        if (note) {
          note.textContent = 'GPS placed you outside the venue area — location adjusted to the demo zone.';
          note.style.display = 'block';
        }
      }
      initMap();
      setState('form');
    },
    () => useFallbackLocation(),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

function useFallbackLocation() {
  // Atria Institute of Technology, Bangalore
  userLat = 13.0038;
  userLng = 77.5665;
  initMap();
  setState('form');
  const note = document.getElementById('geo-note');
  if (note) {
    note.textContent = 'Location unavailable — using venue centre. Your pin may not be accurate.';
    note.style.display = 'block';
  }
}

// ── Map ───────────────────────────────────────────────────────────────────────
function initMap() {
  if (userMap) return;
  userMap = L.map('user-map', { zoomControl: false, attributionControl: false })
    .setView([userLat, userLng], 16);
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
  if (next === 'form') setTimeout(() => userMap && userMap.invalidateSize(), 120);
}

// ── SOS submission ────────────────────────────────────────────────────────────
function submitSOS() {
  const name     = document.getElementById('sos-name').value.trim();
  const type     = document.getElementById('sos-type').value;
  const room     = document.getElementById('sos-room').value.trim();
  const severity = document.getElementById('sos-severity').value;
  const needs    = Array.from(document.querySelectorAll('.need-check:checked')).map(el => el.value);
  const errEl    = document.getElementById('form-error');

  if (!name || !type || !severity || needs.length === 0) {
    errEl.textContent = 'Please fill in your name, crisis type, at least one resource need, and severity.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  sosId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const payload = {
    id:        sosId,
    name,
    type,
    room:      room || null,
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
    details.innerHTML = `<b>${name}</b> &nbsp;&middot;&nbsp; ${type} &nbsp;&middot;&nbsp; ${severity}${room ? '<br>' + room : ''}`;
  }

  setTimeout(() => setState('sent'), 500);
}
