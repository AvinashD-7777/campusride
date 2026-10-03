import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { INITIAL_STUDENTS } from './src/data/mockStudents';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

// Setup WebSocket Server for Real-Time Bus Proximity Telemetry
const wss = new WebSocketServer({ noServer: true });

function broadcastTelemetry(busId: string, location: any) {
  const message = JSON.stringify({
    type: 'BUS_PROXIMITY_UPDATE',
    busId,
    busNumber: location.busNumber,
    location,
    coordinates: location.coordinates || { lat: 12.9480, lng: 80.1405 },
    timestamp: new Date().toISOString(),
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch { /* ignore closed socket */ }
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  console.log('[WebSocket] Student / Dashboard connected to Live Bus Telemetry stream');

  // Immediately send initial state
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    message: 'Connected to Live College Bus Proximity Telemetry Stream',
    locations: busLocations,
    timestamp: new Date().toISOString(),
  }));

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.action === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
      } else if (data.action === 'SIMULATE_GEOFENCE_BREACH') {
        const busId = data.busId || 'bus-1';
        const coords = data.coordinates || { lat: 12.9492, lng: 80.1410 };
        const location = busLocations[busId] || { busId, busNumber: 'BUS-01A' };
        location.coordinates = coords;
        broadcastTelemetry(busId, location);
      }
    } catch { /* ignore malformed */ }
  });
});

httpServer.on('upgrade', (request, socket, head) => {
  try {
    const host = request.headers.host || `localhost:${PORT}`;
    const pathname = request.url ? new URL(request.url, `http://${host}`).pathname : '';
    if (pathname === '/ws/bus-telemetry') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  } catch (err) {
    socket.destroy();
  }
});

app.use(express.json());

// Enable CORS for external hardware devices / ESP32
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-scanner-key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// In-Memory Data Store with Seed Data for ESP32 and Web
interface ServerBus {
  id: string;
  busNumber: string;
  routeName: string;
  capacity: number;
  currentBoardedCount: number;
  platformNumber: string;
  occupiedSeatNumbers: number[];
  stops: { id: string; name: string }[];
}

interface ServerStudent {
  id: string;
  cardId: string;
  name: string;
  rollNumber: string;
  pin: string;
  homeStopId: string;
  homeStopName: string;
  assignedBusId: string;
  assignedBusNumber: string;
  designatedSeatNumber?: number;
  morningBoarded: boolean;
  eveningBoarded: boolean;
}

let buses: ServerBus[] = [
  {
    id: 'bus-1',
    busNumber: 'BUS-01A',
    routeName: 'Tambaram - Sanatorium - Campus Express',
    capacity: 54,
    currentBoardedCount: 39,
    platformNumber: 'Bay 1',
    occupiedSeatNumbers: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 33, 34, 35, 36, 38, 39, 40, 42, 43, 44, 46, 47],
    stops: [
      { id: 'stop-tbm-1', name: 'Tambaram West (Bus Stand)' },
      { id: 'stop-tbm-2', name: 'Tambaram Sanatorium (MEPZ)' },
      { id: 'stop-chr-1', name: 'Chromepet (MIT Gate)' },
      { id: 'stop-pal-1', name: 'Pallavaram (Railway Station)' },
    ],
  },
  {
    id: 'bus-2',
    busNumber: 'BUS-01B',
    routeName: 'Tambaram East - Selaiyur - Medavakkam',
    capacity: 56,
    currentBoardedCount: 50,
    platformNumber: 'Bay 2',
    occupiedSeatNumbers: Array.from({ length: 50 }, (_, i) => i + 1),
    stops: [
      { id: 'stop-tbm-3', name: 'Tambaram East (Camp Road)' },
      { id: 'stop-sel-1', name: 'Selaiyur (Bharat Engg College)' },
      { id: 'stop-med-1', name: 'Medavakkam Junction' },
    ],
  },
  {
    id: 'bus-3',
    busNumber: 'BUS-02A',
    routeName: 'Velachery - Vijayanagar - Sholinganallur',
    capacity: 55,
    currentBoardedCount: 36,
    platformNumber: 'Bay 3',
    occupiedSeatNumbers: Array.from({ length: 36 }, (_, i) => i + 1),
    stops: [
      { id: 'stop-vel-1', name: 'Velachery (Vijayanagar Bus Terminus)' },
      { id: 'stop-med-1', name: 'Medavakkam Junction' },
      { id: 'stop-sho-1', name: 'Sholinganallur (TCS Junction)' },
    ],
  },
  {
    id: 'bus-4',
    busNumber: 'BUS-03A',
    routeName: 'Guindy - Saidapet - Kathipara - Airport',
    capacity: 58,
    currentBoardedCount: 57,
    platformNumber: 'Bay 4',
    occupiedSeatNumbers: Array.from({ length: 57 }, (_, i) => i + 1),
    stops: [
      { id: 'stop-sai-1', name: 'Saidapet (Panagal Building)' },
      { id: 'stop-gui-1', name: 'Guindy (Race Course / Metro)' },
      { id: 'stop-kat-1', name: 'Kathipara Junction' },
      { id: 'stop-pal-1', name: 'Pallavaram (Railway Station)' },
    ],
  },
];

