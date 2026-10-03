import React, { useState, useEffect, useRef } from 'react';
import { useBus } from '../context/BusContext';
import { ScanVerificationResult, Student } from '../types/bus';
import { BusSeatMap } from './BusSeatMap';
import {
  Scan,
  Camera,
  Keyboard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Volume2,
  Users,
  Bus,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DoorScannerProps {
  initialCardId?: string;
}

export const DoorScanner: React.FC<DoorScannerProps> = ({ initialCardId }) => {
  const {
    buses,
    students,
    selectedBusId,
    setSelectedBusId,
    currentTripType,
    setCurrentTripType,
    verifyAndProcessScan,
    boardingLogs,
    resetDailyBoarding,
  } = useBus();

  const [inputCardId, setInputCardId] = useState(initialCardId || '');
  const [activeTab, setActiveTab] = useState<'simulator' | 'camera' | 'usb'>('simulator');
  const [lastResult, setLastResult] = useState<ScanVerificationResult | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const usbInputRef = useRef<HTMLInputElement | null>(null);

  const activeBus = buses.find(b => b.id === selectedBusId) || buses[0];
  const seatsAvailable = Math.max(0, activeBus.capacity - activeBus.currentBoardedCount);

  // Auto-focus USB input when USB tab selected
  useEffect(() => {
    if (activeTab === 'usb') {
      usbInputRef.current?.focus();
    }
  }, [activeTab]);

  // Handle camera start/stop
  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported in this browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera permission denied or camera not found.';
      setCameraError(msg + ' Please use the Test Simulator or USB scanner mode.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const triggerScan = (cardId: string) => {
    if (!cardId.trim()) return;
    const result = verifyAndProcessScan(activeBus.id, cardId.trim());
    setLastResult(result);
    setInputCardId('');

    if (result.status === 'SUCCESS') {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10b981', '#3b82f6', '#fbbf24'],
        });
      } catch {
        // Confetti optional
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerScan(inputCardId);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Scanner Kiosk Header Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
          {/* Station Identity */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
              <Scan className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-100">
                  Door ID Card Scanner Kiosk
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  ONLINE • LIVE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Verifies assigned morning/evening bus, reserves seat, updates live headcount
              </p>
            </div>
          </div>

          {/* Bus Selector & Trip Type Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Trip Type Toggle (Morning vs Evening) */}
            <div className="bg-zinc-950 p-1 rounded-2xl border border-zinc-800 flex items-center">
              <button
                type="button"
                onClick={() => setCurrentTripType('Morning')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  currentTripType === 'Morning'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🌅 Morning Trip
              </button>
              <button
                type="button"
                onClick={() => setCurrentTripType('Evening')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  currentTripType === 'Evening'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🌆 Evening Trip
              </button>
            </div>

            {/* Active Bus Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono hidden sm:inline">This Bus:</span>
              <select
                value={selectedBusId}
                onChange={(e) => {
                  setSelectedBusId(e.target.value);
                  setLastResult(null);
                }}
                className="py-2 px-3.5 bg-zinc-950 border-2 border-emerald-500/40 text-emerald-300 font-mono font-bold rounded-2xl text-xs focus:outline-none focus:border-emerald-400 cursor-pointer shadow-inner"
              >
                {buses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.busNumber} • {b.routeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Today's Runs */}
            <button
              onClick={resetDailyBoarding}
              title="Reset all scans for today to test again"
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Run</span>
            </button>
          </div>
        </div>

        {/* Live Headcount & Available Seats Banner */}
        <div className="mt-5 pt-4 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800/80">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Total Seats</span>
            <span className="text-xl font-bold font-mono text-zinc-100">{activeBus.capacity}</span>
          </div>

          <div className="bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800/80">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Boarded Students</span>
            <span className="text-xl font-bold font-mono text-blue-400">{activeBus.currentBoardedCount}</span>
          </div>

          <div className="bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800/80">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Empty Seats Available</span>
            <span className={`text-xl font-bold font-mono ${seatsAvailable === 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {seatsAvailable}
            </span>
          </div>

          <div className="bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800/80">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Safety Status</span>
            <span className={`text-xs font-mono font-bold block mt-1 ${seatsAvailable === 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {seatsAvailable === 0 ? '🚫 BUS FULL (NO STANDING)' : '✓ ALLOCATED SEATING'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Scanner Feedback Screen + Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Big Hardware Visual Screen */}
        <div className="lg:col-span-7 space-y-6">
          {/* HUGE STATUS SCREEN (Visual Feedback for Conductor / Student) */}
          <div className="relative rounded-3xl overflow-hidden border-2 border-zinc-700 bg-zinc-950 shadow-2xl p-6 sm:p-8 min-h-[300px] flex flex-col justify-center">
            {/* If no scan yet */}
            {!lastResult && (
              <div className="text-center py-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto animate-pulse">
                  <Scan className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-zinc-200">
                  Ready to Scan Student ID Card
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Hold student ID card to the scanner, scan via camera, or select a test student below to test verification.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800 text-[11px] font-mono text-zinc-400">
                  <span>Current Bus:</span>
                  <strong className="text-emerald-400">{activeBus.busNumber}</strong>
                  <span>• Trip:</span>
                  <strong className="text-amber-400">{currentTripType}</strong>
                </div>
              </div>
            )}

            {/* GREEN: RIGHT BUS SUCCESS */}
            {lastResult && lastResult.status === 'SUCCESS' && (
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 shrink-0">
                    <CheckCircle className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                      ✓ RIGHT BUS • VERIFIED
                    </span>
                    <h2 className="text-2xl font-black text-emerald-400 mt-1">
                      BOARDING APPROVED
                    </h2>
                  </div>
                </div>

                {lastResult.student && (
                  <div className="bg-zinc-900/90 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-inner">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                      <div className="flex items-center gap-3">
                        <img
                          src={lastResult.student.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                          alt={lastResult.student.name}
                          className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-400"
                        />
                        <div>
                          <h4 className="text-base font-bold text-zinc-100">{lastResult.student.name}</h4>
                          <p className="text-xs font-mono text-blue-400">{lastResult.student.rollNumber} • {lastResult.student.department}</p>
                          <p className="text-xs text-zinc-400">Stop: {lastResult.student.homeStopName}</p>
                        </div>
                      </div>

                      {/* Designated Seat Number Announcement */}
                      <div className="text-center sm:text-right bg-emerald-950/60 border border-emerald-500/50 p-3 rounded-xl min-w-[130px]">
                        <span className="text-[10px] font-mono text-emerald-300 block uppercase">
                          {lastResult.seatNumber ? 'Designated Seat' : 'Seat Allocation'}
                        </span>
                        <span className={`font-black font-mono text-emerald-400 ${lastResult.seatNumber ? 'text-3xl' : 'text-sm'}`}>
                          {lastResult.seatNumber ? `#${lastResult.seatNumber}` : 'Open Seating (Route Pending)'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 font-mono">
                      <span>Trip: {currentTripType}</span>
                      <span className="text-emerald-400 font-bold">
                        Seats Left: {seatsAvailable} / {activeBus.capacity}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RED: WRONG BUS ALERT */}
            {lastResult && lastResult.status === 'WRONG_BUS' && (
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 shrink-0 animate-bounce">
                    <XCircle className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40">
                      ✕ WRONG BUS ALERT • DO NOT BOARD
                    </span>
                    <h2 className="text-2xl font-black text-rose-400 mt-1">
                      INCORRECT BUS
                    </h2>
                  </div>
                </div>

                <div className="bg-rose-950/40 border-2 border-rose-500/60 rounded-2xl p-4 sm:p-5 text-zinc-200 space-y-4">
                  {lastResult.student && (
                    <div className="flex items-center gap-3 pb-3 border-b border-rose-900/60">
                      <img
                        src={lastResult.student.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                        alt={lastResult.student.name}
                        className="w-12 h-12 rounded-xl object-cover border border-rose-400"
                      />
                      <div>
                        <h4 className="text-base font-bold text-zinc-100">{lastResult.student.name}</h4>
                        <p className="text-xs font-mono text-zinc-300">{lastResult.student.rollNumber}</p>
                        <p className="text-xs text-rose-300">Home Stop: {lastResult.student.homeStopName}</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-zinc-950 p-4 rounded-xl border border-rose-800/60">
                    <p className="text-xs text-rose-300 uppercase font-mono font-bold mb-1">
                      You are trying to board: {activeBus.busNumber} ({activeBus.routeName})
                    </p>
                    <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2 mt-2">
                      <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>PLEASE BOARD YOUR DESIGNATED BUS:</span>
                    </div>
                    <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-lg font-mono font-black text-amber-300">
                          {lastResult.assignedBus?.busNumber}
                        </div>
                        <div className="text-xs text-zinc-300">
                          {lastResult.assignedBus?.routeName}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono text-zinc-400 block">Platform</span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {lastResult.assignedBus?.platformNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* YELLOW: DUPLICATE SCAN */}
            {lastResult && lastResult.status === 'DUPLICATE' && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                    <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                      ⚠ CARD ALREADY SCANNED
                    </span>
                    <h2 className="text-2xl font-black text-amber-400 mt-1">
                      DUPLICATE SCAN PREVENTED
                    </h2>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-4 text-xs text-zinc-300 space-y-2">
                  <p className="font-semibold text-zinc-200">{lastResult.message}</p>
                  <p className="text-zinc-400">
                    The seat count was NOT decremented again. The student has already secured designated Seat #{lastResult.seatNumber}.
                  </p>
                </div>
              </div>
            )}

            {/* FULL BUS ALERT */}
            {lastResult && lastResult.status === 'BUS_FULL' && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                      BUS AT FULL CAPACITY
                    </span>
                    <h2 className="text-2xl font-black text-rose-400 mt-1">
                      NO STANDING PASSENGERS
                    </h2>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-300">
                  <p className="mb-2">
                    Bus {activeBus.busNumber} has reached all {activeBus.capacity} seats. Under safety guidelines, students may not board without a seated spot.
                  </p>
                  {lastResult.alternativeBuses && lastResult.alternativeBuses.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <span className="font-semibold text-amber-400 block font-mono">
                        Recommended Alternative Buses at this stop:
                      </span>
                      {lastResult.alternativeBuses.map(alt => (
                        <div key={alt.id} className="p-2 bg-zinc-950 rounded border border-zinc-800 flex justify-between">
                          <span className="font-mono font-bold text-zinc-200">{alt.busNumber}</span>
                          <span className="text-emerald-400 font-mono">
                            {alt.capacity - alt.currentBoardedCount} free seats ({alt.platformNumber})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* UNREGISTERED CARD */}
            {lastResult && lastResult.status === 'NOT_FOUND' && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                      CARD NOT FOUND
                    </span>
                    <h2 className="text-2xl font-black text-zinc-200 mt-1">
                      UNREGISTERED ID
                    </h2>
                  </div>
                </div>
                <p className="text-xs text-zinc-400">{lastResult.message}</p>
              </div>
            )}
          </div>

          {/* Scanner Input Modes Tabs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('simulator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'simulator'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Instant Test Taps</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'camera'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Phone Camera</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('usb')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'usb'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>USB Barcode / RFID Reader</span>
              </button>
            </div>

            {/* TAB 1: ONE-CLICK QUICK TEST SIMULATOR */}
            {activeTab === 'simulator' && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Click any test scenario below to simulate tapping physical RFID or Barcode cards on <strong>{activeBus.busNumber}</strong>:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Students assigned to THIS bus */}
                  {students
                    .filter(s => s.assignedBusId === activeBus.id)
                    .slice(0, 2)
                    .map(s => (
                      <button
                        key={s.id}
                        onClick={() => triggerScan(s.cardId)}
                        className="p-3 bg-zinc-950 hover:bg-emerald-950/30 border border-emerald-900/40 hover:border-emerald-500/50 rounded-xl text-left transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-100 group-hover:text-emerald-300">
                            {s.name}
                          </span>
                          <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                            Right Bus
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          Card: {s.cardId} • Stop: {s.homeStopName}
                        </div>
                      </button>
                    ))}

                  {/* Student assigned to DIFFERENT bus (Wrong Bus test!) */}
                  {students
                    .filter(s => s.assignedBusId !== activeBus.id)
                    .slice(0, 2)
                    .map(s => (
                      <button
                        key={s.id}
                        onClick={() => triggerScan(s.cardId)}
                        className="p-3 bg-zinc-950 hover:bg-rose-950/30 border border-rose-900/40 hover:border-rose-500/50 rounded-xl text-left transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-100 group-hover:text-rose-300">
                            {s.name}
                          </span>
                          <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded">
                            Wrong Bus Test
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          Assigned to: {s.assignedBusNumber}
                        </div>
                      </button>
                    ))}
                </div>

                {/* Manual Card ID Input */}
                <form onSubmit={handleManualSubmit} className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter or type Card ID (e.g. STU-1001 or 2024CS101)..."
                    value={inputCardId}
                    onChange={(e) => setInputCardId(e.target.value)}
                    className="flex-1 py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-md shadow-emerald-600/20"
                  >
                    Scan ID
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: LIVE CAMERA SCANNER */}
            {activeTab === 'camera' && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Mount an old Android or iPhone with Chrome at the bus entrance. The camera automatically reads QR codes from student ID passes or phone screens.
                </p>

                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-w-md mx-auto border-2 border-zinc-700 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Target Crosshair */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-2xl relative">
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-400/60 shadow-lg shadow-emerald-400 animate-pulse" />
                    </div>
                  </div>

                  {cameraError && (
                    <div className="absolute inset-0 bg-zinc-950/90 p-4 flex flex-col items-center justify-center text-center text-xs text-rose-300">
                      <AlertTriangle className="w-8 h-8 text-rose-400 mb-2" />
                      <p>{cameraError}</p>
                    </div>
                  )}
                </div>

                <div className="text-center text-xs text-zinc-400">
                  <span>Point camera at any Student Digital ID QR code (from Student Portal).</span>
                </div>
              </div>
            )}

            {/* TAB 3: USB BARCODE / KEYBOARD WEDGE SCANNER */}
            {activeTab === 'usb' && (
              <div className="space-y-4">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-1">
                  <p className="font-semibold text-blue-400">USB Handheld Barcode / RFID Reader Listener</p>
                  <p className="text-zinc-400">
                    Connect any 1D/2D USB barcode gun or USB RFID reader (HID keyboard mode). When scanned, the reader automatically types the card ID and presses Enter.
                  </p>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="relative">
                    <input
                      ref={usbInputRef}
                      type="text"
                      autoFocus
                      placeholder="Waiting for hardware scanner input... (auto-submits on Enter)"
                      value={inputCardId}
                      onChange={(e) => setInputCardId(e.target.value)}
                      className="w-full py-3 pl-4 pr-12 bg-zinc-950 border-2 border-blue-500/50 rounded-xl font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-400"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500 font-mono">
                    Keep cursor in this box while scanning cards at the door.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Seat Map of this bus & Real-time Boarding Manifest */}
        <div className="lg:col-span-5 space-y-6">
          <BusSeatMap
            bus={activeBus}
            highlightSeatNumber={lastResult?.status === 'SUCCESS' ? lastResult.seatNumber : undefined}
          />

          {/* Live Door Boarding Log */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
              <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Live Door Boarding Activity</span>
              </h4>
              <span className="text-xs font-mono text-zinc-400">
                {boardingLogs.length} Scans Today
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {boardingLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500">
                  No cards scanned yet today.
                </div>
              ) : (
                boardingLogs.slice(0, 10).map(log => {
                  let badge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                  if (log.status === 'WRONG_BUS') badge = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
                  if (log.status === 'DUPLICATE') badge = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                  if (log.status === 'BUS_FULL') badge = 'bg-purple-500/20 text-purple-400 border-purple-500/30';

                  return (
                    <div
                      key={log.id}
                      className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80 text-xs flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-200 truncate">{log.studentName}</span>
                          <span className="text-[10px] font-mono text-zinc-400">({log.cardId})</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">{log.message}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border block ${badge}`}>
                          {log.status}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                          {log.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
