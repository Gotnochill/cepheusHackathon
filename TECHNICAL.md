# Technical Document — Rapid Crisis Response Platform

## Overview

Rapid Crisis Response is a real-time hospitality emergency coordination platform. It bridges three parties — distressed guests or staff, an on-site command centre, and emergency services — through a single unified system. The platform was built for the Cepheus Hackathon and is deployed live at:

https://cepheushackathon-production.up.railway.app

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, HTML/CSS/JavaScript, Leaflet.js, Socket.io client |
| Backend | Node.js, Express.js, Faker.js |
| Database | MongoDB Atlas |
| Real-Time | Socket.io, OSRM (live routing + ETA) |
| Deployment | Railway |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Railway Container                   │
│                                                         │
│   ┌─────────────┐        ┌──────────────────────────┐  │
│   │  Express.js │        │     Socket.io Server     │  │
│   │  HTTP Server│◄──────►│  (attached to same HTTP) │  │
│   └──────┬──────┘        └────────────┬─────────────┘  │
│          │                            │                 │
│   Static │ files                      │ WS events       │
│   /public│ + /frontend/build          │                 │
└──────────┼────────────────────────────┼─────────────────┘
           │                            │
     ┌─────┴──────────────────────────┐ │
     │         MongoDB Atlas          │ │ (SOS persistence only)
     └────────────────────────────────┘ │
                                        │
           ┌────────────────────────────┼────────────────┐
           │                            │                │
    ┌──────▼──────┐             ┌───────▼──────┐  ┌──────▼──────┐
    │  User SOS   │             │ Admin Command│  │    Demo     │
    │   Portal    │             │   Centre     │  │ Simulation  │
    │ /realistic  │             │ /realistic   │  │   /admin    │
    │    /user    │             │    /admin    │  │             │
    └─────────────┘             └─────────────┘  └─────────────┘
```

The entire platform runs from a single Express server. The React frontend is built once and served as static files. The Socket.io server shares the same HTTP instance, so there is no cross-origin complexity.

---

## Application Modes

### 1. Demo Simulation (`/admin`)
A fully automated live simulation. Faker.js generates synthetic crisis reports every 2.5–5 seconds across four zones near Atria Institute of Technology (Hebbal, Yeshwanthpur, Sadashivanagar, Jalahalli). Three animated trucks are dispatched along real road routes using OSRM, complete return journeys, and reload before becoming available again.

### 2. Live Coordination (`/realistic`)
The real-world mode used during the demo with actual participants.

- **User SOS Portal** (`/realistic/user`) — guests or staff share GPS location, select crisis type and room, and submit an SOS. After dispatch, they see a live tracking map with the responder truck animating toward them in real time.
- **Command Centre** (`/realistic/admin`) — PIN-protected. Shows all active SOS requests in a priority queue, allows operators to select a response hub, assign crisis tags, and dispatch. On dispatch, an ETA is shown and emergency services (108/100/101) are notified via an on-screen alert.

---

## Real-Time Event Flow

```
User Device                  Server                    Admin Device
     │                          │                           │
     │── sos-report ───────────►│                           │
     │   {id, name, type,       │── sos-report ────────────►│
     │    room, lat, lng,       │   (broadcast to all)      │
     │    needs, severity}      │                           │
     │                          │  pendingSOS[id] = payload │
     │                          │  (cached for late joins)  │
     │                          │                           │
     │                          │◄─ sos-dispatched ─────────│
     │                          │   {sosId, coords,         │
     │◄─ sos-dispatched ────────│    etaMin, depotName}     │
     │   (if sosId matches)     │   (broadcast to all)      │
     │                          │                           │
     │  [tracking map shown]    │                           │
     │  [truck animates live]   │                           │
     │                          │                           │
     │                          │◄─ sos-resolved ───────────│
     │◄─ sos-resolved ──────────│   {sosId, depotId}        │
     │   (if sosId matches)     │   (broadcast to all)      │
     │                          │                           │
     │  [thank you screen]      │  delete pendingSOS[id]    │
