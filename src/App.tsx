/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BusProvider } from './context/BusContext';
import { Navbar } from './components/Navbar';
import { StudentPortal } from './components/StudentPortal';
import { DoorScanner } from './components/DoorScanner';
import { RouteAnalysis } from './components/RouteAnalysis';
import { HardwareGuide } from './components/HardwareGuide';
import { StudentRegisterModal } from './components/StudentRegisterModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'student' | 'scanner' | 'routes' | 'hardware'>('student');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [prefilledCardId, setPrefilledCardId] = useState<string>('');

  const handleGoToScannerWithCard = (cardId: string) => {
    setPrefilledCardId(cardId);
    setActiveTab('scanner');
  };

  return (
    <BusProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        {/* Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenRegister={() => setIsRegisterOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'student' && (
            <StudentPortal onGoToScannerWithCard={handleGoToScannerWithCard} />
          )}

          {activeTab === 'scanner' && (
            <DoorScanner initialCardId={prefilledCardId} />
          )}

          {activeTab === 'routes' && (
            <RouteAnalysis />
          )}

          {activeTab === 'hardware' && (
            <HardwareGuide />
          )}
        </main>

        {/* Student Registration Modal */}
        <StudentRegisterModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
        />

        {/* System Footer */}
        <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              <span>CampusRide Transport Control System • Active 2026 Academic Session</span>
            </div>
            <div className="font-mono text-[11px] text-zinc-400">
              Zero-Standing Enforced • Symmetric Round-Trip Reservation
            </div>
          </div>
        </footer>
      </div>
    </BusProvider>
  );
}
