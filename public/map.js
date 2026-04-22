document.addEventListener("DOMContentLoaded", () => {

  // ── Truck fleet ──────────────────────────────────────────────────────────
  const TOTAL_TRUCKS   = 3;
  const TRUCK_INTERVAL = 700;   // ms per animation step (slower = more realistic)
  const DISPATCH_EVERY = 180;   // ticks of 100ms before next dispatch (~18s)
  const RETURN_DELAY   = 14000; // ms truck takes to "return" after delivery
  const REM_POINTS     = 4;     // markers removed per truck arrival

  let availableTrucks = TOTAL_TRUCKS;
  let trucksEnRoute   = 0;
  let truckTime       = 0;

  // ── Map init ─────────────────────────────────────────────────────────────
  const map = L.map("map").setView([12.9716, 77.5946], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  const bangaloreBoundary = [
    [12.85, 77.45], [12.85, 77.75],
    [13.10, 77.75], [13.10, 77.45]
  ];
  L.polygon(bangaloreBoundary, {
    color: "blue", opacity: 0.2, fillColor: "blue", fillOpacity: 0.06
  }).addTo(map);

  // ── Localities — spread to four quadrants within the boundary ────────────
  const localities = [
    { name: "Koramangala", lat: 12.91, lng: 77.67, count: 0, imp: 0, markers: [], importances: [] },
    { name: "Indiranagar",  lat: 13.04, lng: 77.69, count: 0, imp: 0, markers: [], importances: [] },
    { name: "Jayanagar",    lat: 12.90, lng: 77.50, count: 0, imp: 0, markers: [], importances: [] },
    { name: "Malleswaram",  lat: 13.04, lng: 77.51, count: 0, imp: 0, markers: [], importances: [] }
  ];

  const localityMarkers = {};
  localities.forEach(locality => {
    const marker = L.circleMarker([locality.lat, locality.lng], {
      radius: 9, color: "gray", fillColor: "gray", fillOpacity: 0.5
    }).addTo(map);
    marker.bindPopup(`${locality.name}: 0 reports`);
    localityMarkers[locality.name] = marker;
  });

  // ── Warehouse (central hub) ───────────────────────────────────────────────
  const warehouseLocation = [12.9716, 77.5946];
  const warehouseIcon = L.divIcon({
    html: '<div style="width:18px;height:18px;background:#f39c12;border:2px solid #333;border-radius:3px;"></div>',
    className: "",
    iconSize: [18, 18]
  });
  L.marker(warehouseLocation, { icon: warehouseIcon })
    .addTo(map)
    .bindPopup("<b>Central Warehouse</b>");

  let currentHighlightedLocality = null;
  let warehouseToLocalityLine    = null;
  let currentRouteCoordinates    = null;

  // ── Truck dispatch ticker (one interval, not per-report) ─────────────────
  setInterval(() => { truckTime++; }, 100);

  setInterval(() => {
    if (currentRouteCoordinates && truckTime >= DISPATCH_EVERY && availableTrucks > 0) {
      availableTrucks--;
      trucksEnRoute++;
      updateTruckPanel();
      startAnim(currentRouteCoordinates);
      truckTime = 0;
    }
  }, 1000);

  // ── Truck animation ───────────────────────────────────────────────────────
  function startAnim(coords) {
    const routeLine = L.polyline(coords, { color: "red", opacity: 0.55 }).addTo(map);

    const truck = new L.AnimatedMarker(coords, {
      interval: TRUCK_INTERVAL,
      autostart: true,
      onEnd: () => {
        map.removeLayer(routeLine);
        map.removeLayer(truck);

        // Remove closest markers from the served locality
        if (currentHighlightedLocality) {
          const center  = L.latLng(currentHighlightedLocality.lat, currentHighlightedLocality.lng);
          const markers = currentHighlightedLocality.markers;
          if (markers.length > 0) {
            const sorted   = markers.slice().sort((a, b) =>
              a.getLatLng().distanceTo(center) - b.getLatLng().distanceTo(center)
            );
            const toRemove = sorted.slice(0, REM_POINTS);
            toRemove.forEach(m => m.remove());
            currentHighlightedLocality.markers = markers.filter(m => !toRemove.includes(m));
            currentHighlightedLocality.count   = Math.max(0, currentHighlightedLocality.count - toRemove.length);

            if (currentHighlightedLocality.importances.length > 0) {
              currentHighlightedLocality.importances.sort((a, b) => b - a);
              const n       = Math.min(REM_POINTS, currentHighlightedLocality.importances.length);
              const removed = currentHighlightedLocality.importances.splice(0, n).reduce((s, v) => s + v, 0);
              currentHighlightedLocality.imp = Math.max(0, currentHighlightedLocality.imp - removed);
            }
          }
        }

        updateLocalityMarkers();

        // Truck returns to base after a delay
        setTimeout(() => {
          availableTrucks++;
          trucksEnRoute--;
          updateTruckPanel();
        }, RETURN_DELAY);
      }
    });
    map.addLayer(truck);
  }

  // ── Route fetching ────────────────────────────────────────────────────────
  async function getRouteData(lat1, lon1, lat2, lon2) {
    const url = `https://router.project-osrm.org/route/v1/car/${lon1},${lat1};${lon2},${lat2}?steps=true&geometries=geojson`;
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (data.code === "Ok" && data.routes.length > 0) {
        return {
          geometry: data.routes[0].geometry.coordinates,
          distance: data.routes[0].distance
        };
      }
      return null;
    } catch (err) {
      console.error("Route fetch error:", err);
      return null;
    }
  }

  async function updateWarehouseToLocalityPath(locality) {
    if (warehouseToLocalityLine) map.removeLayer(warehouseToLocalityLine);
    const result = await getRouteData(
      warehouseLocation[0], warehouseLocation[1], locality.lat, locality.lng
    );
    if (result) {
      currentRouteCoordinates   = result.geometry.map(c => [c[1], c[0]]);
      warehouseToLocalityLine   = L.polyline(currentRouteCoordinates, {
        color: "blue", weight: 3, opacity: 0.28
      }).addTo(map);
    }
  }

  // ── Panel updates ─────────────────────────────────────────────────────────
  function updateTruckPanel() {
    const avail   = document.getElementById("trucks-available");
    const enRoute = document.getElementById("trucks-en-route");
    if (avail)   avail.textContent   = availableTrucks;
    if (enRoute) enRoute.textContent = trucksEnRoute;
  }

  function updateLocalityDisplay() {
    const container = document.getElementById("locality-counters");
    if (!container) return;
    container.innerHTML = "";

    const maxCount = Math.max(1, ...localities.map(l => l.count));
    const hotName  = localities.reduce((a, b) => b.imp > a.imp ? b : a, localities[0]).name;

    localities.forEach(locality => {
      const pct = Math.round((locality.count / maxCount) * 100);
      const hot = locality.name === hotName && locality.count > 0;

      const row = document.createElement("div");
      row.className = "locality-row";
      row.innerHTML = `
        <span class="locality-name">${locality.name}</span>
        <div class="locality-bar-wrap">
          <div class="locality-bar ${hot ? "locality-bar--hot" : ""}" style="width:${pct}%"></div>
        </div>
        <span class="locality-count">${locality.count}</span>
      `;
      container.appendChild(row);
    });
  }

  function updateLocalityMarkers() {
    const hotLocality = localities.reduce((a, b) => b.imp > a.imp ? b : a, localities[0]);

    localities.forEach(locality => {
      const marker = localityMarkers[locality.name];
      const isHot  = locality.name === hotLocality.name && hotLocality.imp > 0;

      if (isHot) {
        marker.setStyle({ color: "red", fillColor: "red", fillOpacity: 0.8 });
        marker.bindPopup(`<b>${locality.name}</b> — most affected<br>${locality.count} reports`);
        if (!currentHighlightedLocality || currentHighlightedLocality.name !== locality.name) {
          currentHighlightedLocality = locality;
          updateWarehouseToLocalityPath(locality);
        }
      } else {
        marker.setStyle({ color: "gray", fillColor: "gray", fillOpacity: 0.5 });
        marker.bindPopup(`${locality.name}: ${locality.count} reports`);
      }
    });
  }

  // ── Heuristic priority score ──────────────────────────────────────────────
  function heuristic(dist, sev) {
    const weights = { low: 1, moderate: 2, high: 3, critical: 4 };
    return dist * (weights[sev.toLowerCase()] || 1);
  }

  // ── Socket — incoming disaster reports ───────────────────────────────────
  const socket = io(window.location.origin, { transports: ["websocket"] });

  socket.on("new-disaster", (report) => {
    const reportMarker = L.circleMarker(
      [report.location.latitude, report.location.longitude],
      { radius: 5, color: "#000", fillColor: "#e74c3c", fillOpacity: 0.75, weight: 1 }
    ).addTo(map);

    reportMarker.bindPopup(
      `<b>${report.victimName}</b><br>
       Severity: ${report.severity}<br>
       Needs: ${report.needs.join(", ")}<br>
       ${report.reportTime}`
    );

    // Assign to nearest locality
    let closest  = null;
    let minDist  = Infinity;
    localities.forEach(l => {
      const d = Math.sqrt(
        Math.pow(l.lat - report.location.latitude, 2) +
        Math.pow(l.lng - report.location.longitude, 2)
      );
      if (d < minDist) { minDist = d; closest = l; }
    });

    if (closest) {
      closest.count++;
      closest.markers.push(reportMarker);
      const h = heuristic(minDist, report.severity);
      closest.imp += h;
      closest.importances.push(h);
    }

    updateLocalityDisplay();
    updateLocalityMarkers();

    // Add to report list
    const reportList = document.getElementById("report-list");
    const item       = document.createElement("div");
    item.className   = `report-item severity-${report.severity.toLowerCase()}`;
    item.innerHTML   = `
      <b>${report.victimName}</b><br>
      <span class="severity-${report.severity.toLowerCase()}">${report.severity}</span>
      &nbsp;·&nbsp;${report.needs.join(", ")}
    `;
    reportList.prepend(item);

    // Keep list from growing unbounded
    while (reportList.children.length > 40) {
      reportList.removeChild(reportList.lastChild);
    }
  });

});
