'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { CheckCircle2, XCircle, Loader2, Camera, LogOut, Download, Smartphone } from 'lucide-react';

export default function Home() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [merchantConfig, setMerchantConfig] = useState<any>(null);
  
  const [scanStatus, setScanStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [newPoints, setNewPoints] = useState<number | null>(null);
  const [stampAmount, setStampAmount] = useState(1);
  
  const scannerRef = useRef<HTMLDivElement>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  // Capture the PWA install prompt event (Android Chrome)
  useEffect(() => {
    const isIOSDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(isIOSDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSHint(true);
    }
  };

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
        body: JSON.stringify({ objectId, pin, amount: stampAmount }),
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
          background: 'radial-gradient(circle at 50% 0%, #1a1608 0%, #050505 60%)'
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

          {/* PWA Install Button */}
          {(deferredPrompt || isIOS) && (
            <div className="mt-6">
              <button
                onClick={handleInstall}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-all text-sm font-medium"
              >
                <Download size={16} />
                App installieren
              </button>
            </div>
          )}

          {/* iOS Install Hint Modal */}
          {showIOSHint && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={() => setShowIOSHint(false)}
            >
              <div
                className="w-full max-w-md p-6 rounded-3xl space-y-4"
                style={{ background: '#111', border: '1px solid rgba(212,175,55,0.2)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Smartphone size={20} style={{ color: '#D4AF37' }} />
                  <h3 className="text-white font-bold">App installieren (iPhone/iPad)</h3>
                </div>
                <ol className="space-y-3 text-sm text-white/70">
                  <li className="flex items-start gap-2"><span style={{ color: '#D4AF37' }} className="font-bold shrink-0">1.</span> Tippe auf das <strong className="text-white">Teilen-Symbol</strong> in der Safari-Menüleiste (Quadrat mit Pfeil nach oben)</li>
                  <li className="flex items-start gap-2"><span style={{ color: '#D4AF37' }} className="font-bold shrink-0">2.</span> Scrolle nach unten und tippe auf <strong className="text-white">„Zum Home-Bildschirm"</strong></li>
                  <li className="flex items-start gap-2"><span style={{ color: '#D4AF37' }} className="font-bold shrink-0">3.</span> Tippe oben rechts auf <strong className="text-white">„Hinzufügen"</strong></li>
                </ol>
                <button
                  onClick={() => setShowIOSHint(false)}
                  className="w-full py-3 rounded-2xl text-black font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #B8943B, #E8C968)' }}
                >
                  Verstanden
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Full-screen background wrapper, content centered inside
  return (
    <div className="min-h-screen w-full" style={{ background: '#050505' }}>
      <main className="flex flex-col items-center p-4 max-w-md mx-auto min-h-screen">
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
            <div className="w-full animate-fade-in space-y-6">
              {/* Multi-Stamp Toggle */}
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                <button 
                  onClick={() => setStampAmount(1)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${stampAmount === 1 ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-white/40 hover:text-white/60'}`}
                >
                  +1 Stempel
                </button>
                <button 
                  onClick={() => setStampAmount(2)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${stampAmount === 2 ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' : 'text-white/40 hover:text-white/60'}`}
                >
                  +2 Stempel
                </button>
              </div>

              <div 
                className="p-2 rounded-3xl"
                style={{ background: `linear-gradient(145deg, ${primaryColor}20 0%, #111111 100%)`, border: `1px solid ${primaryColor}40` }}
              >
                <div id="reader" className="w-full bg-black rounded-2xl overflow-hidden min-h-[300px]" ref={scannerRef}></div>
              </div>
              <p className="text-center text-white/40 flex items-center justify-center gap-2 text-sm font-medium">
                <Camera size={18} /> Halte den QR-Code in die Kamera
              </p>
            </div>
          )}

          {scanStatus === 'loading' && (
            <div className="flex flex-col items-center justify-center animate-fade-in">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: `${primaryColor}20` }}>
                <Loader2 className="w-12 h-12 animate-spin" style={{ color: primaryColor }} />
              </div>
              <h2 className="text-xl font-medium text-white">Verarbeite...</h2>
            </div>
          )}

          {scanStatus === 'success' && (
            <div className="flex flex-col items-center justify-center text-center animate-fade-in w-full">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 border border-green-500/30">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">Erfolgreich!</h2>
              <p className="text-white/70 mb-6">{message}</p>
              {newPoints !== null && (
                <div className="border border-white/10 rounded-2xl px-8 py-5 w-full text-center" style={{ background: `${primaryColor}10` }}>
                  <p className="text-sm text-white/50 mb-1">Neuer Punktestand</p>
                  <p className="text-4xl font-black" style={{ color: primaryColor }}>{newPoints} <span className="text-white/30 text-2xl">/ 10</span></p>
                </div>
              )}
              <p className="text-sm text-white/30 mt-8">Scanner öffnet sich gleich wieder...</p>
            </div>
          )}

          {scanStatus === 'error' && (
            <div className="flex flex-col items-center justify-center text-center animate-fade-in w-full">
              <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">Fehler</h2>
              <p className="text-white/70">{message}</p>
              <p className="text-sm text-white/30 mt-8">Scanner öffnet sich gleich wieder...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
