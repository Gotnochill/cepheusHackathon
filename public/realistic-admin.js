document.addEventListener('DOMContentLoaded', () => {

  // ── Constants ──────────────────────────────────────────────────────────────
  const BANGALORE     = [12.9716, 77.5946];
  const TRUCK_INTERVAL = 600;
  const TAGS          = ['Water', 'Food', 'Medicine'];

  const DEPOTS = [
    { id: 'd1', name: 'North Depot', lat: 13.06, lng: 77.59 },
    { id: 'd2', name: 'South Depot', lat: 12.88, lng: 77.60 },
    { id: 'd3', name: 'East Depot',  lat: 12.97, lng: 77.71 },
    { id: 'd4', name: 'West Depot',  lat: 12.97, lng: 77.48 },
  ];

  // ── Map ────────────────────────────────────────────────────────────────────
  const map = L.map('map', { zoomControl: true }).setView(BANGALORE, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  L.rectangle([[12.85, 77.45], [13.10, 77.75]], {
    color: '#2c3e50', weight: 1.5, fillOpacity: 0.03, dashArray: '5,5',
  }).addTo(map);

  // ── State ──────────────────────────────────────────────────────────────────
  // dispatch.phase: 'idle' | 'depot_selected' | 'targeted'
  const dispatch = { phase: 'idle', depot: null, sosId: null, tags: [] };
  const sosMap   = {};   // sosId → { payload, marker, triLines: [] }
  const busy     = {};   // depotId → boolean
  DEPOTS.forEach(d => { busy[d.id] = false; });

  // ── Depot markers ──────────────────────────────────────────────────────────
  const dMarkers = {};

  const DEPOT_STYLE = {
    idle:     { radius: 14, color: '#7f8c8d', fillColor: '#bdc3c7', fillOpacity: 0.65, weight: 2 },
    selected: { radius: 16, color: '#007bff', fillColor: '#66b2ff', fillOpacity: 0.80, weight: 3 },
    busy:     { radius: 14, color: '#e67e22', fillColor: '#f6c176', fillOpacity: 0.70, weight: 2 },
  };

  DEPOTS.forEach(depot => {
    const m = L.circleMarker([depot.lat, depot.lng], { ...DEPOT_STYLE.idle }).addTo(map);
    m.bindTooltip(`<b>${depot.name}</b><br><small>Click to select</small>`, { direction: 'top' });
    m.on('click', () => onDepotClick(depot));
    dMarkers[depot.id] = m;
  });

  function setDepotStyle(id, state) {
    dMarkers[id].setStyle(DEPOT_STYLE[state] || DEPOT_STYLE.idle);
  }

  // ── Depot click ────────────────────────────────────────────────────────────
  function onDepotClick(depot) {
    if (busy[depot.id]) return;

    if (dispatch.depot && dispatch.depot.id !== depot.id) {
      setDepotStyle(dispatch.depot.id, 'idle');
    }

    dispatch.phase = 'depot_selected';
    dispatch.depot = depot;
    dispatch.sosId = null;
    dispatch.tags  = [];

    setDepotStyle(depot.id, 'selected');
    setInstruction(`${depot.name} selected — click a red SOS marker to target.`);
    renderTagPanel();
  }

  // ── SOS marker click ───────────────────────────────────────────────────────
  function onSosClick(sosId) {
    const entry = sosMap[sosId];
    if (!entry) return;

    // Epic 5: triangulation — always show on SOS click
    showTriangulation(entry);

    if (dispatch.phase === 'idle') {
      setInstruction('Select a grey depot first, then click an SOS marker.');
      return;
    }

    dispatch.phase = 'targeted';
    dispatch.sosId = sosId;
    // Epic 5: smart tag pre-fill from SOS request
    dispatch.tags  = entry.payload.needs.filter(n => TAGS.includes(n));

    setInstruction(`Ready — ${dispatch.depot.name} → ${entry.payload.name}.`);
    renderTagPanel();
  }

  // ── Triangulation (Epic 5) ─────────────────────────────────────────────────
  function showTriangulation(entry) {
    clearTriLines(entry);
    const pt = L.latLng(entry.payload.lat, entry.payload.lng);

    DEPOTS
      .filter(d => !busy[d.id])
      .map(d => ({ d, dist: pt.distanceTo(L.latLng(d.lat, d.lng)) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .forEach(({ d }) => {
        const line = L.polyline(
          [[entry.payload.lat, entry.payload.lng], [d.lat, d.lng]],
          { color: '#3498db', opacity: 0.3, weight: 1.5, dashArray: '4,7' }
        ).addTo(map);
        entry.triLines.push(line);
      });

    setTimeout(() => clearTriLines(entry), 3000);
  }

  function clearTriLines(entry) {
    entry.triLines.forEach(l => l.remove());
    entry.triLines = [];
  }

  // ── Tag panel — Epics 4 + 5 ───────────────────────────────────────────────
  function renderTagPanel() {
    const panel = document.getElementById('tag-panel');
    if (!panel) return;

    if (dispatch.phase === 'idle') {
      panel.innerHTML = '<p class="panel-hint">Select a depot to begin dispatch.</p>';
      return;
    }

    const tagHTML = TAGS.map(t => {
      const active = dispatch.tags.includes(t);
      // smart highlight: tag matches SOS request but not yet active
      const smart  = !active
        && dispatch.phase === 'targeted'
        && dispatch.sosId
        && sosMap[dispatch.sosId]?.payload.needs.includes(t);
      return `<button
        class="tag-btn${active ? ' tag-btn--active' : ''}${smart ? ' tag-btn--smart' : ''}"
        data-tag="${t}">${t}</button>`;
    }).join('');

    const actionHTML = dispatch.phase === 'targeted'
      ? `<button class="dispatch-btn" id="do-dispatch">Dispatch Truck &rarr;</button>`
      : `<p class="panel-hint">Now click a red SOS marker to target.</p>`;

    panel.innerHTML = `
      <div class="panel-depot">${dispatch.depot.name}</div>
      <div class="tag-group">${tagHTML}</div>
      ${actionHTML}
    `;

    panel.querySelectorAll('.tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.tag;
        dispatch.tags = dispatch.tags.includes(t)
          ? dispatch.tags.filter(x => x !== t)
          : [...dispatch.tags, t];
        renderTagPanel();
      });
    });

    document.getElementById('do-dispatch')?.addEventListener('click', doDispatch);
  }

  // ── Dispatch ───────────────────────────────────────────────────────────────
  async function doDispatch() {
    if (dispatch.phase !== 'targeted' || !dispatch.depot || !dispatch.sosId) return;

    const depot = dispatch.depot;
    const sosId = dispatch.sosId;
    const tags  = [...dispatch.tags];
    const entry = sosMap[sosId];
    if (!entry) return;

    // Lock depot and reset dispatch state immediately
    busy[depot.id]  = true;
    setDepotStyle(depot.id, 'busy');
    dispatch.phase  = 'idle';
    dispatch.depot  = null;
    dispatch.sosId  = null;
    dispatch.tags   = [];
    renderTagPanel();
    setInstruction('Click a grey depot to begin.');
    setStatus(`Routing from ${depot.name} to ${entry.payload.name}...`);

    const coords = await fetchRoute(depot.lat, depot.lng, entry.payload.lat, entry.payload.lng);
    if (!coords) {
      busy[depot.id] = false;
      setDepotStyle(depot.id, 'idle');
      setStatus(`Could not fetch route for ${depot.name}.`);
      return;
    }

    const routeLine = L.polyline(coords, { color: '#e74c3c', opacity: 0.55, weight: 2.5 }).addTo(map);

    const truck = new L.AnimatedMarker(coords, {
      icon: makeTruckIcon(depot.name[0]),
      interval: TRUCK_INTERVAL,
      autoStart: true,
      onEnd: () => {
        map.removeLayer(routeLine);
        map.removeLayer(truck);

        // Notify server → user portal
        socket.emit('sos-resolved', { sosId, depotId: depot.id });
        removeSos(sosId);
        setStatus(`Supplies delivered to ${entry.payload.name}. ${depot.name} returning...`);

        const back     = [...coords].reverse();
        const backLine = L.polyline(back, {
          color: '#e67e22', opacity: 0.45, weight: 2, dashArray: '6,5',
        }).addTo(map);

        const backTruck = new L.AnimatedMarker(back, {
          icon: makeTruckIcon(depot.name[0]),
          interval: TRUCK_INTERVAL,
          autoStart: true,
          onEnd: () => {
            map.removeLayer(backLine);
            map.removeLayer(backTruck);
            busy[depot.id] = false;
            setDepotStyle(depot.id, 'idle');
            setStatus(`${depot.name} available.`);
          },
        });
        map.addLayer(backTruck);
      },
    });
    map.addLayer(truck);
  }

  async function fetchRoute(lat1, lng1, lat2, lng2) {
    const url = `https://router.project-osrm.org/route/v1/car/${lng1},${lat1};${lng2},${lat2}?steps=true&geometries=geojson`;
    try {
      const r = await fetch(url);
      const d = await r.json();
      if (d.code === 'Ok' && d.routes.length) {
        return d.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      }
    } catch { /* network error */ }
    return null;
  }

  function makeTruckIcon(label) {
    return L.divIcon({
      html: `<div class="rtruck-icon">${label}</div>`,
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
  }

  // ── Socket ─────────────────────────────────────────────────────────────────
  const socket = io(window.location.origin);

  socket.on('connect', () => {
    const dot   = document.getElementById('conn-dot');
    const label = document.getElementById('conn-label');
    if (dot)   dot.className   = 'conn-dot conn-dot--on';
    if (label) label.textContent = 'Connected';
  });

  socket.on('disconnect', () => {
    const dot   = document.getElementById('conn-dot');
    const label = document.getElementById('conn-label');
    if (dot)   dot.className   = 'conn-dot conn-dot--off';
    if (label) label.textContent = 'Disconnected';
  });

  socket.on('sos-report', payload => addSos(payload));

  socket.on('sos-resolved', payload => {
    // Multi-admin sync: another admin resolved this SOS
    if (sosMap[payload.sosId]) removeSos(payload.sosId);
  });

  // ── SOS management ─────────────────────────────────────────────────────────
  function addSos(payload) {
    if (sosMap[payload.id]) return;

    const marker = L.circleMarker([payload.lat, payload.lng], {
      radius: 9,
      color: '#c0392b',
      fillColor: '#e74c3c',
      fillOpacity: 0.85,
      weight: 2,
      className: 'sos-marker-pulse',
    }).addTo(map);

    marker.bindPopup(`
      <b>${payload.name}</b><br>
      <span style="color:#555">Needs: ${payload.needs.join(', ')}</span><br>
      Severity: <b style="color:#e74c3c">${payload.severity}</b><br>
      <small style="color:#999">${payload.timestamp}</small>
    `);

    marker.on('click', () => onSosClick(payload.id));

    sosMap[payload.id] = { payload, marker, triLines: [] };
    addSosToList(payload);
    updateBadge();
  }

  function removeSos(sosId) {
    const entry = sosMap[sosId];
    if (!entry) return;
    clearTriLines(entry);
    entry.marker.remove();
    delete sosMap[sosId];
    document.getElementById(`si-${sosId}`)?.remove();
    updateBadge();
    const empty = document.getElementById('sos-empty');
    if (empty) empty.style.display = Object.keys(sosMap).length === 0 ? 'block' : 'none';
  }

  function addSosToList(payload) {
    const list  = document.getElementById('sos-list');
    const empty = document.getElementById('sos-empty');
    if (!list) return;
    if (empty) empty.style.display = 'none';

    const div = document.createElement('div');
    div.className = `sos-item sos-sev--${payload.severity.toLowerCase()}`;
    div.id = `si-${payload.id}`;
    div.innerHTML = `
      <span class="si-name">${payload.name}</span>
      <span class="si-sev">${payload.severity}</span>
      <div class="si-needs">${payload.needs.join(' · ')}</div>
    `;
    div.addEventListener('click', () => {
      map.flyTo([payload.lat, payload.lng], 15, { animate: true, duration: 0.8 });
      setTimeout(() => onSosClick(payload.id), 850);
    });
    list.prepend(div);
  }

  function updateBadge() {
    const el = document.getElementById('sos-count');
    if (el) el.textContent = Object.keys(sosMap).length;
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  function setInstruction(msg) {
    const el = document.getElementById('instruction');
    if (el) el.textContent = msg;
  }

  function setStatus(msg) {
    const el = document.getElementById('dispatch-status');
    if (!el) return;
    el.textContent    = msg;
    el.style.display  = msg ? 'block' : 'none';
  }

  // Initial render
  renderTagPanel();
});
