# Disaster Management Platform — Bangalore

Real-time disaster relief coordination platform for Bangalore.
Fork of the original Disaster Manager (Raipur), deployed independently.

Original repo: https://github.com/Gotnochill/Disaster-Manager
Original deployment: https://disaster-manager.onrender.com

## Run Locally

Prerequisites: Node.js, MongoDB Atlas account.

```bash
git clone https://github.com/Gotnochill/cepheusHackathon.git
cd cepheusHackathon

# Install backend dependencies
npm install

# Install and build the React frontend
cd frontend && npm install && npm run build && cd ..

# Create .env from .env.example and fill in MONGODB_URI
cp .env.example .env
```

Start the server:

```bash
npm run dev
```

Open http://localhost:3000. Everything runs from this single URL.

- / — landing page (choose a mode)
- /admin — Demo Simulation (live Bangalore map, faker data, truck dispatch)
- /user — Realistic Simulation (login, GPS, SOS form)

## Deploy on Render

- Build Command: `npm install && cd frontend && npm install && npm run build`
- Start Command: `npm start`
- Environment Variables: `MONGODB_URI`

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/disasters | List recent disaster reports |
| POST | /api/disasters | Submit a disaster report |
