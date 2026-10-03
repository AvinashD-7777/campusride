import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { BusRoute, Student, BoardingLog, BoardingChangeRequest, ScanVerificationResult, BusLiveLocation } from '../types/bus';
import { INITIAL_BUS_ROUTES, ALL_COLLEGE_STOPS } from '../data/mockRoutes';
import { INITIAL_STUDENTS } from '../data/mockStudents';
import { soundEffects } from '../utils/audio';

export interface BulkStudentRow {
  cardId: string;
  name: string;
  pin: string;
  stopId: string;
  rollNumber?: string;
  department?: string;
  year?: string;
  phone?: string;
}

export interface BulkImportResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: string[];
  allocated: {
    studentName: string;
    cardId: string;
    busNumber: string;
    seatNumber: number;
    stopName: string;
  }[];
}

interface BusContextType {
  buses: BusRoute[];
  students: Student[];
  boardingLogs: BoardingLog[];
  pendingChanges: BoardingChangeRequest[];
  currentTripType: 'Morning' | 'Evening';
  setCurrentTripType: (type: 'Morning' | 'Evening') => void;
  selectedBusId: string;
  setSelectedBusId: (id: string) => void;
  activeStudent: Student | null;
  setActiveStudent: (student: Student | null) => void;
  liveBusLocations: Record<string, BusLiveLocation>;
  advanceBusStop: (busId: string) => void;
  lastPollTimestamp: string;
  verifyAndProcessScan: (busId: string, cardId: string) => ScanVerificationResult;
  requestBoardingChange: (
    studentId: string,
    newStopId: string,
    pin: string
  ) => { success: boolean; message: string; details?: { newBusNumber: string; effectiveDate: string } };
  findAlternativeBuses: (stopId: string, excludeBusId?: string) => BusRoute[];
  resetDailyBoarding: () => void;
  addNewStudent: (studentData: Omit<Student, 'id' | 'designatedSeatNumber' | 'morningBoarded' | 'eveningBoarded'>) => { success: boolean; message: string; student?: Student };
  addMultipleStudents: (records: BulkStudentRow[]) => BulkImportResult;
}

const BusContext = createContext<BusContextType | undefined>(undefined);

const STORAGE_KEYS = {
  BUSES: 'campus_ride_buses_v4',
  STUDENTS: 'campus_ride_students_v4',
  LOGS: 'campus_ride_logs_v4',
  CHANGES: 'campus_ride_changes_v4',
};

