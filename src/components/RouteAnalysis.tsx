import React, { useState } from 'react';
import { useBus } from '../context/BusContext';
import { ALL_COLLEGE_STOPS } from '../data/mockRoutes';
import { BusRoute } from '../types/bus';
import {
  MapPin,
  Bus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const RouteAnalysis: React.FC = () => {
  const { buses, pendingChanges } = useBus();
  const [selectedStopId, setSelectedStopId] = useState<string>('stop-tbm-1');
  const [filterQuery, setFilterQuery] = useState('');

  // Find all buses passing through the selected stop
  const matchingBuses = buses.filter(b => b.stops.some(s => s.id === selectedStopId));

  // Sort matching buses: buses with most available seats first
  const sortedMatchingBuses = [...matchingBuses].sort((a, b) => {
    const freeA = a.capacity - a.currentBoardedCount;
    const freeB = b.capacity - b.currentBoardedCount;
    return freeB - freeA;
  });

  const selectedStop = ALL_COLLEGE_STOPS.find(s => s.id === selectedStopId) || ALL_COLLEGE_STOPS[0];

  // Fleet stats
  const totalFleetCapacity = buses.reduce((acc, b) => acc + b.capacity, 0);
  const totalBoarded = buses.reduce((acc, b) => acc + b.currentBoardedCount, 0);
  const totalFreeSeats = totalFleetCapacity - totalBoarded;
  const overallOccupancy = Math.round((totalBoarded / totalFleetCapacity) * 100);

  const filteredFleet = buses.filter(b =>
    b.busNumber.toLowerCase().includes(filterQuery.toLowerCase()) ||
    b.routeName.toLowerCase().includes(filterQuery.toLowerCase()) ||
    b.driverName.toLowerCase().includes(filterQuery.toLowerCase()) ||
    b.stops.some(s => s.name.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Fleet Capacity</span>
            <Bus className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{totalFleetCapacity}</div>
          <div className="text-[11px] text-zinc-500 font-mono mt-1">{buses.length} Active College Buses</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Total Boarded</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{totalBoarded}</div>
          <div className="text-[11px] text-zinc-500 font-mono mt-1">{overallOccupancy}% Fleet Occupancy</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Empty Seats Left</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">{totalFreeSeats}</div>
          <div className="text-[11px] text-emerald-400/80 font-mono mt-1">Guaranteed Seating</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Standing Rate</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400">0%</div>
          <div className="text-[11px] text-zinc-500 font-mono mt-1">Zero-Standing Policy Enforced</div>
        </div>
      </div>

      {/* STOP ROUTE ANALYZER & BUS RECOMMENDATION */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-400" />
              <h3 className="text-lg font-bold text-zinc-100">
                Destination &amp; Boarding Point Route Analyzer
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Select your home stop to analyze all buses passing through and see live empty seats:
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono">Select Stop:</span>
            <select
              value={selectedStopId}
              onChange={(e) => setSelectedStopId(e.target.value)}
              className="py-2 px-3.5 bg-zinc-950 border border-zinc-700 text-zinc-200 font-medium rounded-xl text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {ALL_COLLEGE_STOPS.map(stop => (
                <option key={stop.id} value={stop.id}>
                  {stop.name} ({stop.area})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results for Selected Stop */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Buses calling at <strong className="text-zinc-200">{selectedStop.name}</strong> ({matchingBuses.length} buses found)
            </h4>
            <span className="text-[11px] text-emerald-400 font-mono">
              ✓ Ranked by available empty seats
            </span>
          </div>

          {sortedMatchingBuses.length === 0 ? (
            <div className="text-center py-8 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs text-zinc-400">
              No buses currently listed for this specific stop. Check neighbouring transport junctions.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedMatchingBuses.map((bus, index) => {
                const stopDetails = bus.stops.find(s => s.id === selectedStopId);
                const freeSeats = bus.capacity - bus.currentBoardedCount;
                const isOptimal = index === 0 && freeSeats > 0;
                const isFull = freeSeats <= 0;

                return (
                  <div
                    key={bus.id}
                    className={`rounded-2xl p-4 border transition-all ${
                      isOptimal
                        ? 'bg-gradient-to-br from-emerald-950/30 to-zinc-900 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : isFull
                        ? 'bg-zinc-950/80 border-rose-800/40 opacity-75'
                        : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-base text-zinc-100">{bus.busNumber}</span>
                          {isOptimal && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
                              BEST FIT
                            </span>
                          )}
                          {isFull && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40 px-1.5 py-0.5 rounded font-bold">
                              FULL
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 truncate max-w-[200px] mt-0.5">{bus.routeName}</p>
                      </div>

                      <div className="text-right">
                        <span className={`text-base font-bold font-mono ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {freeSeats}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">seats empty</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-zinc-500 block">Pickup Time:</span>
                        <span className="text-zinc-200 font-semibold">{stopDetails?.morningPickupTime || '07:15 AM'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Evening Drop:</span>
                        <span className="text-zinc-200 font-semibold">{stopDetails?.eveningDropTime || '05:45 PM'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Platform:</span>
                        <span className="text-amber-400 font-semibold">{bus.platformNumber}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Driver:</span>
                        <span className="text-zinc-300 truncate block">{bus.driverName}</span>
                      </div>
                    </div>

                    {isFull && (
                      <div className="mt-3 p-2 bg-rose-950/40 rounded-lg border border-rose-800/50 text-[11px] text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Take alternative bus <strong>{sortedMatchingBuses[0].busNumber}</strong> instead</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FULL FLEET SEAT AVAILABILITY MASTER DIRECTORY */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Bus className="w-5 h-5 text-blue-400" />
              <span>College Fleet Live Seat Availability</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live updates direct from bus door ID card scanners
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bus, route, or stop..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Fleet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFleet.map(bus => {
            const free = Math.max(0, bus.capacity - bus.currentBoardedCount);
            const percent = Math.round((bus.currentBoardedCount / bus.capacity) * 100);

            return (
              <div
                key={bus.id}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 transition-all hover:border-zinc-700 shadow-md"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-zinc-100">{bus.busNumber}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {bus.platformNumber}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{bus.routeName}</p>
                  </div>

                  <div className="text-right">
                    <span className={`text-sm font-mono font-bold ${free <= 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {free} Empty Seats
                    </span>
                    <span className="text-[10px] text-zinc-500 block font-mono">
                      {bus.currentBoardedCount} / {bus.capacity} boarded
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all duration-300 ${
                      percent >= 90 ? 'bg-rose-500' : percent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Stops chip list */}
                <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-1 text-[11px] text-zinc-400">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1">Stops:</span>
                  {bus.stops.map((s, idx) => (
                    <span key={s.id} className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-zinc-300">
                      {s.name.split(' (')[0]}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
