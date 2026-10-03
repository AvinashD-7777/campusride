import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Student, BusRoute } from '../types/bus';
import { Bus, CheckCircle2, Copy, Check, Sparkles, MapPin, QrCode } from 'lucide-react';

interface DigitalIdCardProps {
  student: Student;
  assignedBus?: BusRoute;
  onQuickScan?: (cardId: string) => void;
}

export const DigitalIdCard: React.FC<DigitalIdCardProps> = ({
  student,
  assignedBus,
  onQuickScan,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    QRCode.toDataURL(student.cardId, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('QR code generation error:', err));
  }, [student.cardId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(student.cardId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Physical Card container */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-2 border-zinc-700/80 shadow-2xl p-5 text-zinc-100">
        {/* Lanyard slot simulation */}
        <div className="flex justify-center mb-3">
          <div className="w-14 h-2.5 rounded-full bg-zinc-950 border border-zinc-700 shadow-inner" />
        </div>

        {/* College Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/30">
              <Bus className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-mono tracking-widest uppercase text-blue-400 font-bold">
                College of Engineering &amp; Tech
              </div>
              <div className="text-xs font-semibold text-zinc-300">
                Official Transport ID Pass
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
            VALID 2026-27
          </span>
        </div>

        {/* Student Avatar + Quick Info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative shrink-0">
            <img
              src={student.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
              alt={student.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500/50 shadow-md"
            />
            {student.morningBoarded && (
              <span
                title="Boarded Morning Trip"
                className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base text-zinc-100 truncate">{student.name}</h3>
            <p className="text-xs font-mono text-blue-400 font-semibold">{student.rollNumber}</p>
            <p className="text-[11px] text-zinc-400 truncate">{student.department}</p>
            <p className="text-[10px] text-zinc-500">{student.year}</p>
          </div>
        </div>

        {/* Transport Allocation Highlight Box */}
        <div className="bg-zinc-950/90 rounded-2xl p-3 border border-zinc-800/90 mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">Designated Bus (AM &amp; PM):</span>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded">
              {student.assignedBusNumber}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">Seat Allocation:</span>
            <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-800/60 border border-zinc-700/60 px-2 py-0.5 rounded">
              {student.designatedSeatNumber ? `Seat #${student.designatedSeatNumber}` : 'Open Seating (Route Pending)'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/60">
            <div className="flex items-center gap-1 text-zinc-400 text-[11px] truncate max-w-[200px]">
              <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
              <span className="truncate">{student.homeStopName}</span>
            </div>
            {assignedBus && (
              <span className="text-[10px] text-zinc-500 font-mono">
                {assignedBus.platformNumber}
              </span>
            )}
          </div>
        </div>

        {/* QR Code and Barcode Section */}
        <div className="bg-white rounded-2xl p-3 flex items-center justify-between text-zinc-900 shadow-md">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">
              ID Card Barcode / RFID UID
            </div>
            <div className="text-sm font-mono font-black tracking-widest text-zinc-900">
              {student.cardId}
            </div>
            <div className="text-[10px] text-zinc-600 flex items-center gap-1 font-mono">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Scanner Ready (Scan at Door)
            </div>
            {/* Barcode graphic simulation */}
            <div className="pt-1 flex items-center gap-0.5 h-6">
              {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 2, 3, 1, 4, 2, 1, 3, 1, 2, 1, 3, 2, 1].map((w, i) => (
                <div
                  key={i}
                  className="h-full bg-zinc-900"
                  style={{ width: `${w * 1.5}px` }}
                />
              ))}
            </div>
          </div>

          {/* High resolution QR */}
          {qrCodeUrl && (
            <div className="bg-white p-1 rounded-xl shadow-inner border border-zinc-200 shrink-0">
              <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16 sm:w-20 sm:h-20" />
            </div>
          )}
        </div>

        {/* Action buttons footer */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy ID ({student.cardId})</span>
              </>
            )}
          </button>

          {onQuickScan && (
            <button
              onClick={() => onQuickScan(student.cardId)}
              className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/30"
              title="Test scan this card at the door scanner"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Simulate Door Scan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
