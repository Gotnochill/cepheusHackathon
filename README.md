# Rapid Crisis Response

Live: https://cepheushackathon-production.up.railway.app

Hospitality emergency coordination platform. Guests and staff submit SOS requests with GPS location and crisis type. The command centre receives them in real time, dispatches the nearest response team, and notifies emergency services.

---

## Run Locally

Prerequisites: Node.js 18+, a MongoDB Atlas URI in a `.env` file.

Create a `.env` file in the project root:

```
MONGODB_URI=your_mongodb_atlas_uri
PORT=3000
```

Then build the frontend and start the server:

```bash
# First time only — build the React frontend
cd frontend && npm install && npm run build && cd ..
npm install
```

```bash
# Start
./start.sh

# Stop when done
./end.sh
```

The server starts on http://localhost:3000 and the browser opens automatically.

## Routes

```
/                     Landing page
/admin                Demo Simulation — auto-dispatching trucks, live faker data
/realistic            Live Coordination gateway
/realistic/admin      Command Centre  (PIN: admin)
/realistic/user       Guest / Staff SOS portal
```

## Deploy

The app is configured for Railway. Connect the GitHub repo, set `MONGODB_URI` as an environment variable, and Railway handles the rest using `railway.json`.
