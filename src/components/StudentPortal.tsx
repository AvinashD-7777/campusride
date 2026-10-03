import React, { useState, useEffect, useRef } from 'react';
import { useBus } from '../context/BusContext';
import { DigitalIdCard } from './DigitalIdCard';
import { BusSeatMap } from './BusSeatMap';
import { ALL_COLLEGE_STOPS } from '../data/mockRoutes';
import { soundEffects } from '../utils/audio';
import {
  haversineDistanceMeters,
  getStopCoordinates,
  offsetCoordinatesByDistance,
} from '../utils/geo';
import { GeoCoordinates } from '../types/bus';
import {
  Bus,
  MapPin,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Shield,
  Users,
  Search,
  Radio,
  Navigation,
  Bell,
  FastForward,
  Activity,
  Volume2,
  X,
  Compass,
  Radar,
  Sparkles,
} from 'lucide-react';

interface StudentPortalProps {
  onGoToScannerWithCard?: (cardId: string) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ onGoToScannerWithCard }) => {
  const {
    students,
    buses,
    activeStudent,
    setActiveStudent,
    requestBoardingChange,
    findAlternativeBuses,
    currentTripType,
    liveBusLocations,
    advanceBusStop,
    lastPollTimestamp,
  } = useBus();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNewStopId, setSelectedNewStopId] = useState(ALL_COLLEGE_STOPS[0].id);
  const [pinInput, setPinInput] = useState('');
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(true);
  const [changeStatus, setChangeStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    details?: { newBusNumber: string; effectiveDate: string };
  }>({ type: null, message: '' });
  const [isChangingStop, setIsChangingStop] = useState(false);

  // WebSocket Connection State
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'fallback'>('connecting');
  const [lastWsMessage, setLastWsMessage] = useState<string>('Listening on WebSocket stream...');
  const [wsPulseCount, setWsPulseCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);

  const student = activeStudent || students.find(s => s.rollNumber === '146611038') || students[0];
  const assignedBus = buses.find(b => b.id === student?.assignedBusId);

  // 500-Meter Geofence & Coordinates Tracking
  const studentStopCoords = getStopCoordinates(student?.homeStopId || 'stop-tbm-1');

  // Initial bus coordinate: placed at 420m away approaching the stop (inside 500m geofence)
  const [busCoordinates, setBusCoordinates] = useState<GeoCoordinates>(() => {
    return offsetCoordinatesByDistance(studentStopCoords, 420);
  });

  const [distanceMeters, setDistanceMeters] = useState<number>(() => {
    return haversineDistanceMeters(
      offsetCoordinatesByDistance(studentStopCoords, 420),
      studentStopCoords
    );
  });

  const [showGeofenceToast, setShowGeofenceToast] = useState<boolean>(true);
  const [toastAutoDismissed, setToastAutoDismissed] = useState<boolean>(false);

  // Update distance whenever student or coordinates change
  useEffect(() => {
    const dist = haversineDistanceMeters(busCoordinates, studentStopCoords);
    setDistanceMeters(dist);

    if (dist <= 500 && !toastAutoDismissed) {
      setShowGeofenceToast(true);
    }
  }, [student, busCoordinates, studentStopCoords, toastAutoDismissed]);

  // WebSocket Telemetry Listener: tracks live bus coordinates and triggers 500m proximity toast
  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/bus-telemetry`;

        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setWsStatus('connected');
          setLastWsMessage(`WebSocket connected at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            if (data.type === 'BUS_PROXIMITY_UPDATE') {
              setWsPulseCount(prev => prev + 1);
              setLastWsMessage(`Live proximity signal for ${data.busNumber} at ${timeStr}`);

              // Check if update is for this student's assigned bus
              if (data.busId === student?.assignedBusId || data.busNumber === student?.assignedBusNumber) {
                let coords: GeoCoordinates | null = data.coordinates || null;
                if (!coords && data.location?.currentStopId) {
                  coords = getStopCoordinates(data.location.currentStopId);
                }

                if (coords) {
                  setBusCoordinates(coords);
                  const currentDist = haversineDistanceMeters(coords, studentStopCoords);
                  setDistanceMeters(currentDist);

                  // 500-METER GEOFENCE TRIGGER:
                  if (currentDist <= 500) {
                    setShowGeofenceToast(true);
                    setToastAutoDismissed(false);
                    if (soundAlertsEnabled) {
                      soundEffects.playSuccess();
                    }
                  }
                }
              }
            } else if (data.type === 'CONNECTED') {
              setWsStatus('connected');
              setLastWsMessage('Subscribed to GPS & scanner telemetry stream');
            }
          } catch {
            // handle error
          }
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setWsStatus('fallback');
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsStatus('fallback');
          reconnectTimeout = setTimeout(connectWebSocket, 6000);
        };
      } catch {
        if (isMounted) setWsStatus('fallback');
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [student, studentStopCoords, soundAlertsEnabled]);

  // Live Location & Radar Calculation
  const liveLocation = student ? liveBusLocations[student.assignedBusId] : undefined;
  const studentStopIndex = assignedBus?.stops.findIndex(s => s.id === student?.homeStopId) ?? -1;
  const currentBusStopIndex = liveLocation?.currentStopIndex ?? 0;
  const stopsAway = studentStopIndex !== -1 ? studentStopIndex - currentBusStopIndex : 99;

  // Sound chime when bus enters 500m radius
  useEffect(() => {
    if (soundAlertsEnabled && distanceMeters <= 500 && showGeofenceToast) {
      soundEffects.playWarning();
    }
  }, [distanceMeters, soundAlertsEnabled, showGeofenceToast]);

  // Tomorrow's date formatted
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate free seats on student's bus
  const availableSeats = assignedBus ? Math.max(0, assignedBus.capacity - assignedBus.currentBoardedCount) : 0;

  // Alternative buses for this student's stop
  const alternatives = student ? findAlternativeBuses(student.homeStopId, student.assignedBusId) : [];

  const handleStopChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const res = requestBoardingChange(student.id, selectedNewStopId, pinInput);
    if (res.success) {
      setChangeStatus({
        type: 'success',
        message: res.message,
        details: res.details,
      });
      setPinInput('');
      setIsChangingStop(false);
    } else {
      setChangeStatus({
        type: 'error',
        message: res.message,
      });
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cardId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Simulation test functions for 500m geofence
  const simulateDistance = (targetDistanceMeters: number) => {
    const simulatedCoords = offsetCoordinatesByDistance(studentStopCoords, targetDistanceMeters);
    setBusCoordinates(simulatedCoords);
    setDistanceMeters(targetDistanceMeters);

    // Stream update through real WebSocket connection if open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'SIMULATE_GEOFENCE_BREACH',
        busId: student.assignedBusId,
        coordinates: simulatedCoords,
      }));
    }

    if (targetDistanceMeters <= 500) {
      setShowGeofenceToast(true);
      setToastAutoDismissed(false);
      if (soundAlertsEnabled) {
        soundEffects.playSuccess();
      }
    } else {
      setShowGeofenceToast(false);
    }
  };

  const isWithinGeofence = distanceMeters <= 500;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative">
      {/* FLOATING 500-METER GEOFENCE TOAST NOTIFICATION */}
      {showGeofenceToast && isWithinGeofence && (
        <div className="fixed top-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-top-6 duration-300">
          <div className="bg-zinc-950/95 backdrop-blur-xl border-2 border-emerald-500/80 rounded-2xl p-4 shadow-2xl shadow-emerald-500/20 text-zinc-100 relative overflow-hidden">
            {/* Top ambient highlight */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 animate-pulse" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/40 animate-bounce">
                    <Bell className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-zinc-950 animate-ping" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500 text-zinc-950 uppercase tracking-wider">
                      ⚡ BUS APPROACHING
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
                      ETA: ~{Math.max(1, Math.round(distanceMeters / 150))} min
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-zinc-100 mt-1">
                    Bus Approaching: {student.assignedBusNumber}
                  </h4>
                  <p className="text-xs text-zinc-300">
                    Entered 500-meter radius of <strong>{student.homeStopName}</strong> ({distanceMeters}m away).
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    Bus GPS: {busCoordinates.lat.toFixed(4)}° N, {busCoordinates.lng.toFixed(4)}° E
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowGeofenceToast(false);
                  setToastAutoDismissed(true);
                }}
                className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                title="Dismiss Toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Distance Progress Gauge */}
            <div className="mt-3.5 bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                <span className="text-zinc-400">500m Geofence Perimeter</span>
                <span className="text-emerald-400 font-bold">
                  {distanceMeters}m / 500m (Approaching Stop)
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, ((500 - distanceMeters) / 500) * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1 font-mono">
                <span>500m Boundary</span>
                <span className="text-amber-400 font-bold">{student.designatedSeatNumber ? `Seat #${student.designatedSeatNumber}` : 'Open Seating (Route Pending)'}</span>
                <span>Stop Entrance</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>WebSocket Stream Connected</span>
              </div>

              {onGoToScannerWithCard && (
                <button
                  onClick={() => {
                    setShowGeofenceToast(false);
                    onGoToScannerWithCard(student.cardId);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
                >
                  Open Boarding Scanner
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Login & Official Register Access Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100">Student Portal Login</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE SESSION
              </span>
            </div>
            <p className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span>Logged In: <strong className="text-zinc-200">{student?.name}</strong></span>
              <span className="text-zinc-600">•</span>
              <span>Register No (Login ID): <strong className="text-amber-400 font-mono">{student?.rollNumber}</strong></span>
              <span className="text-zinc-600">•</span>
              <span>Bus: <strong className="text-blue-400 font-mono">{student?.assignedBusNumber}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Register No or Name..."
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                // Quick switch if exact register number typed
                const match = students.find(s => s.rollNumber === val.trim() || s.name.toLowerCase() === val.trim().toLowerCase());
                if (match) {
                  setActiveStudent(match);
                  setShowGeofenceToast(true);
                  setToastAutoDismissed(false);
                }
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={student?.id}
            onChange={(e) => {
              const selected = students.find(s => s.id === e.target.value);
              if (selected) {
                setActiveStudent(selected);
                setChangeStatus({ type: null, message: '' });
                setShowGeofenceToast(true);
                setToastAutoDismissed(false);
              }
            }}
            className="py-2 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer font-mono"
          >
            {filteredStudents.map(s => (
              <option key={s.id} value={s.id}>
                {s.rollNumber} - {s.name} ({s.assignedBusNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LIVE RADAR & 500M GEOFENCE STATUS BANNER */}
      <div className="bg-zinc-900 border-2 border-zinc-700/80 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        {isWithinGeofence && (
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent pointer-events-none animate-pulse" />
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-zinc-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-700 flex items-center justify-center text-emerald-400">
                <Radar className="w-6 h-6 animate-spin duration-3000" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-zinc-900 animate-ping" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <span>Live 500m Geofence &amp; WebSocket Telemetry</span>
                </h3>
                {wsStatus === 'connected' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>WEBSOCKET LIVE (STREAMING)</span>
                  </span>
                ) : wsStatus === 'connecting' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                    CONNECTING WEBSOCKET...
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    POLLING FALLBACK (3.5s)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{lastWsMessage}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400 font-mono">Assigned: {student.assignedBusNumber}</span>
                {wsPulseCount > 0 && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-emerald-400 font-mono text-[11px] font-bold">
                      {wsPulseCount} Proximity Updates
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick controls: Sound alert toggle & Route simulator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundAlertsEnabled(!soundAlertsEnabled)}
              title={soundAlertsEnabled ? 'Audio alerts ON' : 'Audio alerts MUTED'}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
                soundAlertsEnabled
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">{soundAlertsEnabled ? 'Chime ON' : 'Muted'}</span>
            </button>

            {student && (
              <button
                onClick={() => advanceBusStop(student.assignedBusId)}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
                title="Simulate driver/scanner moving to the next stop"
              >
                <FastForward className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Route Progress</span>
              </button>
            )}
          </div>
        </div>

        {/* 500-Meter Geofence Distance Card & Simulator Toolbar */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isWithinGeofence
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400'
              }`}>
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200">
                    Live Distance to Your Stop ({student.homeStopName}):
                  </span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    isWithinGeofence
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {distanceMeters} meters {isWithinGeofence ? '(Inside 500m Geofence)' : '(Outside Geofence)'}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Bus GPS: <strong>{busCoordinates.lat.toFixed(4)}° N, {busCoordinates.lng.toFixed(4)}° E</strong></span>
                  <span>Stop GPS: <strong>{studentStopCoords.lat.toFixed(4)}° N, {studentStopCoords.lng.toFixed(4)}° E</strong></span>
                </div>
              </div>
            </div>

            {/* Interactive Simulation Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <span className="text-[10px] uppercase font-mono text-zinc-500 mr-1">Test Geofence:</span>
              <button
                onClick={() => simulateDistance(1200)}
                className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-300 transition-colors"
                title="Simulate bus 1.2km away (outside geofence)"
              >
                1.2 km Away
              </button>
              <button
                onClick={() => simulateDistance(420)}
                className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 rounded-lg text-[11px] font-mono text-emerald-300 font-bold transition-colors flex items-center gap-1"
                title="Simulate bus 420m away (triggers 500m geofence toast)"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>420m (Trigger Toast)</span>
              </button>
              <button
                onClick={() => simulateDistance(80)}
                className="px-2.5 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/50 rounded-lg text-[11px] font-mono text-teal-300 transition-colors"
                title="Simulate bus 80m away at the stop"
              >
                80m (Arrived)
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Approach Alert Cards based on Scanner Location */}
        <div className="relative z-10">
          {/* CASE 1: BUS IS 1 STOP AWAY - HIGH PRIORITY ALERT */}
          {stopsAway === 1 && (
            <div className="bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-950 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/40 animate-bounce">
                  <Bell className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-zinc-950 uppercase tracking-wider">
                      ⚡ BUS APPROACHING NOW
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      ETA: ~{liveLocation?.estimatedMinutesToNextStop || 3} mins
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-amber-300 mt-1">
                    {student.assignedBusNumber} is approaching your stop: {student.homeStopName}
                  </h4>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Live scanner telemetry: Departed <strong>{liveLocation?.currentStopName}</strong> at {liveLocation?.lastScanTimestamp}. Please head to the boarding point.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-950/80 px-4 py-3 rounded-xl border border-amber-500/40 text-center sm:text-right shrink-0">
                <span className="text-[10px] font-mono text-zinc-400 block uppercase">Seat Allocation</span>
                <span className="text-sm font-bold font-mono text-amber-400">
                  {student.designatedSeatNumber ? `Seat #${student.designatedSeatNumber}` : 'Open Seating (Route Pending)'}
                </span>
              </div>
            </div>
          )}

          {/* CASE 2: BUS HAS ARRIVED AT STUDENT'S STOP */}
          {stopsAway === 0 && (
            <div className="bg-gradient-to-r from-emerald-500/20 via-zinc-900 to-zinc-950 border-2 border-emerald-500/60 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-zinc-950 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/40">
                  <Navigation className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500 text-zinc-950 uppercase tracking-wider">
                      📍 BUS AT YOUR STOP NOW
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      BOARDING IN PROGRESS
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-emerald-300 mt-1">
                    {student.assignedBusNumber} is at {student.homeStopName}
                  </h4>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Door scanner is active. Hold your Digital ID QR / card to the scanner to verify boarding entry.
                  </p>
                </div>
              </div>

              {onGoToScannerWithCard && (
                <button
                  onClick={() => onGoToScannerWithCard(student.cardId)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/30 shrink-0"
                >
                  Open Door Scanner
                </button>
              )}
            </div>
          )}

          {/* CASE 3: BUS IS MULTIPLE STOPS AWAY */}
          {stopsAway > 1 && (
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">
                      {student.assignedBusNumber} is en route ({stopsAway} stops away)
                    </span>
                    <span className="text-[10px] font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                      ETA: ~{stopsAway * 4} mins
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Current location: <strong>{liveLocation?.currentStopName}</strong> • Next: {liveLocation?.nextStopName}
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px] font-mono text-zinc-400">
                <span>Pickup Time: </span>
                <strong className="text-zinc-200">
                  {assignedBus?.stops.find(s => s.id === student.homeStopId)?.morningPickupTime || '07:15 AM'}
                </strong>
              </div>
            </div>
          )}

          {/* CASE 4: BUS HAS ALREADY PASSED THIS STOP */}
          {stopsAway < 0 && (
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-zinc-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {student.morningBoarded
                    ? `You are checked-in on ${student.assignedBusNumber}${student.designatedSeatNumber ? ` (Seat #${student.designatedSeatNumber})` : ''}. Bus is traveling to campus.`
                    : `Bus ${student.assignedBusNumber} has already serviced ${student.homeStopName} and is en route to campus.`}
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                Campus ETA: 08:00 AM
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left = ID Pass & Route, Right = Seat Map & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Digital ID Pass + Today's Policy Notice */}
        <div className="lg:col-span-5 space-y-6">
          <DigitalIdCard
            student={student}
            assignedBus={assignedBus}
            onQuickScan={onGoToScannerWithCard}
          />

          {/* Symmetrical Morning & Evening Policy Card */}
          <div className="bg-gradient-to-br from-blue-950/40 via-zinc-900 to-zinc-900 border border-blue-900/40 rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-2.5 mb-2.5">
              <Shield className="w-5 h-5 text-blue-400 shrink-0" />
              <h4 className="text-sm font-semibold text-zinc-100">
                Symmetric Round-Trip Seat Guarantee
              </h4>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              By college regulation, whichever bus is assigned for your morning commute (
              <span className="font-semibold text-amber-300">{student.assignedBusNumber}</span>
              ) is strictly reserved for your evening return at 05:00 PM. No student is forced to stand.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block uppercase">Morning Trip</span>
                <span className="text-zinc-200 font-bold">{student.assignedBusNumber}</span>
                <span className="text-[11px] text-emerald-400 block mt-0.5">
                  {student.morningBoarded ? '✓ Boarded' : '○ Scheduled'}
                </span>
              </div>
              <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block uppercase">Evening Trip</span>
                <span className="text-zinc-200 font-bold">{student.assignedBusNumber}</span>
                <span className="text-[11px] text-blue-400 block mt-0.5">
                  {student.eveningBoarded ? '✓ Boarded' : '○ Scheduled'}
                </span>
              </div>
            </div>
          </div>

          {/* Pending Boarding Change Alert if present */}
          {student.pendingChange && (
            <div className="bg-amber-950/40 border border-amber-600/40 rounded-2xl p-4 text-xs text-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Next-Day Boarding Point Scheduled</span>
              </div>
              <p>
                Starting tomorrow ({student.pendingChange.effectiveDate}), your new boarding stop is{' '}
                <strong>{student.pendingChange.newStopName}</strong> on bus{' '}
                <strong>{student.pendingChange.newBusNumber}</strong>.
              </p>
              <p className="text-[11px] text-amber-300/80">
                Today&apos;s trip remains on {student.assignedBusNumber}.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Live Route & Seat Map + Change Stop Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live Bus Status Card */}
          {assignedBus && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-800">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                    Assigned Bus Information
                  </span>
                  <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                    <span>{assignedBus.busNumber}</span>
                    <span className="text-xs font-normal text-zinc-400 font-sans">
                      ({assignedBus.routeName})
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 block">Empty Seats</span>
                    <span className={`text-sm font-mono font-bold ${availableSeats <= 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {availableSeats} of {assignedBus.capacity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stop & Driver Quick Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-4">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase block">Your Boarding Stop</span>
                  <span className="font-semibold text-zinc-200 block truncate">{student.homeStopName}</span>
                  <span className="text-[11px] text-blue-400 mt-1 block">
                    Pickup: {assignedBus.stops.find(s => s.id === student.homeStopId)?.morningPickupTime || '07:15 AM'}
                  </span>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase block">College Driver</span>
                  <span className="font-semibold text-zinc-200 block">{assignedBus.driverName}</span>
                  <span className="text-[11px] text-zinc-400 mt-1 block">{assignedBus.driverPhone}</span>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase block">Campus Bay / Plate</span>
                  <span className="font-semibold text-amber-300 block">{assignedBus.platformNumber}</span>
                  <span className="text-[11px] text-zinc-400 mt-1 block">{assignedBus.plateNumber}</span>
                </div>
              </div>

              {/* Stops Timeline on this Route */}
              <div className="bg-zinc-950/80 rounded-xl p-3 border border-zinc-800">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-2 font-bold">
                  Route Stops &amp; Timings:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  {assignedBus.stops.map((stop) => {
                    const isStudentStop = stop.id === student.homeStopId;
                    const isCurrentBusStop = liveLocation?.currentStopId === stop.id;

                    return (
                      <div
                        key={stop.id}
                        className={`shrink-0 px-3 py-1.5 rounded-lg border text-center transition-all ${
                          isStudentStop
                            ? 'bg-blue-600/20 border-blue-500 text-blue-200 font-semibold ring-1 ring-blue-500'
                            : isCurrentBusStop
                            ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-semibold ring-1 ring-amber-500'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[11px] truncate max-w-[130px]">{stop.name}</span>
                          {isCurrentBusStop && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                          {stop.morningPickupTime}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Visual Bus Seat Map */}
          {assignedBus && (
            <BusSeatMap
              bus={assignedBus}
              highlightSeatNumber={student.designatedSeatNumber}
            />
          )}

          {/* Alternative Buses Notification (When crowded or requested) */}
          {alternatives.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bus className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-zinc-200">
                    Alternative Buses Serving Your Stop ({student.homeStopName})
                  </h4>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  {alternatives.length} Available
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-3">
                If your assigned bus is full or delayed, these college buses also call at your stop and currently have verified empty seats:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {alternatives.map(alt => {
                  const altFree = alt.capacity - alt.currentBoardedCount;
                  return (
                    <div
                      key={alt.id}
                      className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sm text-zinc-100">{alt.busNumber}</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                            {altFree} Seats Left
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 truncate max-w-[180px]">{alt.routeName}</div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{alt.platformNumber}</div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedNewStopId(student.homeStopId);
                          setIsChangingStop(true);
                        }}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        Request for Tomorrow
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Change Boarding Point Section (Strictly Effective Tomorrow) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100">
                    Change Boarding Point
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Strict Policy: Allowed only 1 day in advance (Effective Tomorrow)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChangingStop(!isChangingStop)}
                className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
              >
                {isChangingStop ? 'Cancel' : 'Modify Stop'}
              </button>
            </div>

            {changeStatus.type && (
              <div
                className={`mb-4 p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  changeStatus.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                }`}
              >
                {changeStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">{changeStatus.message}</div>
                  {changeStatus.details && (
                    <div className="mt-1 font-mono text-[11px] text-emerald-300">
                      Target Bus: {changeStatus.details.newBusNumber} • Effective: {changeStatus.details.effectiveDate}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isChangingStop ? (
              <form onSubmit={handleStopChangeSubmit} className="space-y-4">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Advance Booking Enforced</span>
                  </div>
                  <p>
                    Today&apos;s trip on <strong>{student.assignedBusNumber}</strong> cannot be changed to prevent seat double-booking. Your new stop will activate on <strong>{tomorrowStr}</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Select New Boarding Point:
                  </label>
                  <select
                    value={selectedNewStopId}
                    onChange={(e) => setSelectedNewStopId(e.target.value)}
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                  >
                    {ALL_COLLEGE_STOPS.map(stop => (
                      <option key={stop.id} value={stop.id}>
                        {stop.name} ({stop.area})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Security PIN:
                    </label>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      (Demo PIN for {student.name.split(' ')[0]}: <strong className="text-amber-400">{student.pin}</strong>)
                    </span>
                  </div>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="Enter 4-digit PIN"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    required
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500 tracking-widest"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsChangingStop(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <span>Schedule Change for Tomorrow</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-zinc-400">
                Moving house or staying with family? You can shift your boarding stop to any college route point. The algorithm checks available seats on that route to guarantee you get a reserved seat without standing.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
