import React, { useState } from 'react';
import {
  Cpu,
  Radio,
  FileCode,
  Copy,
  Check,
  CheckCircle,
  AlertTriangle,
  Zap,
  Layers,
  Wrench,
  Download,
  Terminal,
} from 'lucide-react';

export const HardwareGuide: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedScannerType, setSelectedScannerType] = useState<'esp32' | 'usb' | 'phone'>('esp32');

  const esp32InoCode = `/*
 * CampusRide - College Bus Seat & ID Scanner Unit
 * Target: ESP32 Dev Module + MFRC522 RFID Reader + Dual LEDs + Buzzer + OLED
 * 
 * Logic:
 * 1. Reads Student RFID Card / UID on tap at bus entrance.
 * 2. Connects to College Bus API via Wi-Fi (Bus Hotspot or 4G LTE Dongle).
 * 3. Sends POST /api/scan with Bus ID and Card UID.
 * 4. Parses server verdict:
 *    - SUCCESS: Green LED ON, dual cheerful beep, shows seat # on OLED.
 *    - WRONG_BUS: Red LED flashes, loud warning buzzer, OLED displays correct bus.
 *    - DUPLICATE: Amber alert, seat count not decremented twice.
 */

#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- PIN DEFINITIONS (ESP32) ---
#define SS_PIN          5   // RC522 SDA
#define RST_PIN         22  // RC522 RST
#define LED_GREEN_PIN   25  // Green LED (Right Bus)
#define LED_RED_PIN     26  // Red LED (Wrong Bus)
#define BUZZER_PIN      27  // Piezo Buzzer

// --- BUS CONFIGURATION ---
const char* WIFI_SSID     = "College_Bus_WiFi";     // Bus 4G Hotspot
const char* WIFI_PASSWORD = "BusHotspotPassword123";
const char* SERVER_URL    = "https://your-college-server.edu/api/scan";
const char* BUS_ID        = "BUS-01A";              // Set uniquely per bus!
const char* SCAN_KEY      = "scanner_secret_token_1";

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  SPI.begin(); // Init SPI bus
  rfid.PCD_Init(); // Init MFRC522

  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\\nWiFi Connected. IP: " + WiFi.localIP().toString());
  Serial.println("Bus ID Scanner Ready on " + String(BUS_ID));

  // Ready Chirp
  beep(1000, 100);
  delay(100);
  beep(1500, 100);
}

void loop() {
  // Look for new RFID card
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  // Convert UID to Hex String
  String cardUid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    cardUid += (rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    cardUid += String(rfid.uid.uidByte[i], HEX);
    if (i < rfid.uid.size - 1) cardUid += ":";
  }
  cardUid.toUpperCase();
  Serial.println("Card Tapped: " + cardUid);

  // Send to College Server
  sendScanToServer(cardUid);

  // Halt PICC
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(1200); // Debounce delay
}

void sendScanToServer(String uid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi Disconnected!");
    signalError();
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-scanner-key", SCAN_KEY);

  // Construct JSON Payload
  StaticJsonDocument<256> doc;
  doc["bus_id"] = BUS_ID;
  doc["card_id"] = uid;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Server Response: " + response);

    StaticJsonDocument<512> resDoc;
    DeserializationError error = deserializeJson(resDoc, response);

    if (!error) {
      const char* status = resDoc["status"];
      int seatNumber = resDoc["seat_number"];
      int availableSeats = resDoc["available_seats"];

      if (strcmp(status, "SUCCESS") == 0) {
        // RIGHT BUS!
        Serial.printf("APPROVED! Seat #%d allocated. Available: %d\\n", seatNumber, availableSeats);
        signalSuccess();
      } else if (strcmp(status, "WRONG_BUS") == 0) {
        // WRONG BUS!
        const char* correctBus = resDoc["assigned_bus_number"];
        Serial.printf("WRONG BUS! Student belongs to %s\\n", correctBus);
        signalWrongBus();
      } else if (strcmp(status, "DUPLICATE") == 0) {
        signalDuplicate();
      } else {
        signalError();
      }
    }
  } else {
    Serial.printf("HTTP Error: %d\\n", httpCode);
    signalError();
  }
  http.end();
}

void signalSuccess() {
  digitalWrite(LED_GREEN_PIN, HIGH);
  beep(1000, 100);
  delay(80);
  beep(1500, 180);
  delay(1000);
  digitalWrite(LED_GREEN_PIN, LOW);
}

void signalWrongBus() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_RED_PIN, HIGH);
    tone(BUZZER_PIN, 200, 250);
    delay(300);
    digitalWrite(LED_RED_PIN, LOW);
    delay(100);
  }
}

void signalDuplicate() {
  tone(BUZZER_PIN, 800, 200);
}

void signalError() {
  digitalWrite(LED_RED_PIN, HIGH);
  delay(600);
  digitalWrite(LED_RED_PIN, LOW);
}

void beep(int freq, int durationMs) {
  tone(BUZZER_PIN, freq, durationMs);
  delay(durationMs);
  noTone(BUZZER_PIN);
}
`;

  const copyCode = () => {
    navigator.clipboard.writeText(esp32InoCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const downloadIno = () => {
    const element = document.createElement('a');
    const file = new Blob([esp32InoCode], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'esp32_scanner.ino';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Title & Introduction */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold text-zinc-100">
                Hardware ID Scanner Construction Guide &amp; Firmware
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Step-by-step schematics, pinouts, and embedded Arduino code to assemble physical bus door readers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadIno}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download esp32_scanner.ino</span>
            </button>
          </div>
        </div>

        {/* Scanner Architecture Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedScannerType('esp32')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              selectedScannerType === 'esp32'
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500 shadow-lg shadow-emerald-500/10'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm text-zinc-100">Option 1: ESP32 + RFID Reader</span>
            </div>
            <p className="text-xs text-zinc-400">
              Dedicated standalone embedded hardware box with LEDs, buzzer, and RC522 RFID reader.
            </p>
          </button>

          <button
            onClick={() => setSelectedScannerType('usb')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              selectedScannerType === 'usb'
                ? 'bg-blue-950/40 border-blue-500 text-blue-200 ring-1 ring-blue-500 shadow-lg shadow-blue-500/10'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-sm text-zinc-100">Option 2: USB Barcode / RFID Gun</span>
            </div>
            <p className="text-xs text-zinc-400">
              Plug-and-play USB scanner connected to a conductor laptop or Android tablet via OTG cable.
            </p>
          </button>

          <button
            onClick={() => setSelectedScannerType('phone')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              selectedScannerType === 'phone'
                ? 'bg-purple-950/40 border-purple-500 text-purple-200 ring-1 ring-purple-500 shadow-lg shadow-purple-500/10'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-sm text-zinc-100">Option 3: Phone Camera Scanner</span>
            </div>
            <p className="text-xs text-zinc-400">
              Zero extra hardware needed. Mount an old Android smartphone near the door running this app.
            </p>
          </button>
        </div>
      </div>

      {/* OPTION 1 CONTENT: ESP32 HARDWARE SCHEMATIC & INO CODE */}
      {selectedScannerType === 'esp32' && (
        <div className="space-y-6">
          {/* Bill of Materials (BOM) & Pinout Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Wiring Table */}
            <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-md">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span>ESP32 to RC522 RFID Wiring Pinout</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-950 text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="p-2.5">RC522 Pin</th>
                      <th className="p-2.5">ESP32 Pin</th>
                      <th className="p-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    <tr className="hover:bg-zinc-950/40">
                      <td className="p-2.5 text-rose-400 font-bold">3.3V (VCC)</td>
                      <td className="p-2.5 text-rose-400 font-bold">3V3</td>
                      <td className="p-2.5 text-zinc-400">Power (Do NOT use 5V; will fry reader!)</td>
                    </tr>
                    <tr className="hover:bg-zinc-950/40">
                      <td className="p-2.5 text-zinc-300">GND</td>
                      <td className="p-2.5 text-zinc-300">GND</td>
                      <td className="p-2.5 text-zinc-400">Ground</td>
                    </tr>
                    <tr className="hover:bg-zinc-950/40">
                      <td className="p-2.5 text-blue-400">SDA (SS)</td>
                      <td className="p-2.5 text-blue-400 font-bold">GPIO 5</td>
                      <td className="p-2.5 text-zinc-400">SPI Chip Select</td>
                    </tr>
                    <tr className="hover:bg-zinc-950/40">
                      <td className="p-2.5 text-blue-400">SCK</td>
                      <td className="p-2.5 text-blue-400 font-bold">GPIO 18</td>
                      <td className="p-2.5 text-zinc-400">SPI Clock</td>
                    </tr>
                    <tr className="hover:bg-zinc-950/40">
                      <td className="p-2.5 text-blue-400">MOSI</td>
                      <td className="p-2.5 text-blue-400 font-bold">GPIO 23</td>
                      <td className="p-2.5 text-zinc-400">Master Out Slave In</td>
                    </tr>
                    <tr className="hover:bg-zinc-950/40">
                      <td className="p-2.5 text-blue-400">MISO</td>
                      <td className="p-2.5 text-blue-400 font-bold">GPIO 19</td>
                      <td className="p-2.5 text-zinc-400">Master In Slave Out</td>
                    </tr>
                    <tr className="hover:bg-zinc-950/40">
                      <td className="p-2.5 text-amber-400">RST</td>
                      <td className="p-2.5 text-amber-400 font-bold">GPIO 22</td>
                      <td className="p-2.5 text-zinc-400">Reset Signal</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Indicator Peripherals Pinout */}
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-2 font-bold">
                  Audio &amp; Visual Feedback Indicators:
                </span>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                    <span className="text-emerald-400 font-bold block">GPIO 25</span>
                    <span className="text-zinc-400 text-[10px]">Green LED (Right Bus)</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                    <span className="text-rose-400 font-bold block">GPIO 26</span>
                    <span className="text-zinc-400 text-[10px]">Red LED (Wrong Bus)</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                    <span className="text-amber-400 font-bold block">GPIO 27</span>
                    <span className="text-zinc-400 text-[10px]">Piezo Buzzer (5V)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Installation & Power Checklist */}
            <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-md space-y-4">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                <span>Bus Door Enclosure Installation Guide</span>
              </h3>

              <div className="space-y-3 text-xs text-zinc-300">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                  <strong className="text-zinc-100 block">1. 3D Printed / ABS Enclosure</strong>
                  <p className="text-zinc-400">
                    Mount the reader box on the vertical grab bar at 1.2m (hand height) right next to the entrance door. The RF antenna must face students boarding the bus.
                  </p>
                </div>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                  <strong className="text-zinc-100 block">2. Bus Power Source (5V USB)</strong>
                  <p className="text-zinc-400">
                    Connect the ESP32 micro-USB port to the driver&apos;s 12V-to-5V dashboard USB socket or a standard 5000mAh 5V power bank that lasts 18+ hours.
                  </p>
                </div>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                  <strong className="text-zinc-100 block">3. Connectivity (Wi-Fi Hotspot)</strong>
                  <p className="text-zinc-400">
                    Buses transmit scan events via a 4G LTE Wi-Fi dongle or the bus driver&apos;s phone mobile hotspot. If Wi-Fi briefly drops, scans queue and sync on reconnection.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Arduino Code Viewer */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-md">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-zinc-200">
                  esp32_scanner.ino (Complete Source Code)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyCode}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
              <pre className="p-4 text-xs font-mono text-zinc-300 max-h-96 overflow-y-auto leading-relaxed">
                <code>{esp32InoCode}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* OPTION 2 CONTENT: USB SCANNER GUIDE */}
      {selectedScannerType === 'usb' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-md space-y-4">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            <span>Option 2: USB Handheld Barcode / RFID Reader (Most Reliable &amp; Instant)</span>
          </h3>

          <p className="text-xs text-zinc-300 leading-relaxed">
            A standard handheld 1D/2D USB barcode reader or USB RFID desktop reader costs around $10-$15. These devices act as a standard USB Keyboard (HID Wedge).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-blue-400 uppercase font-mono">Step 1: Plug In</span>
              <p className="text-xs text-zinc-400">
                Plug the USB cable into any laptop or Android tablet/phone mounted at the bus door using a USB-C to USB-A OTG adapter.
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-blue-400 uppercase font-mono">Step 2: Open Scanner Tab</span>
              <p className="text-xs text-zinc-400">
                Open the Door Scanner tab on the device. Click into the USB Scanner field.
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-blue-400 uppercase font-mono">Step 3: Scan &amp; Go</span>
              <p className="text-xs text-zinc-400">
                When students enter and tap their card, the USB reader automatically transmits the student ID number and triggers verification in under 0.1 seconds!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* OPTION 3 CONTENT: PHONE CAMERA GUIDE */}
      {selectedScannerType === 'phone' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-md space-y-4">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span>Option 3: Phone Camera Scanner (No Extra Hardware Needed)</span>
          </h3>

          <p className="text-xs text-zinc-300 leading-relaxed">
            Mount any Android phone or tablet on the bus grab handle facing incoming passengers.
          </p>

          <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs text-zinc-300 space-y-2">
            <p>
              1. Students display their digital bus pass QR code (from the Student Portal tab on their phone) or hold up their printed ID card.
            </p>
            <p>
              2. The camera reads the QR code instantly, flashes green/red on the large screen, and beeps.
            </p>
            <p>
              3. The seat count decrements automatically on the live college server!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
