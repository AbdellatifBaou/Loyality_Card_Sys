'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { CheckCircle2, XCircle, Loader2, Camera, LogOut } from 'lucide-react';

export default function Home() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [merchantConfig, setMerchantConfig] = useState<any>(null);
  
  const [scanStatus, setScanStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [newPoints, setNewPoints] = useState<number | null>(null);
  
  const scannerRef = useRef<HTMLDivElement>(null);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      setIsAuthenticating(true);
      setAuthError('');
      try {
        const res = await fetch('/api/auth/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Login fehlgeschlagen');
        
        setMerchantConfig(data.merchant);
        setIsAuthenticated(true);
      } catch (err: any) {
        setAuthError(err.message);
      } finally {
        setIsAuthenticating(false);
      }
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

  const primaryColor = merchantConfig?.primary_color || '#D4AF37';

  if (!isAuthenticated) {
    return (
      <main 
        className="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in"
        style={{ 
          background: '#050505',
          backgroundImage: 'radial-gradient(circle at 50% 0%, #1a1608 0%, #050505 60%)'
        }}
      >
        <div 
          className="p-8 rounded-[40px] w-full max-w-md relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #0A0A0A 0%, #111111 100%)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.05)',
          }}
        >
          {/* Glossy overlay */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-white">Scanner</h1>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40 text-white">Bitte PIN eingeben</p>
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
                className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-2xl px-4 py-5 text-center text-3xl tracking-[0.5em] text-[#D4AF37] outline-none focus:border-[#D4AF37] transition-all placeholder:text-[#D4AF37]/20"
                placeholder="••••"
                autoFocus
              />
            </div>
            {authError && <p className="text-red-500 text-sm text-center font-medium">{authError}</p>}
            <button
              type="submit"
              disabled={pin.length < 4 || isAuthenticating}
              className="w-full font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #B8943B 0%, #E8C968 50%, #B8943B 100%)',
                color: '#000',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {isAuthenticating ? <Loader2 className="animate-spin" /> : 'Öffnen'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main 
      className="min-h-screen flex flex-col items-center p-4 max-w-md mx-auto"
      style={{ background: '#050505' }}
    >
      {/* Header */}
      <header className="w-full flex justify-between items-center py-6 animate-fade-in border-b border-white/5 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{merchantConfig?.name || 'Scanner'}</h1>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: primaryColor }}>Terminal aktiv</p>
        </div>
        <button 
          onClick={() => { setIsAuthenticated(false); setPin(''); }}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
        >
          <LogOut size={20} className="text-white/60" />
        </button>
      </header>

      {/* Main View */}
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        {scanStatus === 'idle' && (
          <div className="w-full animate-fade-in">
            <div 
              className="p-2 rounded-3xl"
              style={{ background: `linear-gradient(145deg, ${primaryColor}20 0%, #111111 100%)`, border: `1px solid ${primaryColor}40` }}
            >
              <div id="reader" className="w-full bg-black rounded-2xl overflow-hidden min-h-[300px]" ref={scannerRef}></div>
            </div>
            <p className="text-center text-white/40 mt-6 flex items-center justify-center gap-2 text-sm font-medium">
              <Camera size={18} /> Halte den QR-Code in die Kamera
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
                <p className="text-3xl font-bold">{newPoints} / 10</p>
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
