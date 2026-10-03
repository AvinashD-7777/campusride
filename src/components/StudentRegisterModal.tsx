import React, { useState, useRef } from 'react';
import { useBus, BulkImportResult, BulkStudentRow } from '../context/BusContext';
import { ALL_COLLEGE_STOPS } from '../data/mockRoutes';
import {
  UserPlus,
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  Info,
  Check,
  AlertTriangle,
  Bus,
  RefreshCw,
} from 'lucide-react';

interface StudentRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentRegisterModal: React.FC<StudentRegisterModalProps> = ({ isOpen, onClose }) => {
  const { addNewStudent, addMultipleStudents } = useBus();

  const [activeTab, setActiveTab] = useState<'single' | 'csv'>('single');

  // Single form state
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [cardId, setCardId] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engg');
  const [year, setYear] = useState('2nd Year (B.E.)');
  const [phone, setPhone] = useState('+91 98400 ');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('1234');
  const [homeStopId, setHomeStopId] = useState(ALL_COLLEGE_STOPS[0].id);

  // CSV Bulk state
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<BulkStudentRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStopReference, setShowStopReference] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [singleMessage, setSingleMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Single submit
  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rollNumber || !cardId || !pin) {
      setSingleMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    const res = addNewStudent({
      cardId: cardId.toUpperCase(),
      rollNumber: rollNumber.toUpperCase(),
      name,
      department,
      year,
      phone,
      email: email || `${rollNumber.toLowerCase()}@college.edu`,
      pin,
      homeStopId,
      homeStopName: ALL_COLLEGE_STOPS.find(s => s.id === homeStopId)?.name || 'Campus Gate',
      assignedBusId: '',
      assignedBusNumber: '',
    });

    if (res.success) {
      setSingleMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        onClose();
        setSingleMessage(null);
      }, 1500);
    } else {
      setSingleMessage({ type: 'error', text: res.message });
    }
  };

  // CSV Parsing Engine
  const parseCSVText = (text: string) => {
    setParseErrors([]);
    setImportResult(null);

    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length < 2) {
      setParseErrors(['CSV file must contain a header row and at least one student data row.']);
      setParsedRows([]);
      return;
    }

    // Parse header
    const headers = lines[0]
      .split(',')
      .map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

    const cardIdIdx = headers.indexOf('card_id');
    const nameIdx = headers.indexOf('name');
    const pinIdx = headers.indexOf('pin');
    const stopIdIdx = headers.indexOf('stop_id');

    const missingColumns = [];
    if (cardIdIdx === -1) missingColumns.push('card_id');
    if (nameIdx === -1) missingColumns.push('name');
    if (pinIdx === -1) missingColumns.push('pin');
    if (stopIdIdx === -1) missingColumns.push('stop_id');

    if (missingColumns.length > 0) {
      setParseErrors([
        `Missing required CSV column(s): ${missingColumns.join(', ')}. Header row must be: card_id,name,pin,stop_id`,
      ]);
      setParsedRows([]);
      return;
    }

    const rows: BulkStudentRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV column split respecting quotes if needed
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));

      const rawCardId = cols[cardIdIdx] || '';
      const rawName = cols[nameIdx] || '';
      const rawPin = cols[pinIdx] || '';
      const rawStopId = cols[stopIdIdx] || '';

      if (!rawCardId && !rawName && !rawStopId) {
        continue; // skip completely blank row
      }

      if (!rawCardId || !rawName || !rawStopId) {
        errors.push(`Line ${i + 1}: Incomplete record. Ensure card_id, name, and stop_id are filled.`);
        continue;
      }

      rows.push({
        cardId: rawCardId,
        name: rawName,
        pin: rawPin || '1234',
        stopId: rawStopId,
      });
    }

    setParsedRows(rows);
    if (errors.length > 0) {
      setParseErrors(errors);
    }
  };

  // Handle File Input Change
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      parseCSVText(content);
    };
    reader.readAsText(file);
  };

  // Load Sample CSV
  const handleLoadSampleCSV = () => {
    const sample = `card_id,name,pin,stop_id
STU-2001,Vikramaditya Bose,1234,stop-tbm-1
STU-2002,Meera Krishnan,4321,stop-vel-1
STU-2003,Mohammed Faiz,7788,stop-gui-1
STU-2004,Kavitha Ramachandran,9900,stop-por-1
STU-2005,Sanjay Sundararajan,5544,stop-med-1`;

    setFileName('sample_college_students.csv');
    setCsvContent(sample);
    parseCSVText(sample);
  };

  // Download Sample CSV
  const handleDownloadSample = () => {
    const sample = `card_id,name,pin,stop_id
STU-2001,Vikramaditya Bose,1234,stop-tbm-1
STU-2002,Meera Krishnan,4321,stop-vel-1
STU-2003,Mohammed Faiz,7788,stop-gui-1
STU-2004,Kavitha Ramachandran,9900,stop-por-1`;

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'students_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Execute Bulk Import
  const handleExecuteImport = () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);

    try {
      const result = addMultipleStudents(parsedRows);
      setImportResult(result);
    } catch {
      setParseErrors(['An error occurred while importing records.']);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCSVState = () => {
    setCsvContent('');
    setFileName(null);
    setParsedRows([]);
    setParseErrors([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl p-5 sm:p-7 relative my-8 text-zinc-100 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-zinc-800 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            {activeTab === 'single' ? <UserPlus className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              Student Registration &amp; Bus Seat Allocation
            </h3>
            <p className="text-xs text-zinc-400">
              Auto-allocates round-trip bus, reserves seat, and sets security PIN
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-4 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'single'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Single Student</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'csv'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload CSV (Bulk Import)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              MULTI
            </span>
          </button>
        </div>

        {/* TAB 1: SINGLE STUDENT REGISTRATION */}
        {activeTab === 'single' && (
          <div className="overflow-y-auto pr-1 flex-1">
            {singleMessage && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 ${
                  singleMessage.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/40 border border-rose-500/50 text-rose-200'
                }`}
              >
                {singleMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{singleMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSingleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kannan"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2024CS115"
                    value={rollNumber}
                    onChange={e => setRollNumber(e.target.value)}
                    className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">ID Card / Barcode UID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STU-1025 or RFID UID"
                    value={cardId}
                    onChange={e => setCardId(e.target.value)}
                    className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Security PIN (4 Digits) *</label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    placeholder="e.g. 1234"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Home Boarding Stop *</label>
                <select
                  value={homeStopId}
                  onChange={e => setHomeStopId(e.target.value)}
                  className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  {ALL_COLLEGE_STOPS.map(stop => (
                    <option key={stop.id} value={stop.id}>
                      {stop.name} ({stop.area})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Year</label>
                  <input
                    type="text"
                    value={year}
                    onChange={e => setYear(e.target.value)}
                    className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shadow-md shadow-blue-500/20"
                >
                  Register &amp; Auto-Allocate Bus
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: BULK CSV UPLOAD */}
        {activeTab === 'csv' && (
          <div className="overflow-y-auto pr-1 flex-1 space-y-4">
            {/* CSV Specification Banner */}
            <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Required CSV Column Headers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800 hover:border-zinc-700"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .CSV Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSampleCSV}
                    className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-800/60"
                  >
                    <span>Load 5 Demo Rows</span>
                  </button>
                </div>
              </div>

              <div className="font-mono text-xs bg-zinc-900 px-3 py-2 rounded-xl text-zinc-300 border border-zinc-800/80 flex items-center justify-between">
                <span>card_id,name,pin,stop_id</span>
                <span className="text-[10px] text-zinc-500 uppercase">CSV Header</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>* stop_id accepts code (e.g. <code>stop-tbm-1</code>), 1-based index (e.g. <code>1</code>), or stop name.</span>
                <button
                  type="button"
                  onClick={() => setShowStopReference(!showStopReference)}
                  className="text-blue-400 hover:underline text-[11px] font-mono"
                >
                  {showStopReference ? 'Hide Stop IDs' : 'View Stop ID Codes'}
                </button>
              </div>

              {/* Stop ID reference dropdown table */}
              {showStopReference && (
                <div className="mt-2 pt-2 border-t border-zinc-800 max-h-36 overflow-y-auto pr-1 text-[11px] font-mono space-y-1">
                  <div className="grid grid-cols-2 gap-2 text-zinc-400">
                    {ALL_COLLEGE_STOPS.slice(0, 10).map((s, idx) => (
                      <div key={s.id} className="truncate">
                        <strong className="text-zinc-200">{s.id}</strong> (or {idx + 1}): {s.name.split(' (')[0]}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Upload Drag & Drop Area */}
            {!importResult && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700 hover:border-blue-500 bg-zinc-950/60 hover:bg-zinc-950 p-6 rounded-2xl text-center cursor-pointer transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 group-hover:bg-blue-600/20 border border-zinc-800 group-hover:border-blue-500/40 flex items-center justify-center text-zinc-400 group-hover:text-blue-400 mx-auto mb-2 transition-all">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                    {fileName ? `File Loaded: ${fileName}` : 'Click to Upload CSV File'}
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Supports .csv with card_id, name, pin, stop_id
                  </p>
                </div>
              </div>
            )}

            {/* Error notifications */}
            {parseErrors.length > 0 && (
              <div className="bg-rose-950/40 border border-rose-500/50 p-3 rounded-2xl text-xs text-rose-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>CSV Validation Alerts ({parseErrors.length})</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-300">
                  {parseErrors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {parseErrors.length > 5 && (
                    <li>...and {parseErrors.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            )}

            {/* PARSED ROWS PREVIEW TABLE (Before Import) */}
            {parsedRows.length > 0 && !importResult && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 font-mono">
                    Parsed Students Ready for Import ({parsedRows.length})
                  </span>
                  <button
                    type="button"
                    onClick={resetCSVState}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="text-[10px] text-zinc-500 uppercase bg-zinc-900 border-b border-zinc-800">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Card ID</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">PIN</th>
                        <th className="p-2">Stop ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {parsedRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/40">
                          <td className="p-2 text-zinc-500">{idx + 1}</td>
                          <td className="p-2 font-bold text-emerald-400">{r.cardId}</td>
                          <td className="p-2 text-zinc-200 truncate max-w-[140px]">{r.name}</td>
                          <td className="p-2 text-zinc-400">••••</td>
                          <td className="p-2 text-blue-400">{r.stopId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Import Action Buttons */}
                <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={resetCSVState}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={isProcessing || parsedRows.length === 0}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm &amp; Register {parsedRows.length} Students</span>
                  </button>
                </div>
              </div>
            )}

            {/* IMPORT SUCCESS RESULT REPORT */}
            {importResult && (
              <div className="bg-zinc-950 border border-emerald-500/40 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-400">
                      Bulk Registration Complete!
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Successfully allocated {importResult.successCount} of {importResult.totalProcessed} students to college buses with designated seats.
                    </p>
                  </div>
                </div>

                {/* Allocated Students Table */}
                <div className="max-h-48 overflow-y-auto overflow-x-auto border border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="text-[10px] text-zinc-500 uppercase bg-zinc-900 border-b border-zinc-800">
                      <tr>
                        <th className="p-2">Card ID</th>
                        <th className="p-2">Student Name</th>
                        <th className="p-2">Assigned Bus</th>
                        <th className="p-2">Designated Seat</th>
                        <th className="p-2">Boarding Stop</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {importResult.allocated.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/40">
                          <td className="p-2 font-bold text-emerald-400">{item.cardId}</td>
                          <td className="p-2 text-zinc-200">{item.studentName}</td>
                          <td className="p-2 font-bold text-amber-400">{item.busNumber}</td>
                          <td className="p-2 text-blue-400">Seat #{item.seatNumber}</td>
                          <td className="p-2 text-zinc-400">{item.stopName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* If some had errors */}
                {importResult.errors.length > 0 && (
                  <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs text-rose-300">
                    <div className="font-semibold mb-1">Failed Rows ({importResult.failureCount}):</div>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={resetCSVState}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs transition-colors"
                  >
                    Import More
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-md shadow-emerald-600/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