export const BusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [buses, setBuses] = useState<BusRoute[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BUSES);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fallback */ }
    }
    return INITIAL_BUS_ROUTES;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50 && parsed.some((s: any) => s.rollNumber === '146611001')) {
          // Ensure designatedSeatNumber is not set
          return parsed.map((s: any) => {
            const { designatedSeatNumber, ...rest } = s;
            return rest;
          });
        }
      } catch { /* fallback */ }
    }
    return INITIAL_STUDENTS;
  });

  const [boardingLogs, setBoardingLogs] = useState<BoardingLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fallback */ }
    }
    return [
      {
        id: 'log-demo-1',
        timestamp: '06:58 AM',
        cardId: '146611031',
        studentName: 'ASHVANTHISHA A',
        rollNumber: '146611031',
        busId: 'bus-1',
        busNumber: 'BUS-01A',
        stopName: 'Tambaram West (Bus Stand)',
        status: 'SUCCESS',
        message: 'Boarded successfully at Tambaram West. Open Seating.',
        tripType: 'Morning',
      },
      {
        id: 'log-demo-2',
        timestamp: '07:16 AM',
        cardId: '146611038',
        studentName: 'AVINASH D',
        rollNumber: '146611038',
        busId: 'bus-1',
        busNumber: 'BUS-01A',
        stopName: 'Chromepet (MIT Gate)',
        status: 'SUCCESS',
        message: 'Boarded successfully at Chromepet. Open Seating.',
        tripType: 'Morning',
      },
    ];
  });

  const [pendingChanges, setPendingChanges] = useState<BoardingChangeRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CHANGES);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fallback */ }
    }
    return [];
  });

  const [currentTripType, setCurrentTripType] = useState<'Morning' | 'Evening'>('Morning');
  const [selectedBusId, setSelectedBusId] = useState<string>('bus-1');
  const [activeStudent, setActiveStudent] = useState<Student | null>(() => {
    return INITIAL_STUDENTS.find(s => s.rollNumber === '146611038') || INITIAL_STUDENTS[0];
  });
  const [lastPollTimestamp, setLastPollTimestamp] = useState<string>('Just now');

  // Live Location Tracker for all buses based on scanner data
  const [liveBusLocations, setLiveBusLocations] = useState<Record<string, BusLiveLocation>>(() => ({
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
    'bus-2': {
      busId: 'bus-2',
      busNumber: 'BUS-01B',
      currentStopIndex: 0,
      currentStopId: 'stop-tbm-3',
      currentStopName: 'Tambaram East (Camp Road)',
      nextStopId: 'stop-sel-1',
      nextStopName: 'Selaiyur (Bharat Engg College)',
      status: 'At Stop / Boarding',
      lastScanTimestamp: '06:55 AM',
      lastScannedStudent: 'Rahul Dravid S.',
      speedKmH: 0,
      estimatedMinutesToNextStop: 6,
    },
    'bus-3': {
      busId: 'bus-3',
      busNumber: 'BUS-02A',
      currentStopIndex: 1,
      currentStopId: 'stop-vel-2',
      currentStopName: 'Kaiveli (Check Post)',
      nextStopId: 'stop-med-1',
      nextStopName: 'Medavakkam Junction',
      status: 'Approaching Stop',
      lastScanTimestamp: '07:10 AM',
      lastScannedStudent: 'Ananya Raghavan',
      speedKmH: 42,
      estimatedMinutesToNextStop: 4,
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
      lastScanTimestamp: '06:52 AM',
      lastScannedStudent: 'Deepak Varma',
      speedKmH: 32,
      estimatedMinutesToNextStop: 4,
    },
    'bus-6': {
      busId: 'bus-6',
      busNumber: 'BUS-04A',
      currentStopIndex: 1,
      currentStopId: 'stop-vad-1',
      currentStopName: 'Vadapalani (Murugan Temple Arch)',
      nextStopId: 'stop-por-1',
      nextStopName: 'Porur Roundabout (Toll Plaza)',
      status: 'Approaching Stop',
      lastScanTimestamp: '07:05 AM',
      lastScannedStudent: 'Siddharth Iyer',
      speedKmH: 35,
      estimatedMinutesToNextStop: 5,
    },
    'bus-7': {
      busId: 'bus-7',
      busNumber: 'BUS-05A',
      currentStopIndex: 1,
      currentStopId: 'stop-thi-1',
      currentStopName: 'Thirumangalam (Flyover Bus Stop)',
      nextStopId: 'stop-mog-1',
      nextStopName: 'Mogappair East (Golden Flats)',
      status: 'Approaching Stop',
      lastScanTimestamp: '07:02 AM',
      lastScannedStudent: 'Divya Bharathi',
      speedKmH: 30,
      estimatedMinutesToNextStop: 4,
    },
    'bus-8': {
      busId: 'bus-8',
      busNumber: 'BUS-06A',
      currentStopIndex: 1,
      currentStopId: 'stop-amb-1',
      currentStopName: 'Ambattur (OT Bus Stand)',
      nextStopId: 'stop-poo-1',
      nextStopName: 'Poonamallee (Bypass Junction)',
      status: 'Approaching Stop',
      lastScanTimestamp: '06:58 AM',
      lastScannedStudent: 'Vigneshwaran M.',
      speedKmH: 36,
      estimatedMinutesToNextStop: 5,
    },
  }));

  // Polling mechanism: polls live scanner telemetry every 3.5 seconds
  useEffect(() => {
    const pollTelemetry = async () => {
      try {
        const res = await fetch('/api/live-status');
        if (res.ok) {
          const data = await res.json();
          if (data && data.locations) {
            setLiveBusLocations(prev => ({
              ...prev,
              ...data.locations,
            }));
          }
        }
      } catch {
        // Fallback to local state if server route is briefly cold
      }
      setLastPollTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    pollTelemetry();
    const interval = setInterval(pollTelemetry, 3500);
    return () => clearInterval(interval);
  }, []);

  // Simulation Helper: Advance bus stop along route to test live approaching alerts
  const advanceBusStop = (busId: string) => {
    const bus = buses.find(b => b.id === busId);
    if (!bus || bus.stops.length === 0) return;

    setLiveBusLocations(prev => {
      const current = prev[busId] || {
        busId,
        busNumber: bus.busNumber,
        currentStopIndex: 0,
        currentStopId: bus.stops[0].id,
        currentStopName: bus.stops[0].name,
      };

      const nextIdx = (current.currentStopIndex + 1) % bus.stops.length;
      const nextNextIdx = (nextIdx + 1) % bus.stops.length;

      const updated: BusLiveLocation = {
        busId,
        busNumber: bus.busNumber,
        currentStopIndex: nextIdx,
        currentStopId: bus.stops[nextIdx].id,
        currentStopName: bus.stops[nextIdx].name,
        nextStopId: bus.stops[nextNextIdx].id,
        nextStopName: bus.stops[nextNextIdx].name,
        status: nextIdx === bus.stops.length - 1 ? 'En Route to Campus' : 'Approaching Stop',
        lastScanTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        speedKmH: 36,
        estimatedMinutesToNextStop: Math.max(1, Math.floor(Math.random() * 4) + 2),
      };

      // Also notify backend if reachable
      try {
        fetch('/api/advance-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bus_id: busId }),
        }).catch(() => {});
      } catch { /* ignore */ }

      return {
        ...prev,
        [busId]: updated,
      };
    });
  };

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BUSES, JSON.stringify(buses));
  }, [buses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(boardingLogs));
  }, [boardingLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHANGES, JSON.stringify(pendingChanges));
  }, [pendingChanges]);

  // Set default active student
  useEffect(() => {
    if (!activeStudent && students.length > 0) {
      setActiveStudent(students[0]);
    }
  }, [students, activeStudent]);

  // Find alternative buses serving a specific stop with available seats
  const findAlternativeBuses = (stopId: string, excludeBusId?: string): BusRoute[] => {
    return buses.filter(b => {
      if (excludeBusId && b.id === excludeBusId) return false;
      const passesStop = b.stops.some(s => s.id === stopId);
      const hasSeats = (b.capacity - b.currentBoardedCount) > 0;
      return passesStop && hasSeats;
    });
  };

  // Main ID card scan verification engine
  const verifyAndProcessScan = (busId: string, rawCardId: string): ScanVerificationResult => {
    const cardId = rawCardId.trim().toUpperCase();
    const currentBus = buses.find(b => b.id === busId);
    const now = new Date();
    const timestampStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (!currentBus) {
      return {
        status: 'NOT_FOUND',
        currentBus: buses[0],
        message: 'Scanner configuration error: Invalid bus selected.',
        timestamp: timestampStr,
      };
    }

    // Find student by Card ID or Roll Number
    const student = students.find(
      s => s.cardId.toUpperCase() === cardId || s.rollNumber.toUpperCase() === cardId
    );

    if (!student) {
      soundEffects.playWrongBus();
      const newLog: BoardingLog = {
        id: 'log-' + Date.now(),
        timestamp: timestampStr,
        cardId,
        studentName: 'Unregistered Card',
        rollNumber: 'N/A',
        busId: currentBus.id,
        busNumber: currentBus.busNumber,
        stopName: 'Bus Entrance',
        status: 'WRONG_BUS',
        message: `Card ${cardId} is not registered in the college transport system!`,
        tripType: currentTripType,
      };
      setBoardingLogs(prev => [newLog, ...prev]);

      return {
        status: 'NOT_FOUND',
        currentBus,
        message: `Card "${cardId}" not found in system. Please see the Transport Coordinator desk.`,
        timestamp: timestampStr,
      };
    }

    const assignedBus = buses.find(b => b.id === student.assignedBusId) || currentBus;

    // RULE 1: Student MUST board their assigned bus (symmetric morning & evening)
    if (student.assignedBusId !== currentBus.id) {
      soundEffects.playWrongBus();
      const alternatives = findAlternativeBuses(student.homeStopId);

      const newLog: BoardingLog = {
        id: 'log-' + Date.now(),
        timestamp: timestampStr,
        cardId: student.cardId,
        studentName: student.name,
        rollNumber: student.rollNumber,
        busId: currentBus.id,
        busNumber: currentBus.busNumber,
        stopName: student.homeStopName,
        status: 'WRONG_BUS',
        message: `WRONG BUS! Student belongs to ${assignedBus.busNumber} (${assignedBus.routeName}). Attempted boarding on ${currentBus.busNumber}.`,
        tripType: currentTripType,
      };
      setBoardingLogs(prev => [newLog, ...prev]);

      return {
        status: 'WRONG_BUS',
        student,
        assignedBus,
        currentBus,
        alternativeBuses: alternatives,
        message: `WRONG BUS! You are registered for ${assignedBus.busNumber} (${assignedBus.routeName}). Platform ${assignedBus.platformNumber}.`,
        timestamp: timestampStr,
      };
    }

    // RULE 2: Check if already scanned on this trip
    const alreadyBoarded = currentTripType === 'Morning' ? student.morningBoarded : student.eveningBoarded;
    if (alreadyBoarded) {
      soundEffects.playWarning();

      const newLog: BoardingLog = {
        id: 'log-' + Date.now(),
        timestamp: timestampStr,
        cardId: student.cardId,
        studentName: student.name,
        rollNumber: student.rollNumber,
        busId: currentBus.id,
        busNumber: currentBus.busNumber,
        stopName: student.homeStopName,
        status: 'DUPLICATE',
        message: `Duplicate scan for ${student.name}. Already boarded at ${student.lastBoardedAt || 'earlier today'}. Seat #${student.designatedSeatNumber} is kept.`,
        tripType: currentTripType,
      };
      setBoardingLogs(prev => [newLog, ...prev]);

      return {
        status: 'DUPLICATE',
        student,
        assignedBus,
        currentBus,
        seatNumber: student.designatedSeatNumber,
        message: `Already boarded on ${currentTripType} trip! Designated Seat #${student.designatedSeatNumber} is confirmed. Seat count not double-deducted.`,
        timestamp: timestampStr,
      };
    }

    // RULE 3: Check if bus is completely full
    if (currentBus.currentBoardedCount >= currentBus.capacity) {
      soundEffects.playWrongBus();
      const alternatives = findAlternativeBuses(student.homeStopId, currentBus.id);

      const newLog: BoardingLog = {
        id: 'log-' + Date.now(),
        timestamp: timestampStr,
        cardId: student.cardId,
        studentName: student.name,
        rollNumber: student.rollNumber,
        busId: currentBus.id,
        busNumber: currentBus.busNumber,
        stopName: student.homeStopName,
        status: 'BUS_FULL',
        message: `Bus ${currentBus.busNumber} is completely full (${currentBus.capacity}/${currentBus.capacity})! No standing allowed. Alternative suggested.`,
        tripType: currentTripType,
      };
      setBoardingLogs(prev => [newLog, ...prev]);

      return {
        status: 'BUS_FULL',
        student,
        assignedBus,
        currentBus,
        alternativeBuses: alternatives,
        message: `BUS FULL! ${currentBus.busNumber} reached maximum safety capacity (${currentBus.capacity} seats). Strictly NO standing allowed!`,
        timestamp: timestampStr,
      };
    }

    // SUCCESSFUL BOARDING!
    soundEffects.playSuccess();

    // Determine seat number: if designated seat is assigned and free, use it; otherwise assign open seat
    let allocatedSeat = student.designatedSeatNumber;
    if (allocatedSeat === undefined || currentBus.occupiedSeatNumbers.includes(allocatedSeat)) {
      for (let s = 1; s <= currentBus.capacity; s++) {
        if (!currentBus.occupiedSeatNumbers.includes(s)) {
          allocatedSeat = s;
          break;
        }
      }
    }
    const finalSeatNumber = allocatedSeat ?? 1;

    const updatedOccupied: number[] = [...currentBus.occupiedSeatNumbers, finalSeatNumber].sort((a, b) => a - b);
    const newBoardedCount = currentBus.currentBoardedCount + 1;

    // Update Bus
    setBuses(prev =>
      prev.map(b =>
        b.id === currentBus.id
          ? {
              ...b,
              currentBoardedCount: newBoardedCount,
              occupiedSeatNumbers: updatedOccupied,
              status: newBoardedCount >= b.capacity ? 'Full' : 'Boarding',
            }
          : b
      )
    );

    // Update Student
    setStudents(prev =>
      prev.map(s =>
        s.id === student.id
          ? {
              ...s,
              morningBoarded: currentTripType === 'Morning' ? true : s.morningBoarded,
              eveningBoarded: currentTripType === 'Evening' ? true : s.eveningBoarded,
              lastBoardedAt: timestampStr,
            }
          : s
      )
    );

    // If active student is this student, update it in view too
    setActiveStudent(prev => (prev?.id === student.id ? { ...prev, lastBoardedAt: timestampStr } : prev));

    const newLog: BoardingLog = {
      id: 'log-' + Date.now(),
      timestamp: timestampStr,
      cardId: student.cardId,
      studentName: student.name,
      rollNumber: student.rollNumber,
      busId: currentBus.id,
      busNumber: currentBus.busNumber,
      stopName: student.homeStopName,
      status: 'SUCCESS',
      message: `Verified Right Bus! Boarding confirmed (Open Seating). Seats remaining: ${currentBus.capacity - newBoardedCount}/${currentBus.capacity}.`,
      tripType: currentTripType,
    };
    setBoardingLogs(prev => [newLog, ...prev]);

    // Live Telemetry: update bus location based on scanned student's stop
    const stopIdx = currentBus.stops.findIndex(s => s.id === student.homeStopId);
    if (stopIdx !== -1) {
      setLiveBusLocations(prev => ({
        ...prev,
        [currentBus.id]: {
          busId: currentBus.id,
          busNumber: currentBus.busNumber,
          currentStopIndex: stopIdx,
          currentStopId: student.homeStopId,
          currentStopName: student.homeStopName,
          nextStopId: currentBus.stops[stopIdx + 1]?.id,
          nextStopName: currentBus.stops[stopIdx + 1]?.name,
          status: stopIdx === currentBus.stops.length - 1 ? 'En Route to Campus' : 'Approaching Stop',
          lastScanTimestamp: timestampStr,
          lastScannedStudent: student.name,
          speedKmH: 34,
          estimatedMinutesToNextStop: 3,
        },
      }));
    }

    return {
      status: 'SUCCESS',
      student: { ...student },
      assignedBus: currentBus,
      currentBus: { ...currentBus, currentBoardedCount: newBoardedCount, occupiedSeatNumbers: updatedOccupied },
      message: `BOARDING VERIFIED! Welcome, ${student.name}. Boarding approved (Open Seating / Route Pending). Available seats: ${currentBus.capacity - newBoardedCount}.`,
      timestamp: timestampStr,
    };
  };

  // RULE: Change boarding point MUST strictly be scheduled for tomorrow (one day before boarding)
  const requestBoardingChange = (
    studentId: string,
    newStopId: string,
    enteredPin: string
  ): { success: boolean; message: string; details?: { newBusNumber: string; effectiveDate: string } } => {
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return { success: false, message: 'Student record not found.' };
    }

    // Verify PIN
    if (student.pin !== enteredPin.trim()) {
      return { success: false, message: 'Invalid security PIN! Boarding point change requires correct 4-digit PIN.' };
    }

    const newStop = ALL_COLLEGE_STOPS.find(s => s.id === newStopId);
    if (!newStop) {
      return { success: false, message: 'Selected bus stop is invalid.' };
    }

    if (student.homeStopId === newStopId) {
      return { success: false, message: 'This is already your designated boarding point.' };
    }

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const tomorrowFormatted = tomorrow.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // Check if student's current bus already passes through the new stop
    const currentBus = buses.find(b => b.id === student.assignedBusId);
    let targetBus: BusRoute | undefined;

    if (currentBus && currentBus.stops.some(s => s.id === newStopId)) {
      targetBus = currentBus;
    } else {
      // Find all buses passing through newStopId
      const eligibleBuses = buses.filter(b => b.stops.some(s => s.id === newStopId));
      if (eligibleBuses.length === 0) {
        return { success: false, message: `No college buses currently serve "${newStop.name}". Please select an official route stop.` };
      }

      // Choose the bus with the most available capacity (capacity - totalAssignedStudents)
      eligibleBuses.sort((a, b) => (b.capacity - b.totalAssignedStudents) - (a.capacity - a.totalAssignedStudents));
      targetBus = eligibleBuses[0];

      if (targetBus.totalAssignedStudents >= targetBus.capacity) {
        return {
          success: false,
          message: `All buses serving "${newStop.name}" are completely booked for tomorrow (${targetBus.capacity}/${targetBus.capacity} seats). Change refused to prevent standing.`,
        };
      }
    }

    const changeRequest: BoardingChangeRequest = {
      id: 'req-' + Date.now(),
      studentId: student.id,
      studentName: student.name,
      cardId: student.cardId,
      currentStopName: student.homeStopName,
      currentBusNumber: student.assignedBusNumber,
      newStopId: newStop.id,
      newStopName: newStop.name,
      newBusId: targetBus.id,
      newBusNumber: targetBus.busNumber,
      effectiveDate: tomorrowFormatted,
      requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Scheduled for Tomorrow',
    };

    // Update pending changes
    setPendingChanges(prev => [changeRequest, ...prev]);

    // Update student pending change record
    setStudents(prev =>
      prev.map(s =>
        s.id === student.id
          ? {
              ...s,
              pendingChange: {
                newStopId: newStop.id,
                newStopName: newStop.name,
                newBusId: targetBus!.id,
                newBusNumber: targetBus!.busNumber,
                effectiveDate: tomorrowFormatted,
                requestedAt: changeRequest.requestedAt,
              },
            }
          : s
      )
    );

    // Also update active student if viewing
    setActiveStudent(prev =>
      prev?.id === student.id
        ? {
            ...prev,
            pendingChange: {
              newStopId: newStop.id,
              newStopName: newStop.name,
              newBusId: targetBus!.id,
              newBusNumber: targetBus!.busNumber,
              effectiveDate: tomorrowFormatted,
              requestedAt: changeRequest.requestedAt,
            },
          }
        : prev
    );

    return {
      success: true,
      message: `Boarding point change confirmed! Effective starting tomorrow (${tomorrowFormatted}). You are allocated to ${targetBus.busNumber}. Today's bus remains ${student.assignedBusNumber}.`,
      details: {
        newBusNumber: targetBus.busNumber,
        effectiveDate: tomorrowFormatted,
      },
    };
  };

  const addNewStudent = (
    studentData: Omit<Student, 'id' | 'designatedSeatNumber' | 'morningBoarded' | 'eveningBoarded'>
  ): { success: boolean; message: string; student?: Student } => {
    // Find stop
    const stop = ALL_COLLEGE_STOPS.find(s => s.id === studentData.homeStopId);
    if (!stop) return { success: false, message: 'Invalid stop selected' };

    // Find best bus passing this stop
    const eligibleBuses = buses.filter(b => b.stops.some(s => s.id === studentData.homeStopId));
    if (eligibleBuses.length === 0) {
      return { success: false, message: 'No college bus currently serves this stop.' };
    }

    // Pick bus with most empty allocated seats
    eligibleBuses.sort((a, b) => (b.capacity - b.totalAssignedStudents) - (a.capacity - a.totalAssignedStudents));
    const assignedBus = eligibleBuses[0];

    if (assignedBus.totalAssignedStudents >= assignedBus.capacity) {
      return { success: false, message: `All buses passing through ${stop.name} are already at maximum capacity (${assignedBus.capacity} seats).` };
    }

    const newStudent: Student = {
      ...studentData,
      id: 'stu-' + Date.now(),
      homeStopName: stop.name,
      assignedBusId: assignedBus.id,
      assignedBusNumber: assignedBus.busNumber,
      designatedSeatNumber: assignedBus.totalAssignedStudents + 1,
      morningBoarded: false,
      eveningBoarded: false,
    };

    setStudents(prev => [newStudent, ...prev]);
    setBuses(prev =>
      prev.map(b =>
        b.id === assignedBus.id ? { ...b, totalAssignedStudents: b.totalAssignedStudents + 1 } : b
      )
    );

    return {
      success: true,
      message: `Student registered successfully! Auto-allocated to ${assignedBus.busNumber} with Designated Seat #${newStudent.designatedSeatNumber}.`,
      student: newStudent,
    };
  };

  const addMultipleStudents = (records: BulkStudentRow[]): BulkImportResult => {
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];
    const allocated: BulkImportResult['allocated'] = [];
    const newStudents: Student[] = [];

    // Clone buses state for tracking allocation counts across the batch
    const tempBuses = buses.map(b => ({ ...b }));
    const existingCardIds = new Set(students.map(s => s.cardId.toUpperCase()));

    records.forEach((row, index) => {
      const rowNum = index + 1;
      const cleanCardId = row.cardId?.trim().toUpperCase();
      const cleanName = row.name?.trim();
      const cleanPin = row.pin?.trim() || '1234';
      const rawStopId = row.stopId?.trim();

      if (!cleanCardId) {
        failureCount++;
        errors.push(`Row ${rowNum}: Missing card_id.`);
        return;
      }

      if (!cleanName) {
        failureCount++;
        errors.push(`Row ${rowNum} (${cleanCardId}): Missing student name.`);
        return;
      }

      if (existingCardIds.has(cleanCardId)) {
        failureCount++;
        errors.push(`Row ${rowNum} (${cleanCardId}): Card ID already registered in the system.`);
        return;
      }

      // Flexible stop resolution: by stop ID (stop-tbm-1), by 1-based index (1, 2...), or by name match
      let targetStop = ALL_COLLEGE_STOPS.find(s => s.id.toLowerCase() === rawStopId?.toLowerCase());
      if (!targetStop && !isNaN(Number(rawStopId))) {
        const num = Number(rawStopId);
        if (num >= 1 && num <= ALL_COLLEGE_STOPS.length) {
          targetStop = ALL_COLLEGE_STOPS[num - 1];
        }
      }
      if (!targetStop && rawStopId) {
        targetStop = ALL_COLLEGE_STOPS.find(s =>
          s.name.toLowerCase().includes(rawStopId.toLowerCase()) ||
          s.area.toLowerCase().includes(rawStopId.toLowerCase())
        );
      }

      if (!targetStop) {
        failureCount++;
        errors.push(`Row ${rowNum} (${cleanCardId}): Stop ID "${rawStopId}" not found in college bus stops list.`);
        return;
      }

      // Find eligible buses passing this stop
      const eligibleBuses = tempBuses.filter(b => b.stops.some(s => s.id === targetStop!.id));
      if (eligibleBuses.length === 0) {
        failureCount++;
        errors.push(`Row ${rowNum} (${cleanName}): No college bus routes serve stop "${targetStop.name}".`);
        return;
      }

      // Sort by available capacity
      eligibleBuses.sort((a, b) => (b.capacity - b.totalAssignedStudents) - (a.capacity - a.totalAssignedStudents));
      const chosenBus = eligibleBuses[0];

      if (chosenBus.totalAssignedStudents >= chosenBus.capacity) {
        failureCount++;
        errors.push(`Row ${rowNum} (${cleanName}): Bus ${chosenBus.busNumber} at stop "${targetStop.name}" is completely booked (${chosenBus.capacity} seats).`);
        return;
      }

      // Allocate seat
      chosenBus.totalAssignedStudents += 1;
      const designatedSeat = chosenBus.totalAssignedStudents;

      const createdStudent: Student = {
        id: 'stu-bulk-' + Date.now() + '-' + index,
        cardId: cleanCardId,
        rollNumber: row.rollNumber?.trim().toUpperCase() || cleanCardId,
        name: cleanName,
        department: row.department?.trim() || 'College of Engineering',
        year: row.year?.trim() || '2026 Batch',
        phone: row.phone?.trim() || '+91 98400 ' + Math.floor(10000 + Math.random() * 90000),
        email: `${cleanCardId.toLowerCase()}@college.edu`,
        pin: cleanPin,
        homeStopId: targetStop.id,
        homeStopName: targetStop.name,
        assignedBusId: chosenBus.id,
        assignedBusNumber: chosenBus.busNumber,
        designatedSeatNumber: designatedSeat,
        morningBoarded: false,
        eveningBoarded: false,
      };

      existingCardIds.add(cleanCardId);
      newStudents.push(createdStudent);
      allocated.push({
        studentName: cleanName,
        cardId: cleanCardId,
        busNumber: chosenBus.busNumber,
        seatNumber: designatedSeat,
        stopName: targetStop.name,
      });
      successCount++;
    });

    if (newStudents.length > 0) {
      setStudents(prev => [...newStudents, ...prev]);
      setBuses(tempBuses);
    }

    return {
      totalProcessed: records.length,
      successCount,
      failureCount,
      errors,
      allocated,
    };
  };

  const resetDailyBoarding = () => {
    setStudents(prev =>
      prev.map(s => ({
        ...s,
        morningBoarded: false,
        eveningBoarded: false,
        lastBoardedAt: undefined,
      }))
    );

    setBuses(prev =>
      prev.map(b => ({
        ...b,
        currentBoardedCount: 0,
        occupiedSeatNumbers: [],
        status: 'Boarding',
      }))
    );

    setBoardingLogs([]);
    if (activeStudent) {
      setActiveStudent(prev => prev ? { ...prev, morningBoarded: false, eveningBoarded: false, lastBoardedAt: undefined } : null);
    }
  };

  return (
    <BusContext.Provider
      value={{
        buses,
        students,
        boardingLogs,
        pendingChanges,
        currentTripType,
        setCurrentTripType,
        selectedBusId,
        setSelectedBusId,
        activeStudent,
        setActiveStudent,
        liveBusLocations,
        advanceBusStop,
        lastPollTimestamp,
        verifyAndProcessScan,
        requestBoardingChange,
        findAlternativeBuses,
        resetDailyBoarding,
        addNewStudent,
        addMultipleStudents,
      }}
    >
      {children}
    </BusContext.Provider>
  );
};

export const useBus = (): BusContextType => {
  const context = useContext(BusContext);
  if (!context) {
    throw new Error('useBus must be used within a BusProvider');
  }
  return context;
};
