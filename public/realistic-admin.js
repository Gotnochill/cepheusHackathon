document.addEventListener('DOMContentLoaded', () => {

  // ── Constants ──────────────────────────────────────────────────────────────
  const ATRIA_IT       = [13.0038, 77.5665];   // Atria Institute of Technology
  const TRUCK_INTERVAL = 950;
  const TAGS           = ['Medical', 'Fire', 'Security', 'Evacuation'];
  const SEV_ORDER      = { Critical: 0, High: 1, Moderate: 2, Low: 3 };

  const TYPE_COLOR = {
    'Medical Emergency': '#3498db',
    'Fire / Smoke':      '#e67e22',
    'Security Incident': '#9b59b6',
    'Evacuation':        '#27ae60',
    'Structural Damage': '#795548',
    'Power Outage':      '#f39c12',
    default:             '#e74c3c',
  };

  const DEPOTS = [
    { id: 'd1', name: 'Atria Convention',  lat: 13.012, lng: 77.568 },
    { id: 'd2', name: 'Grand Meridian',    lat: 12.993, lng: 77.562 },
    { id: 'd3', name: 'Fortune East Wing', lat: 13.005, lng: 77.583 },
    { id: 'd4', name: 'ORR Residency Hub', lat: 13.004, lng: 77.550 },
  ];

  // ── Map ────────────────────────────────────────────────────────────────────
  const map = L.map('map', { zoomControl: true }).setView(ATRIA_IT, 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  L.rectangle([[12.97, 77.53], [13.04, 77.61]], {
    color: '#2c3e50', weight: 1.5, fillOpacity: 0.03, dashArray: '5,5',
  }).addTo(map);

  L.marker(ATRIA_IT, {
    icon: L.divIcon({
      html: '<div class="ait-marker">AIT</div>',
      className: '', iconSize: [36, 36], iconAnchor: [18, 18],
    }),
    interactive: false,   // never blocks clicks on SOS markers underneath
    zIndexOffset: -1000,
  }).addTo(map).bindTooltip('Atria Institute of Technology', {
    permanent: true, direction: 'top', className: 'depot-label', offset: [0, -20],
    interactive: false,
  });

  // ── State ──────────────────────────────────────────────────────────────────
  const dispatch = { phase: 'idle', depot: null, sosId: null, tags: [] };
  const sosMap   = {};
  const busy     = {};
  let statsReceived = 0;
  let statsResolved = 0;
  DEPOTS.forEach(d => { busy[d.id] = false; });

  // ── Depot markers ──────────────────────────────────────────────────────────
  const dMarkers = {};
  const DEPOT_STYLE = {
    idle:     { radius: 14, color: '#7f8c8d', fillColor: '#bdc3c7', fillOpacity: 0.65, weight: 2 },
    selected: { radius: 16, color: '#007bff', fillColor: '#66b2ff', fillOpacity: 0.85, weight: 3 },
    busy:     { radius: 14, color: '#e67e22', fillColor: '#f6c176', fillOpacity: 0.70, weight: 2 },
  };

  DEPOTS.forEach(depot => {
    const m = L.circleMarker([depot.lat, depot.lng], { ...DEPOT_STYLE.idle }).addTo(map);
    m.bindTooltip(depot.name, {
      permanent: true, direction: 'top', className: 'depot-label', offset: [0, -16],
    });
    m.on('click', () => onDepotClick(depot));
    dMarkers[depot.id] = m;
  });

  function setDepotStyle(id, state) {
    dMarkers[id].setStyle(DEPOT_STYLE[state] || DEPOT_STYLE.idle);
  }

  // ── Depot click ────────────────────────────────────────────────────────────
  function onDepotClick(depot) {
    if (busy[depot.id]) {
      setInstruction(`${depot.name} is currently responding to an incident.`);
      return;
    }
    // Check if all hubs are busy
    const allBusy = DEPOTS.every(d => busy[d.id]);
    if (allBusy) {
      setInstruction('All response hubs are currently deployed. Please wait.');
      return;
    }
    if (dispatch.depot && dispatch.depot.id !== depot.id) {
      setDepotStyle(dispatch.depot.id, 'idle');
    }
    dispatch.phase = 'depot_selected';
    dispatch.depot = depot;
    dispatch.sosId = null;
    dispatch.tags  = [];
    setDepotStyle(depot.id, 'selected');
    setInstruction(`${depot.name} selected — now click a red SOS marker to target it.`);
    renderTagPanel();
  }

  // ── Cancel selection ───────────────────────────────────────────────────────
  function cancelDispatch() {
    if (dispatch.depot) setDepotStyle(dispatch.depot.id, 'idle');
    dispatch.phase = 'idle';
    dispatch.depot = null;
    dispatch.sosId = null;
    dispatch.tags  = [];
    renderTagPanel();
    setInstruction('Click a grey response hub on the map to begin.');
  }

  // ── SOS click ──────────────────────────────────────────────────────────────
  function onSosClick(sosId) {
    const entry = sosMap[sosId];
    if (!entry) return;
    showTriangulation(entry);
    if (dispatch.phase === 'idle') {
      setInstruction('Select a grey response hub first, then click an SOS marker.');
      return;
    }
    dispatch.phase = 'targeted';
    dispatch.sosId = sosId;
    dispatch.tags  = entry.payload.needs.filter(n => TAGS.includes(n));
    setInstruction(`Confirm response type and dispatch from ${dispatch.depot.name} to ${entry.payload.name}.`);
    renderTagPanel();
  }

  // ── Triangulation ──────────────────────────────────────────────────────────
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

  // ── Tag panel ──────────────────────────────────────────────────────────────
  function renderTagPanel() {
    const panel = document.getElementById('tag-panel');
    if (!panel) return;
    if (dispatch.phase === 'idle') {
      panel.innerHTML = '<p class="panel-hint">Select a response hub to begin dispatch.</p>';
      return;
    }
    const tagHTML = TAGS.map(t => {
      const active = dispatch.tags.includes(t);
      const smart  = !active && dispatch.phase === 'targeted'
        && sosMap[dispatch.sosId]?.payload.needs.includes(t);
      return `<button class="tag-btn${active ? ' tag-btn--active' : ''}${smart ? ' tag-btn--smart' : ''}"
        data-tag="${t}">${t}</button>`;
    }).join('');
    const actionHTML = dispatch.phase === 'targeted'
      ? `<button class="dispatch-btn" id="do-dispatch">Dispatch Responders &rarr;</button>`
      : `<p class="panel-hint">Now click a red SOS dot on the map.</p>`;
    panel.innerHTML = `
      <div class="panel-depot">${dispatch.depot.name}</div>
      <div class="tag-group">${tagHTML}</div>
      ${actionHTML}
      <button class="cancel-btn" id="do-cancel">Cancel Selection</button>
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
    document.getElementById('do-cancel')?.addEventListener('click', cancelDispatch);
  }

  // ── Dispatch ───────────────────────────────────────────────────────────────
  async function doDispatch() {
    if (dispatch.phase !== 'targeted' || !dispatch.depot || !dispatch.sosId) return;
    const depot = dispatch.depot;
    const sosId = dispatch.sosId;
    const entry = sosMap[sosId];
    if (!entry) return;

    busy[depot.id] = true;
    setDepotStyle(depot.id, 'busy');
    dispatch.phase = 'idle';
    dispatch.depot = null;
    dispatch.sosId = null;
    dispatch.tags  = [];
    renderTagPanel();
    setInstruction('Click a grey response hub on the map to begin.');

    showEmsNotification(entry.payload.name, entry.payload.type);
    setStatus(`Routing: ${depot.name} → ${entry.payload.name}...`);

    const result = await fetchRoute(depot.lat, depot.lng, entry.payload.lat, entry.payload.lng);
    if (!result) {
      busy[depot.id] = false;
      setDepotStyle(depot.id, 'idle');
      setStatus(`Could not fetch route for ${depot.name}.`);
      return;
    }

    const { coords, etaMin } = result;
    const routeLine = L.polyline(coords, { color: '#e74c3c', opacity: 0.55, weight: 2.5 }).addTo(map);
    setStatus(`Dispatched from ${depot.name} — ETA ~${etaMin} min to ${entry.payload.name}`);

    // Notify the user's portal so they can track the responder
    socket.emit('sos-dispatched', { sosId, coords, etaMin, depotName: depot.name });

    const truck = new L.AnimatedMarker(coords, {
      icon: makeTruckIcon(depot.name[0]),
      interval: TRUCK_INTERVAL,
      autoStart: true,
      onEnd: () => {
        map.removeLayer(routeLine);
        map.removeLayer(truck);
        socket.emit('sos-resolved', { sosId, depotId: depot.id });
        removeSos(sosId);
        statsResolved++;
        updateStats();
        setStatus(`Delivered to ${entry.payload.name}. ${depot.name} returning...`);

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

  // ── Route fetch ────────────────────────────────────────────────────────────
  async function fetchRoute(lat1, lng1, lat2, lng2) {
    const url = `https://router.project-osrm.org/route/v1/car/${lng1},${lat1};${lng2},${lat2}?steps=true&geometries=geojson`;
    try {
      const r = await fetch(url);
      const d = await r.json();
      if (d.code === 'Ok' && d.routes.length) {
        return {
          coords: d.routes[0].geometry.coordinates.map(c => [c[1], c[0]]),
          etaMin: Math.max(1, Math.ceil(d.routes[0].duration / 60)),
        };
      }
    } catch { /* network error */ }
    return null;
  }

  function makeTruckIcon(label) {
    return L.divIcon({
      html: `<div class="rtruck-icon">${label}</div>`,
      className: '', iconSize: [26, 26], iconAnchor: [13, 13],
    });
  }

  // ── Emergency Services toast ───────────────────────────────────────────────
  function showEmsNotification(location, crisisType) {
    const existing = document.getElementById('ems-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'ems-toast';
    toast.className = 'ems-toast';
    toast.innerHTML = `<span class="ems-dot"></span>
      <span><b>Emergency Services Notified</b> &mdash; ${crisisType || 'Incident'} at ${location} &mdash; 108 / 100 / 101 alerted</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('ems-toast--visible'), 50);
    setTimeout(() => {
      toast.classList.remove('ems-toast--visible');
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  }

  // ── Audio alert (Web Audio API — no external lib) ──────────────────────────
  function playAlert(isCritical) {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const pulses = isCritical ? 3 : 1;
      for (let i = 0; i < pulses; i++) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = isCritical ? 1046 : 880;
        const t0 = ctx.currentTime + i * 0.22;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.25, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
        osc.start(t0);
        osc.stop(t0 + 0.18);
      }
    } catch { /* audio blocked or unsupported */ }
  }

  // ── Socket ─────────────────────────────────────────────────────────────────
  const socket = io(window.location.origin);

  socket.on('connect', () => {
    const dot   = document.getElementById('conn-dot');
    const label = document.getElementById('conn-label');
    if (dot)   dot.className     = 'conn-dot conn-dot--on';
    if (label) label.textContent = 'Live';
  });

  socket.on('disconnect', () => {
    const dot   = document.getElementById('conn-dot');
    const label = document.getElementById('conn-label');
    if (dot)   dot.className     = 'conn-dot conn-dot--off';
    if (label) label.textContent = 'Disconnected';
  });

  socket.on('sos-report', payload => {
    addSos(payload);
    statsReceived++;
    updateStats();
    playAlert(payload.severity === 'Critical');
    // Pan to new SOS if it's outside current view
    if (!map.getBounds().contains([payload.lat, payload.lng])) {
      map.panTo([payload.lat, payload.lng], { animate: true, duration: 0.6 });
    }
  });

  socket.on('sos-resolved', payload => {
    if (sosMap[payload.sosId]) {
      removeSos(payload.sosId);
      statsResolved++;
      updateStats();
    }
  });

  // ── SOS management ─────────────────────────────────────────────────────────
  function addSos(payload) {
    if (sosMap[payload.id]) return;
    const typeColor = TYPE_COLOR[payload.type] || TYPE_COLOR.default;
    const isCritical = payload.severity === 'Critical';
    const marker = L.circleMarker([payload.lat, payload.lng], {
      radius:      isCritical ? 11 : 9,
      color:       typeColor,
      fillColor:   typeColor,
      fillOpacity: 0.85,
      weight:      isCritical ? 3 : 2,
      className:   `sos-marker-pulse${isCritical ? ' sos-marker--critical' : ''}`,
    }).addTo(map);

    marker.bindPopup(`
      <b>${payload.name}</b><br>
      <span style="color:#555;font-size:0.85em">${payload.type || 'Emergency'}</span><br>
      Needs: <b>${payload.needs.join(', ')}</b><br>
      ${payload.room ? `Location: <b>${payload.room}</b><br>` : ''}
      Severity: <b style="color:#e74c3c">${payload.severity}</b><br>
      <small style="color:#999">${payload.timestamp}</small>
    `);

    marker.on('click', () => onSosClick(payload.id));
    sosMap[payload.id] = { payload, marker, triLines: [], receivedAt: Date.now() };
    addSosToList(payload);
    updateBadge();
  }

  function removeSos(sosId) {
    const entry = sosMap[sosId];
    if (!entry) return;
    clearTriLines(entry);
    // Fade-out animation on list item before removing
    const item = document.getElementById(`si-${sosId}`);
    if (item) {
      item.style.transition = 'opacity 0.4s, transform 0.4s';
      item.style.opacity = '0';
      item.style.transform = 'translateX(20px)';
      setTimeout(() => item.remove(), 420);
    }
    entry.marker.remove();
    delete sosMap[sosId];
    updateBadge();
    setTimeout(() => {
      const empty = document.getElementById('sos-empty');
      if (empty) empty.style.display = Object.keys(sosMap).length === 0 ? 'block' : 'none';
    }, 450);
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
      <span class="si-sev sos-sev-badge--${payload.severity.toLowerCase()}">${payload.severity}</span>
      <div class="si-type">${payload.type || 'Emergency'}${payload.room ? ' &middot; ' + payload.room : ''}</div>
      <div class="si-needs">${payload.needs.join(' · ')}</div>
      <div class="si-time" id="si-time-${payload.id}">just now</div>
    `;
    div.addEventListener('click', () => {
      map.flyTo([payload.lat, payload.lng], 16, { animate: true, duration: 0.8 });
      setTimeout(() => onSosClick(payload.id), 850);
    });

    // Insert in severity order (Critical → High → Moderate → Low)
    const myOrder = SEV_ORDER[payload.severity] ?? 99;
    const items   = Array.from(list.children);
    const before  = items.find(el => {
      const sev = el.querySelector('.si-sev')?.textContent?.trim();
      return (SEV_ORDER[sev] ?? 99) > myOrder;
    });
    if (before) list.insertBefore(div, before);
    else list.appendChild(div);
  }

  // Live "X min ago" timestamps — update every 30 seconds
  setInterval(() => {
    Object.entries(sosMap).forEach(([id, entry]) => {
      const el = document.getElementById(`si-time-${id}`);
      if (!el) return;
      const mins = Math.floor((Date.now() - entry.receivedAt) / 60000);
      el.textContent = mins < 1 ? 'just now' : `${mins} min ago`;
    });
  }, 30000);

  function updateBadge() {
    const el = document.getElementById('sos-count');
    if (el) el.textContent = Object.keys(sosMap).length;
  }

  function updateStats() {
    const r = document.getElementById('stat-received');
    const s = document.getElementById('stat-resolved');
    if (r) r.textContent = statsReceived;
    if (s) s.textContent = statsResolved;
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  function setInstruction(msg) {
    const el = document.getElementById('instruction');
    if (el) el.textContent = msg;
  }

  function setStatus(msg) {
    const el = document.getElementById('dispatch-status');
    if (!el) return;
    el.textContent   = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  // ── Simulate SOS ───────────────────────────────────────────────────────────
  const SIM_NAMES = [
    'Ravi Kumar', 'Priya Sharma', 'Arun Nair', 'Deepa Reddy',
    'Suresh Patel', 'Anita Rao', 'Vikram Singh', 'Meena Iyer',
    'Kiran Bhat', 'Sunita Das', 'Arjun Mehta', 'Divya Nair',
  ];
  const SIM_NEEDS  = ['Medical', 'Fire', 'Security', 'Evacuation'];
  const SIM_SEVS   = ['Low', 'Moderate', 'High', 'Critical'];
  const SIM_TYPES  = ['Medical Emergency', 'Fire / Smoke', 'Security Incident', 'Evacuation'];
  const SIM_ROOMS  = ['Room 204', 'Lobby', 'Banquet Hall A', 'Parking Lot B', 'Restaurant — Level 2', 'Conference Room 3', 'Poolside', 'Reception'];

  document.getElementById('sim-sos-btn')?.addEventListener('click', () => {
    const lat      = 12.97 + Math.random() * 0.07;
    const lng      = 77.53 + Math.random() * 0.08;
    const shuffled = [...SIM_NEEDS].sort(() => Math.random() - 0.5);
    const type     = SIM_TYPES[Math.floor(Math.random() * SIM_TYPES.length)];
    const payload  = {
      id:        `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name:      SIM_NAMES[Math.floor(Math.random() * SIM_NAMES.length)],
      lat, lng, type,
      room:      SIM_ROOMS[Math.floor(Math.random() * SIM_ROOMS.length)],
      needs:     shuffled.slice(0, Math.floor(Math.random() * 2) + 1),
      severity:  SIM_SEVS[Math.floor(Math.random() * SIM_SEVS.length)],
      timestamp: new Date().toLocaleTimeString(),
    };
    socket.emit('sos-report', payload);
  });

  renderTagPanel();
});
