import React from 'react';
import { Bus, Scan, MapPin, Cpu, UserPlus, Clock } from 'lucide-react';
import { useBus } from '../context/BusContext';

interface NavbarProps {
  activeTab: 'student' | 'scanner' | 'routes' | 'hardware';
  setActiveTab: (tab: 'student' | 'scanner' | 'routes' | 'hardware') => void;
  onOpenRegister: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenRegister,
}) => {
  const { currentTripType, setCurrentTripType } = useBus();

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('student')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-zinc-100 tracking-tight">CampusRide</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  SYSTEM ACTIVE
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                College Bus Seat &amp; ID Scanner Network
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('student')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'student'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Bus className="w-4 h-4" />
              <span>Student Travel Hub</span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'scanner'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>Door ID Scanner</span>
            </button>

            <button
              onClick={() => setActiveTab('routes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'routes'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Route &amp; Seat Analysis</span>
            </button>

            <button
              onClick={() => setActiveTab('hardware')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'hardware'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>ESP32 Hardware Guide</span>
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenRegister}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 text-xs font-medium rounded-xl transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Register Student</span>
            </button>

            <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900/60 px-2.5 py-1 rounded-xl border border-zinc-800">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Symmetric Bus Rule Active</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-zinc-800/80 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('student')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 ${
              activeTab === 'student' ? 'bg-blue-600 text-white' : 'text-zinc-400'
            }`}
          >
            Student Hub
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 ${
              activeTab === 'scanner' ? 'bg-emerald-600 text-white' : 'text-zinc-400'
            }`}
          >
            Door Scanner
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 ${
              activeTab === 'routes' ? 'bg-amber-600 text-white' : 'text-zinc-400'
            }`}
          >
            Route Analysis
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 ${
              activeTab === 'hardware' ? 'bg-purple-600 text-white' : 'text-zinc-400'
            }`}
          >
            ESP32 Guide
          </button>
        </div>
      </div>
    </header>
  );
};