let students: ServerStudent[] = JSON.parse(JSON.stringify(INITIAL_STUDENTS));

let busLocations: Record<string, any> = {
  'bus-1': {
    busId: 'bus-1',
    busNumber: 'BUS-01A',
    currentStopIndex: 1,
    currentStopId: 'stop-tbm-2',
    currentStopName: 'Tambaram Sanatorium (MEPZ)',
    nextStopId: 'stop-chr-1',
    nextStopName: 'Chromepet (MIT Gate)',
    status: 'Approaching Stop',
    lastScanTimestamp: '07:11 AM',
    lastScannedStudent: 'Priyanka Sundaram',
    speedKmH: 38,
    estimatedMinutesToNextStop: 3,
  },
  'bus-4': {
    busId: 'bus-4',
    busNumber: 'BUS-03A',
    currentStopIndex: 0,
    currentStopId: 'stop-sai-1',
    currentStopName: 'Saidapet (Panagal Building)',
    nextStopId: 'stop-gui-1',
    nextStopName: 'Guindy (Race Course / Metro)',
    status: 'Approaching Stop',
    lastScanTimestamp: '06:55 AM',
    lastScannedStudent: 'Sneha Natarajan',
    speedKmH: 32,
    estimatedMinutesToNextStop: 5,
  },
};

// --- HARDWARE ESP32 SCAN ENDPOINT ---
// POST /api/scan
// Called directly by the ESP32 microcontroller or browser scanner
app.post('/api/scan', (req: Request, res: Response) => {
  const { bus_id, card_id, trip_type } = req.body;

  if (!card_id) {
    return res.status(400).json({ status: 'ERROR', message: 'card_id is required' });
  }

  const cleanCardId = String(card_id).trim().toUpperCase();
  const rawBusId = String(bus_id || 'bus-1').trim().toUpperCase();

  // Find bus by ID (e.g. "bus-1") or by number (e.g. "BUS-01A")
  const currentBus = buses.find(
    b => b.id.toUpperCase() === rawBusId || b.busNumber.toUpperCase() === rawBusId
  );

  if (!currentBus) {
    return res.status(404).json({
      status: 'NOT_FOUND',
      message: `Bus '${bus_id}' not found in college transport system.`,
    });
  }

  // Find student by Card ID (or RFID hex UID like E2:80:68:31 or STU-1001) or Roll Number
  const student = students.find(
    s => s.cardId.toUpperCase() === cleanCardId || s.rollNumber.toUpperCase() === cleanCardId
  );

  if (!student) {
    return res.json({
      status: 'NOT_FOUND',
      message: `Card '${cleanCardId}' is unregistered. Please register at Transport Office.`,
      available_seats: currentBus.capacity - currentBus.currentBoardedCount,
      bus_number: currentBus.busNumber,
    });
  }

  const assignedBus = buses.find(b => b.id === student.assignedBusId) || currentBus;

  // RULE 1: WRONG BUS CHECK (Symmetric Morning & Evening Bus Allocation)
  if (student.assignedBusId !== currentBus.id && student.assignedBusNumber !== currentBus.busNumber) {
    return res.json({
      status: 'WRONG_BUS',
      message: `WRONG BUS! You are registered for ${assignedBus.busNumber} (${assignedBus.routeName}) at ${assignedBus.platformNumber}.`,
      student_name: student.name,
      roll_number: student.rollNumber,
      attempted_bus: currentBus.busNumber,
      assigned_bus_number: assignedBus.busNumber,
      assigned_route: assignedBus.routeName,
      platform: assignedBus.platformNumber,
      available_seats: currentBus.capacity - currentBus.currentBoardedCount,
    });
  }

  // RULE 2: DUPLICATE SCAN CHECK
  const trip = trip_type === 'Evening' ? 'eveningBoarded' : 'morningBoarded';
  if (student[trip]) {
    return res.json({
      status: 'DUPLICATE',
      message: `Already boarded! Seat #${student.designatedSeatNumber} confirmed.`,
      student_name: student.name,
      seat_number: student.designatedSeatNumber,
      available_seats: currentBus.capacity - currentBus.currentBoardedCount,
      bus_number: currentBus.busNumber,
    });
  }

  // RULE 3: FULL BUS CHECK (Zero Standing Guarantee)
  if (currentBus.currentBoardedCount >= currentBus.capacity) {
    return res.json({
      status: 'BUS_FULL',
      message: `Bus ${currentBus.busNumber} is at maximum capacity (${currentBus.capacity} seats). Standing not permitted!`,
      available_seats: 0,
      bus_number: currentBus.busNumber,
    });
  }

  // SUCCESSFUL BOARDING
  currentBus.currentBoardedCount += 1;
  student[trip] = true;

  const freeSeats = Math.max(0, currentBus.capacity - currentBus.currentBoardedCount);
  const seatInfo = student.designatedSeatNumber ? `Seat #${student.designatedSeatNumber} reserved.` : `Pass verified (Open Seating / Route Pending).`;

  console.log(`[ESP32 / API SCAN] APPROVED: ${student.name} (${cleanCardId}) on ${currentBus.busNumber}. ${seatInfo} Free: ${freeSeats}`);

  // Update live route progress based on this scan's stop
  const studentStopIdx = currentBus.stops.findIndex(s => s.id === student.homeStopId);
  if (studentStopIdx !== -1) {
    busLocations[currentBus.id] = {
      busId: currentBus.id,
      busNumber: currentBus.busNumber,
      currentStopIndex: studentStopIdx,
      currentStopId: student.homeStopId,
      currentStopName: student.homeStopName,
      nextStopId: currentBus.stops[studentStopIdx + 1]?.id,
      nextStopName: currentBus.stops[studentStopIdx + 1]?.name,
      status: studentStopIdx === currentBus.stops.length - 1 ? 'En Route to Campus' : 'Approaching Stop',
      lastScanTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      lastScannedStudent: student.name,
      speedKmH: 34,
      estimatedMinutesToNextStop: 4,
    };
    broadcastTelemetry(currentBus.id, busLocations[currentBus.id]);
  }

  return res.json({
    status: 'SUCCESS',
    message: `APPROVED! ${seatInfo}`,
    student_name: student.name,
    roll_number: student.rollNumber,
    card_id: cleanCardId,
    seat_number: student.designatedSeatNumber || null,
    available_seats: freeSeats,
    capacity: currentBus.capacity,
    bus_number: currentBus.busNumber,
  });
});

