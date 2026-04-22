import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';

import crisisRoutes from './routes/crisisRoutes.js';
import Crisis from './models/crisis.js';
import { faker } from '@faker-js/faker';

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

app.use('/api/crises', crisisRoutes);

const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'frontend/build')));

app.get('*', (req, res) => {
  const buildIndex = path.join(__dirname, 'frontend/build', 'index.html');
  res.sendFile(buildIndex, (err) => {
    if (err) res.sendFile(path.join(__dirname, 'public', 'map.html'));
  });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Bangalore bounding box for faker data
const cityBounds = {
  minLat: 12.87, maxLat: 13.08,
  minLng: 77.47, maxLng: 77.73,
};

const MIN_DELAY = 1000;
const MAX_DELAY = 2500;

const generateFakeCrisis = () => {
  const latitude  = faker.number.float({ min: cityBounds.minLat, max: cityBounds.maxLat, precision: 0.0001 });
  const longitude = faker.number.float({ min: cityBounds.minLng, max: cityBounds.maxLng, precision: 0.0001 });
  return {
    id: faker.string.uuid(),
    victimName: faker.person.fullName(),
    contact: faker.phone.number(),
    location: { latitude, longitude },
    severity: faker.helpers.weightedArrayElement([
      { weight: 7, value: 'Low' },
      { weight: 5, value: 'Moderate' },
      { weight: 3, value: 'High' },
      { weight: 1, value: 'Critical' },
    ]),
    reportTime: new Date().toLocaleTimeString(),
    needs: faker.helpers.arrayElements(['Food', 'Water', 'Shelter', 'Medical Aid'], 2),
  };
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ── Phase 2: Realistic Mode ────────────────────────────────────────────────
  socket.on('sos-report', async (payload) => {
    io.emit('sos-report', payload);
    console.log('SOS report from', payload.name, '—', payload.severity);
    try {
      await new Crisis({
        name: payload.name,
        type: 'SOS',
        location: { type: 'Point', coordinates: [payload.lng, payload.lat] },
        severity: mapSeverityToNumber(payload.severity),
        startDate: new Date(),
        description: `Needs: ${payload.needs.join(', ')}`,
        affectedAreas: [],
      }).save();
    } catch (err) {
      console.error('SOS save error:', err.message);
    }
  });

  socket.on('sos-resolved', (payload) => {
    io.emit('sos-resolved', payload);
  });
});

(function crisisLoop() {
  const delay = Math.round(Math.random() * (MAX_DELAY - MIN_DELAY)) + MIN_DELAY;
  setTimeout(async () => {
    const report = generateFakeCrisis();
    io.emit('new-crisis', report);
    console.log('Emitted new-crisis:', report.victimName, '—', report.severity);

    try {
      await new Crisis({
        name: report.victimName,
        type: 'Crisis',
        location: {
          type: 'Point',
          coordinates: [report.location.longitude, report.location.latitude],
        },
        severity: mapSeverityToNumber(report.severity),
        startDate: new Date(),
        description: `Needs: ${report.needs.join(', ')}`,
        affectedAreas: [],
      }).save();
    } catch (err) {
      console.error('Error saving crisis:', err.message);
    }

    crisisLoop();
  }, delay);
})();

function mapSeverityToNumber(severity) {
  switch (severity) {
    case 'Low':      return 1;
    case 'Moderate': return 2;
    case 'High':     return 3;
    case 'Critical': return 4;
    default:         return 0;
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
