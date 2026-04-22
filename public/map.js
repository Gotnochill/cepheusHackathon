document.addEventListener("DOMContentLoaded", () => {

  // ── Simulation constants ─────────────────────────────────────────────────
  const TOTAL_TRUCKS          = 3;
  const TRUCK_ANIM_INTERVAL   = 700;          // ms per animation step
  const LOADING_TIME_MS       = 15 * 60 * 1000; // 15-minute real-world load time
  const DISPATCH_CHECK_MS     = 30 * 1000;    // check for dispatch every 30s
  const MIN_REPORTS_DISPATCH  = 3;            // reports before a truck is sent
  const REM_POINTS            = 4;            // markers removed per delivery

  // ── Fleet ────────────────────────────────────────────────────────────────
  // status: 'available' | 'delivering' | 'returning' | 'loading'
  const fleet = [
    { id: 1, status: 'available', destination: null, loadingEndTime: null },
    { id: 2, status: 'available', destination: null, loadingEndTime: null },
    { id: 3, status: 'available', destination: null, loadingEndTime: null },
  ];

  // Pre-fetched road routes keyed by locality name
  const localityRoutes = {};

  // ── Map ──────────────────────────────────────────────────────────────────
  const map = L.map('map').setView([12.9716, 77.5946], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  L.polygon([
    [12.85, 77.45], [12.85, 77.75],
    [13.10, 77.75], [13.10, 77.45],
  ], { color: 'blue', opacity: 0.2, fillColor: 'blue', fillOpacity: 0.06 }).addTo(map);

  // ── Localities — four quadrants ───────────────────────────────────────────
  const localities = [
    { name: 'Koramangala', lat: 12.91, lng: 77.67, count: 0, imp: 0, markers: [], importances: [] },
    { name: 'Indiranagar',  lat: 13.04, lng: 77.69, count: 0, imp: 0, markers: [], importances: [] },
    { name: 'Jayanagar',    lat: 12.90, lng: 77.50, count: 0, imp: 0, markers: [], importances: [] },
    { name: 'Malleswaram',  lat: 13.04, lng: 77.51, count: 0, imp: 0, markers: [], importances: [] },
  ];

  const localityMarkers = {};
  localities.forEach(l => {
    const m = L.circleMarker([l.lat, l.lng], {
      radius: 9, color: 'gray', fillColor: 'gray', fillOpacity: 0.5,
    }).addTo(map);
    m.bindPopup(`${l.name}: 0 reports`);
    localityMarkers[l.name] = m;
  });

  // ── Warehouse ─────────────────────────────────────────────────────────────
  const WAREHOUSE = [12.9716, 77.5946];
  L.marker(WAREHOUSE, {
    icon: L.divIcon({
      html: '<div class="warehouse-icon">WH</div>',
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
  }).addTo(map).bindPopup('<b>Central Warehouse</b>');

  // ── Truck icon ────────────────────────────────────────────────────────────
  function makeTruckIcon(id, status) {
    return L.divIcon({
      html: `<div class="truck-icon truck-${status}">${id}</div>`,
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
  }

  // ── Route fetching + pre-fetch ────────────────────────────────────────────
  async function fetchRoute(lat1, lon1, lat2, lon2) {
    const url = `https://router.project-osrm.org/route/v1/car/${lon1},${lat1};${lon2},${lat2}?steps=true&geometries=geojson`;
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      }
    } catch { /* ignore */ }
    return null;
  }

  (async function prefetchRoutes() {
    for (const l of localities) {
      const coords = await fetchRoute(WAREHOUSE[0], WAREHOUSE[1], l.lat, l.lng);
      if (coords) localityRoutes[l.name] = coords;
    }
  })();

  // ── Dispatch check ────────────────────────────────────────────────────────
  setInterval(() => {
    const available = fleet.filter(t => t.status === 'available');
    if (!available.length) return;

    // Don't send a second truck to a locality already being served
    const activeDestinations = new Set(
      fleet.filter(t => t.status === 'delivering' || t.status === 'returning')
           .map(t => t.destination)
    );

    const targets = localities
      .filter(l => l.count >= MIN_REPORTS_DISPATCH && localityRoutes[l.name] && !activeDestinations.has(l.name))
      .sort((a, b) => b.imp - a.imp)
      .slice(0, available.length);

    targets.forEach((locality, i) => dispatchTruck(available[i], locality));
  }, DISPATCH_CHECK_MS);

  // ── Truck dispatch ────────────────────────────────────────────────────────
  function dispatchTruck(truck, locality) {
    const deliveryCoords = localityRoutes[locality.name];
    if (!deliveryCoords) return;

    truck.status      = 'delivering';
    truck.destination = locality.name;
    updateFleetPanel();

    // Delivery route line (red solid)
    const delivLine = L.polyline(deliveryCoords, {
      color: '#e74c3c', opacity: 0.6, weight: 2,
    }).addTo(map);

    const delivMarker = new L.AnimatedMarker(deliveryCoords, {
      icon: makeTruckIcon(truck.id, 'delivering'),
      interval: TRUCK_ANIM_INTERVAL,
      autostart: true,
      onEnd: () => {
        map.removeLayer(delivLine);
        map.removeLayer(delivMarker);
        removeClosestMarkers(locality);
        updateLocalityMarkers();

        // Return journey — reversed coords, dashed orange line
        const returnCoords = [...deliveryCoords].reverse();
        const returnLine   = L.polyline(returnCoords, {
          color: '#e67e22', opacity: 0.5, weight: 2, dashArray: '7,5',
        }).addTo(map);

        truck.status = 'returning';
        updateFleetPanel();

        const returnMarker = new L.AnimatedMarker(returnCoords, {
          icon: makeTruckIcon(truck.id, 'returning'),
          interval: TRUCK_ANIM_INTERVAL,
          autostart: true,
          onEnd: () => {
            map.removeLayer(returnLine);
            map.removeLayer(returnMarker);

            truck.status        = 'loading';
            truck.destination   = null;
            truck.loadingEndTime = Date.now() + LOADING_TIME_MS;
            updateFleetPanel();

            setTimeout(() => {
              truck.status        = 'available';
              truck.loadingEndTime = null;
              updateFleetPanel();
            }, LOADING_TIME_MS);
          },
        });
        map.addLayer(returnMarker);
      },
    });
    map.addLayer(delivMarker);
  }

  // ── Remove closest markers after delivery ─────────────────────────────────
  function removeClosestMarkers(locality) {
    if (!locality.markers.length) return;
    const center  = L.latLng(locality.lat, locality.lng);
    const sorted  = locality.markers.slice().sort(
      (a, b) => a.getLatLng().distanceTo(center) - b.getLatLng().distanceTo(center)
    );
    const toRemove = sorted.slice(0, REM_POINTS);
    toRemove.forEach(m => m.remove());
    locality.markers = locality.markers.filter(m => !toRemove.includes(m));
    locality.count   = Math.max(0, locality.count - toRemove.length);

    if (locality.importances.length) {
      locality.importances.sort((a, b) => b - a);
      const n       = Math.min(REM_POINTS, locality.importances.length);
      const removed = locality.importances.splice(0, n).reduce((s, v) => s + v, 0);
      locality.imp  = Math.max(0, locality.imp - removed);
    }
  }

  // ── Fleet panel ───────────────────────────────────────────────────────────
  function updateFleetPanel() {
    const byStatus = s => fleet.filter(t => t.status === s).length;
    const el = id => document.getElementById(id);

    if (el('trucks-available')) el('trucks-available').textContent = byStatus('available');
    if (el('trucks-en-route'))  el('trucks-en-route').textContent  = byStatus('delivering') + byStatus('returning');
    if (el('trucks-loading'))   el('trucks-loading').textContent   = byStatus('loading');

    fleet.forEach(truck => {
      const row   = el(`truck-row-${truck.id}`);
      if (!row) return;
      const badge = row.querySelector('.truck-badge');
      const label = row.querySelector('.truck-label');
      if (badge) badge.className = `truck-badge truck-badge--${truck.status}`;
      if (label) {
        const map = {
          available:  'Available',
          delivering: `Delivering → ${truck.destination}`,
          returning:  'Returning to depot',
          loading:    'Loading...',
        };
        label.textContent = map[truck.status] || truck.status;
      }
    });
  }

  // Live countdown for loading trucks
  setInterval(() => {
    fleet.forEach(truck => {
      if (truck.status !== 'loading' || !truck.loadingEndTime) return;
      const row = document.getElementById(`truck-row-${truck.id}`);
      if (!row) return;
      const label = row.querySelector('.truck-label');
      if (!label) return;
      const rem = Math.max(0, truck.loadingEndTime - Date.now());
      const m   = Math.floor(rem / 60000);
      const s   = Math.floor((rem % 60000) / 1000);
      label.textContent = `Loading ${m}:${s.toString().padStart(2, '0')}`;
    });
  }, 1000);

  // ── Locality pressure display ─────────────────────────────────────────────
  function updateLocalityDisplay() {
    const container = document.getElementById('locality-counters');
    if (!container) return;
    container.innerHTML = '';
    const maxCount  = Math.max(1, ...localities.map(l => l.count));
    const hotLocality = localities.reduce((a, b) => b.imp > a.imp ? b : a, localities[0]);

    localities.forEach(l => {
      const pct = Math.round((l.count / maxCount) * 100);
      const hot = l.name === hotLocality.name && l.count > 0;
      const row = document.createElement('div');
      row.className = 'locality-row';
      row.innerHTML = `
        <span class="locality-name">${l.name}</span>
        <div class="locality-bar-wrap">
          <div class="locality-bar ${hot ? 'locality-bar--hot' : ''}" style="width:${pct}%"></div>
        </div>
        <span class="locality-count">${l.count}</span>
      `;
      container.appendChild(row);
    });
  }

  function updateLocalityMarkers() {
    const hot = localities.reduce((a, b) => b.imp > a.imp ? b : a, localities[0]);
    localities.forEach(l => {
      const m    = localityMarkers[l.name];
      const isHot = l.name === hot.name && hot.imp > 0;
      m.setStyle(isHot
        ? { color: 'red', fillColor: 'red', fillOpacity: 0.8 }
        : { color: 'gray', fillColor: 'gray', fillOpacity: 0.5 }
      );
      m.bindPopup(isHot
        ? `<b>${l.name}</b> — highest demand<br>${l.count} active reports`
        : `${l.name}: ${l.count} reports`
      );
    });
    updateLocalityDisplay();
  }

  // ── Heuristic priority score ──────────────────────────────────────────────
  function heuristic(dist, sev) {
    const w = { low: 1, moderate: 2, high: 3, critical: 4 };
    return dist * (w[sev.toLowerCase()] || 1);
  }

  // ── Socket ────────────────────────────────────────────────────────────────
  const socket = io(window.location.origin, { transports: ['websocket'] });

  socket.on('new-crisis', (report) => {
    const reportMarker = L.circleMarker(
      [report.location.latitude, report.location.longitude],
      { radius: 5, color: '#000', fillColor: '#e74c3c', fillOpacity: 0.75, weight: 1 }
    ).addTo(map);
    reportMarker.bindPopup(
      `<b>${report.victimName}</b><br>
       Severity: ${report.severity}<br>
       Needs: ${report.needs.join(', ')}<br>
       ${report.reportTime}`
    );

    // Assign to nearest locality
    let closest = null, minDist = Infinity;
    localities.forEach(l => {
      const d = Math.hypot(l.lat - report.location.latitude, l.lng - report.location.longitude);
      if (d < minDist) { minDist = d; closest = l; }
    });

    if (closest) {
      closest.count++;
      closest.markers.push(reportMarker);
      const h = heuristic(minDist, report.severity);
      closest.imp += h;
      closest.importances.push(h);
    }

    updateLocalityMarkers();

    // Append to report list
    const list = document.getElementById('report-list');
    const item = document.createElement('div');
    item.className = `report-item severity-${report.severity.toLowerCase()}`;
    item.innerHTML = `<b>${report.victimName}</b><br>
      <span class="severity-${report.severity.toLowerCase()}">${report.severity}</span>
      &nbsp;·&nbsp;${report.needs.join(', ')}`;
    list.prepend(item);
    while (list.children.length > 40) list.removeChild(list.lastChild);
  });

});