// GET /api/buses
app.get('/api/buses', (_req: Request, res: Response) => {
  res.json({
    buses: buses.map(b => ({
      id: b.id,
      bus_number: b.busNumber,
      route_name: b.routeName,
      capacity: b.capacity,
      boarded: b.currentBoardedCount,
      available_seats: b.capacity - b.currentBoardedCount,
      platform: b.platformNumber,
    })),
  });
});

// GET /api/live-status
// Real-time polling endpoint for StudentPortal "Bus Approaching" radar
app.get('/api/live-status', (req: Request, res: Response) => {
  const busId = req.query.bus_id as string;
  if (busId && busLocations[busId]) {
    return res.json({
      location: busLocations[busId],
      timestamp: new Date().toISOString(),
    });
  }
  return res.json({
    locations: busLocations,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/advance-route (Simulation helper for testing)
app.post('/api/advance-route', (req: Request, res: Response) => {
  const { bus_id } = req.body;
  const currentBus = buses.find(b => b.id === bus_id || b.busNumber === bus_id) || buses[0];
  const loc = busLocations[currentBus.id] || {
    busId: currentBus.id,
    busNumber: currentBus.busNumber,
    currentStopIndex: 0,
    currentStopId: currentBus.stops[0].id,
    currentStopName: currentBus.stops[0].name,
  };

  const nextIdx = (loc.currentStopIndex + 1) % currentBus.stops.length;
  busLocations[currentBus.id] = {
    ...loc,
    currentStopIndex: nextIdx,
    currentStopId: currentBus.stops[nextIdx].id,
    currentStopName: currentBus.stops[nextIdx].name,
    nextStopId: currentBus.stops[(nextIdx + 1) % currentBus.stops.length]?.id,
    nextStopName: currentBus.stops[(nextIdx + 1) % currentBus.stops.length]?.name,
    status: 'Approaching Stop',
    lastScanTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    estimatedMinutesToNextStop: 3,
  };

  broadcastTelemetry(currentBus.id, busLocations[currentBus.id]);

  return res.json({
    status: 'OK',
    location: busLocations[currentBus.id],
  });
});

// GET /api/health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'CampusRide College Bus Backend',
    esp32_compatible: true,
    time: new Date().toISOString(),
  });
});

// Mount Vite or serve static files
async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusRide Server running on port ${PORT}`);
    console.log(`ESP32 Scan API ready at http://0.0.0.0:${PORT}/api/scan`);
    console.log(`Live WebSocket Telemetry available at ws://0.0.0.0:${PORT}/ws/bus-telemetry`);
  });
}

startServer();