```

### Socket.io Events

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `sos-report` | User → Server → All | `{id, name, type, room, lat, lng, needs, severity, timestamp}` | New SOS submitted |
| `sos-dispatched` | Admin → Server → All | `{sosId, coords, etaMin, depotName}` | Truck dispatched, route shared |
| `sos-resolved` | Admin → Server → All | `{sosId, depotId}` | Truck arrived, incident closed |
| `new-crisis` | Server → All | faker payload | Demo simulation crisis report |

---

## Key Architectural Decisions

### Single Server, No Separate Dev Server
Express serves both the React build (`/frontend/build`) and the raw public files (`/public`). This removes any cross-origin issues with Socket.io and means a single Railway container handles everything.

### pendingSOS Replay Cache
When the admin opens the command centre after a user has already submitted an SOS, the broadcast has already fired. To solve this, the server maintains an in-memory `pendingSOS` object. Every new socket connection immediately receives all unresolved SOS entries. This guarantees the admin always sees the current state regardless of when they connect.

```js
io.on('connection', (socket) => {
  Object.values(pendingSOS).forEach(p => socket.emit('sos-report', p));

  socket.on('sos-report',    payload => { pendingSOS[payload.id] = payload; io.emit(...) });
  socket.on('sos-dispatched', payload => { io.emit(...) });
  socket.on('sos-resolved',  payload => { delete pendingSOS[payload.sosId]; io.emit(...) });
});
```

### Client-Side Routing via OSRM
Route calculation happens entirely on the admin client using the public OSRM API. The server is not involved in routing. Once a route is fetched, the coordinate array and ETA (extracted from `route.duration`) are emitted to the server and relayed to the user's device so the tracking animation stays in sync.

### User Tracking Isolation
Every SOS submission generates a unique `sosId`. The `sos-dispatched` and `sos-resolved` socket events carry this ID. The user portal filters all incoming events against its own `sosId`, so a user with multiple sessions open, or multiple users submitting simultaneously, never sees another person's truck.

### GPS Bounds Fallback
Desktop browsers use IP-based geolocation which can place a user hundreds of kilometres away. The user portal checks whether the returned coordinates fall within the operational bounding box around Atria Institute of Technology (`12.97–13.04°N, 77.53–77.61°E`). If outside, coordinates are randomised within that box and a note is shown to the user.

### MongoDB Write Strategy
The faker demo loop fires every 2.5–5 seconds. Writing every synthetic event to MongoDB would exhaust the Atlas free tier storage quota in days. Only real SOS submissions from the user portal are persisted. Demo simulation data is ephemeral by design.

---

## Response Hub Layout

Four hospitality response hubs are placed around Atria Institute of Technology:

| Hub | Coordinates |
|---|---|
| Atria Convention | 13.012°N, 77.568°E |
| Grand Meridian | 12.993°N, 77.562°E |
| Fortune East Wing | 13.005°N, 77.583°E |
| ORR Residency Hub | 13.004°N, 77.550°E |

On SOS click, blue dashed triangulation lines are drawn from the incident point to the three nearest available hubs for 3 seconds, helping the operator choose the best responder.

---

## SOS Priority Queue

Incoming SOS reports are inserted into the admin sidebar in severity order rather than arrival order:

```
Critical → High → Moderate → Low
```

Critical markers on the map are rendered larger (radius 11 vs 9) with a faster CSS pulse animation. A Web Audio API tone fires on every new SOS — a single beep for normal severity, three rapid pulses for Critical.

---

## Deployment

The app is deployed on Railway with the following configuration (`railway.json`):

- **Build command:** `npm install && npm run build` (installs root deps, then builds React frontend)
- **Start command:** `npm start` (`node src/app.js`)
- **Environment variables:** `MONGODB_URI` (set in Railway dashboard)
- **Port:** auto-assigned by Railway via `process.env.PORT`

Railway auto-deploys on every push to `master`.

---

## File Structure

```
cepheusHackathon/
├── src/
│   ├── app.js               # Express server, Socket.io, MongoDB, faker loop
│   ├── models/crisis.js     # Mongoose schema
│   └── routes/crisisRoutes.js
├── public/
│   ├── realistic-admin.html/js/css   # Admin command centre
│   ├── realistic-user.html/js/css    # User SOS portal
│   ├── map.html/js                   # Demo simulation
│   ├── style.css                     # Demo simulation styles
│   └── src/AnimatedMarker.js         # Leaflet truck animation plugin
├── frontend/
│   └── src/components/
│       ├── LandingPage.js/css        # Home screen
│       ├── RealisticGateway.js       # Mode selector + PIN modal + QR code
│       ├── RealisticAdmin.js         # iframe wrapper for admin
│       └── RealisticUser.js          # iframe wrapper for user portal
├── railway.json             # Railway deployment config
├── package.json             # Root — backend dependencies only
└── start.sh / end.sh        # Local dev scripts
```
