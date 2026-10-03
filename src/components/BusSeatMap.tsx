import React from 'react';
import { BusRoute } from '../types/bus';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface BusSeatMapProps {
  bus: BusRoute;
  highlightSeatNumber?: number;
  interactive?: boolean;
}

export const BusSeatMap: React.FC<BusSeatMapProps> = ({
  bus,
  highlightSeatNumber,
}) => {
  const capacity = bus.capacity; // e.g. 54 or 56
  const freeSeats = Math.max(0, capacity - bus.currentBoardedCount);
  const occupancyPercent = Math.round((bus.currentBoardedCount / capacity) * 100);

  // Generate seat grid: 4 seats per row (2 left, 2 right) with middle aisle
  // Total rows = Math.ceil(capacity / 4)
  const rowsCount = Math.ceil(capacity / 4);
  const rows: { rowNum: number; leftSeats: number[]; rightSeats: number[] }[] = [];

  let currentSeat = 1;
  for (let r = 1; r <= rowsCount; r++) {
    const left1 = currentSeat <= capacity ? currentSeat++ : null;
    const left2 = currentSeat <= capacity ? currentSeat++ : null;
    const right1 = currentSeat <= capacity ? currentSeat++ : null;
    const right2 = currentSeat <= capacity ? currentSeat++ : null;

    rows.push({
      rowNum: r,
      leftSeats: [left1, left2].filter((n): n is number => n !== null),
      rightSeats: [right1, right2].filter((n): n is number => n !== null),
    });
  }

  const renderSeat = (seatNum: number) => {
    const isOccupied = bus.occupiedSeatNumbers.includes(seatNum);
    const isStudentSeat = highlightSeatNumber === seatNum;

    let bgClass = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25';
    let label = 'Available';

    if (isStudentSeat) {
      bgClass = 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400 animate-pulse';
      label = 'Your Designated Seat';
    } else if (isOccupied) {
      bgClass = 'bg-zinc-800/80 border-zinc-700/60 text-zinc-500 cursor-not-allowed';
      label = 'Occupied';
    }

    return (
      <div
        key={seatNum}
        title={`Seat #${seatNum}: ${label}`}
        className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-md border flex flex-col items-center justify-center text-[10px] font-mono font-semibold transition-all duration-200 select-none ${bgClass}`}
      >
        <span>{seatNum}</span>
        {isStudentSeat && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-300 rounded-full border border-blue-800" />
        )}
      </div>
    );
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl">
      {/* Header with stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider font-mono">
              Live Seat Map: {bus.busNumber}
            </h4>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                freeSeats === 0
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : freeSeats <= 5
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {freeSeats === 0 ? 'Full' : `${freeSeats} Empty Seats`}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {bus.currentBoardedCount} boarded of {capacity} seats capacity
          </p>
        </div>

        {/* Mini progress bar */}
        <div className="w-full sm:w-44">
          <div className="flex justify-between text-[11px] text-zinc-400 font-mono mb-1">
            <span>Occupancy</span>
            <span className="font-semibold text-zinc-200">{occupancyPercent}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                occupancyPercent >= 90
                  ? 'bg-rose-500'
                  : occupancyPercent >= 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Safety Banner */}
      <div className="mb-4 px-3 py-2 bg-zinc-950/70 border border-zinc-800/80 rounded-lg flex items-center justify-between text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Strict Safety Rule: <strong>Zero Standing Passengers</strong>. Every student has a guaranteed seat.</span>
        </div>
        {highlightSeatNumber && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded text-[11px] font-semibold">
            Seat #{highlightSeatNumber} Assigned
          </span>
        )}
      </div>

      {/* Bus Blueprint Container */}
      <div className="relative mx-auto max-w-sm bg-zinc-950 border-2 border-zinc-700/80 rounded-3xl p-3 sm:p-4 shadow-inner">
        {/* Bus Front Indicator */}
        <div className="relative flex items-center justify-between pb-3 mb-3 border-b-2 border-dashed border-zinc-800 px-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/50">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Passenger Door / Scanner</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-1 rounded border border-zinc-700">
            <span>☸ Driver</span>
          </div>
        </div>

        {/* Seat rows */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {rows.map(({ rowNum, leftSeats, rightSeats }) => (
            <div key={rowNum} className="flex items-center justify-between gap-1">
              {/* Left 2 seats */}
              <div className="flex gap-1.5">
                {leftSeats.map(seat => renderSeat(seat))}
              </div>

              {/* Central Aisle */}
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[10px] text-zinc-600 font-mono select-none">
                  {rowNum === 1 ? 'AISLE' : ''}
                </span>
              </div>

              {/* Right 2 seats */}
              <div className="flex gap-1.5">
                {rightSeats.map(seat => renderSeat(seat))}
              </div>
            </div>
          ))}
        </div>

        {/* Bus Rear */}
        <div className="mt-3 pt-2 border-t-2 border-dashed border-zinc-800 text-center">
          <span className="text-[10px] font-mono uppercase text-zinc-600 tracking-widest">
            — Rear Emergency Exit —
          </span>
        </div>
      </div>

      {/* Seat legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-zinc-800 text-xs text-zinc-400 font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded border border-emerald-500/40 bg-emerald-500/15" />
          <span>Empty / Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded border border-zinc-700 bg-zinc-800" />
          <span>Occupied / Boarded</span>
        </div>
        {highlightSeatNumber && (
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded border border-blue-400 bg-blue-600 ring-1 ring-blue-300" />
            <span className="text-blue-300 font-medium">Your Designated Seat</span>
          </div>
        )}
      </div>
    </div>
  );
};
