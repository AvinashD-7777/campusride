export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface BusStop {
  id: string;
  name: string;
  area: string;
  morningPickupTime: string; // e.g. "07:15 AM"
  eveningDropTime: string;   // e.g. "05:45 PM"
  distanceKm: number;
  latitude?: number;
  longitude?: number;
}

export interface BusRoute {
  id: string;
  busNumber: string;         // e.g. "BUS-01A"
  routeName: string;         // e.g. "Tambaram to Campus Express"
  driverName: string;
  driverPhone: string;
  plateNumber: string;
  capacity: number;          // 50 to 60 seats (e.g. 54)
  totalAssignedStudents: number;
  currentBoardedCount: number;
  stops: BusStop[];
  occupiedSeatNumbers: number[]; // e.g. [1, 2, 4, 7...]
  platformNumber: string;
  status: 'On Time' | 'Boarding' | 'Departed' | 'Full';
}

export interface Student {
  id: string;
  cardId: string;            // Scanned ID card value (e.g. "STU-1001" or RFID UID "E2 80 68 31")
  rollNumber: string;        // e.g. "2024CS104"
  name: string;
  department: string;
  year: string;
  phone: string;
  email: string;
  pin: string;               // 4-digit PIN for security when changing boarding point
  homeStopId: string;
  homeStopName: string;
  assignedBusId: string;     // Same bus for morning and evening!
  assignedBusNumber: string;
  designatedSeatNumber?: number;
  morningBoarded: boolean;
  eveningBoarded: boolean;
  lastBoardedAt?: string;
  avatarUrl?: string;
  pendingChange?: {
    newStopId: string;
    newStopName: string;
    newBusId: string;
    newBusNumber: string;
    effectiveDate: string;   // Format "YYYY-MM-DD" (must be tomorrow)
    requestedAt: string;
  };
}

export interface BoardingLog {
  id: string;
  timestamp: string;
  cardId: string;
  studentName: string;
  rollNumber: string;
  busId: string;
  busNumber: string;
  stopName: string;
  status: 'SUCCESS' | 'WRONG_BUS' | 'DUPLICATE' | 'BUS_FULL';
  message: string;
  tripType: 'Morning' | 'Evening';
}

export interface BoardingChangeRequest {
  id: string;
  studentId: string;
  studentName: string;
  cardId: string;
  currentStopName: string;
  currentBusNumber: string;
  newStopId: string;
  newStopName: string;
  newBusId: string;
  newBusNumber: string;
  effectiveDate: string; // tomorrow's date
  requestedAt: string;
  status: 'Scheduled for Tomorrow';
}

export type ScanVerificationResult = {
  status: 'SUCCESS' | 'WRONG_BUS' | 'DUPLICATE' | 'BUS_FULL' | 'NOT_FOUND';
  student?: Student;
  assignedBus?: BusRoute;
  currentBus: BusRoute;
  seatNumber?: number;
  message: string;
  alternativeBuses?: BusRoute[];
  timestamp: string;
};

export interface BusLiveLocation {
  busId: string;
  busNumber: string;
  currentStopIndex: number;
  currentStopId: string;
  currentStopName: string;
  nextStopId?: string;
  nextStopName?: string;
  status: 'Departed Previous Stop' | 'Approaching Stop' | 'At Stop / Boarding' | 'En Route to Campus';
  lastScanTimestamp: string;
  lastScannedStudent?: string;
  speedKmH: number;
  estimatedMinutesToNextStop: number;
  coordinates?: GeoCoordinates;
  distanceToStopMeters?: number;
}

