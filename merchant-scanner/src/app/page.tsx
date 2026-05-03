'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { CheckCircle2, XCircle, Loader2, Camera, LogOut } from 'lucide-react';

export default function Home() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [newPoints, setNewPoints] = useState<number | null>(null);
  
  const scannerRef = useRef<HTMLDivElement>(null);

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      // In a real app, you might want to verify the PIN with the backend first
      // For this demo, we assume the backend will reject invalid PINs during the stamp request
      setIsAuthenticated(true);
    }
  };

  // Scanner Setup
  useEffect(() => {
    if (isAuthenticated && scanStatus === 'idle' && scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true
        },
        false
      );

      scanner.render(
        async (decodedText) => {
          // Pause scanning while processing
          scanner.pause(true);
          await processScan(decodedText, scanner);
        },
        (error) => {
          // Ignore frequent scanning errors (e.g. no QR in frame)
        }
      );

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [isAuthenticated, scanStatus]);

  // Process the QR Code
  const processScan = async (objectId: string, scannerInstance: any) => {
    setScanStatus('loading');
    
    try {
      const response = await fetch('/api/wallet/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectId, pin, amount: 1 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Stempeln');
      }

      setNewPoints(data.newPoints);
      setMessage(data.type === 'redeem' ? 'Belohnung erreicht! Punkte wurden zurückgesetzt.' : 'Stempel erfolgreich hinzugefügt!');
      setScanStatus('success');

    } catch (err: any) {
      setMessage(err.message);
      setScanStatus('error');
    } finally {
      // Resume scanner after 3 seconds if not success
      setTimeout(() => {
        setScanStatus('idle');
        setNewPoints(null);
        if (scannerInstance) {
          try {
            scannerInstance.resume();
          } catch(e) {}
        }
      }, 4000);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Marketif Scanner</h1>
            <p className="text-white/60">Bitte PIN eingeben, um zu starten</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-2xl tracking-widest outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="••••"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={pin.length < 4}
              className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-white/90 disabled:opacity-50 transition-all"
            >
              Scanner öffnen
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-4 max-w-md mx-auto">
      {/* Header */}
      <header className="w-full flex justify-between items-center py-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold">Scanner</h1>
          <p className="text-sm text-white/50 border border-white/10 px-2 py-1 rounded-md inline-block mt-1">Terminal aktiv</p>
        </div>
        <button 
          onClick={() => { setIsAuthenticated(false); setPin(''); }}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main View */}
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        {scanStatus === 'idle' && (
          <div className="w-full animate-fade-in">
            <div className="glass-panel rounded-3xl overflow-hidden p-2 scanning-active">
              <div id="reader" className="w-full bg-black rounded-2xl overflow-hidden min-h-[300px]" ref={scannerRef}></div>
            </div>
            <p className="text-center text-white/60 mt-6 flex items-center justify-center gap-2">
              <Camera size={18} /> Halte den QR-Code des Kunden in die Kamera
            </p>
          </div>
        )}

        {scanStatus === 'loading' && (
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
            <h2 className="text-xl font-medium">Verarbeite...</h2>
          </div>
        )}

        {scanStatus === 'success' && (
          <div className="flex flex-col items-center justify-center text-center animate-fade-in glass-panel p-8 rounded-3xl w-full">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Erfolgreich!</h2>
            <p className="text-white/70 mb-6">{message}</p>
            {newPoints !== null && (
              <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 w-full">
                <p className="text-sm text-white/50 mb-1">Neuer Punktestand</p>
                <p className="text-3xl font-bold">{newPoints} / 12</p>
              </div>
            )}
            <p className="text-sm text-white/40 mt-8">Scanner öffnet sich gleich wieder...</p>
          </div>
        )}

        {scanStatus === 'error' && (
          <div className="flex flex-col items-center justify-center text-center animate-fade-in glass-panel p-8 rounded-3xl w-full">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Fehler</h2>
            <p className="text-white/70">{message}</p>
            <p className="text-sm text-white/40 mt-8">Scanner öffnet sich gleich wieder...</p>
          </div>
        )}
      </div>
    </main>
  );
}
