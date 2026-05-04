'use client';

import { useState, useEffect, useRef, use } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { CheckCircle2, XCircle, Loader2, Camera, LogOut, Download, Smartphone } from 'lucide-react';

export default function MerchantScannerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
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

  // Capture the PWA install prompt event
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

  // Login handler with slug validation
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      setIsAuthenticating(true);
      setAuthError('');
      try {
        const res = await fetch('/api/auth/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin, slug })
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
          scanner.pause(true);
          await processScan(decodedText, scanner);
        },
        (error) => {}
      );

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [isAuthenticated, scanStatus]);

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
        style={{ background: 'radial-gradient(circle at 50% 0%, #1a1608 0%, #050505 60%)' }}
      >
        <div 
          className="p-8 rounded-[40px] w-full max-w-md relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #0A0A0A 0%, #111111 100%)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-white">Scanner</h1>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40 text-white">Terminal für {slug}</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
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
            {authError && <p className="text-red-500 text-sm text-center font-medium">{authError}</p>}
            <button
              type="submit"
              disabled={pin.length < 4 || isAuthenticating}
              className="w-full font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #B8943B 0%, #E8C968 50%, #B8943B 100%)', color: '#000' }}
            >
              {isAuthenticating ? <Loader2 className="animate-spin" /> : 'Öffnen'}
            </button>
          </form>

          {(deferredPrompt || isIOS) && (
            <button onClick={handleInstall} className="w-full mt-6 py-3 rounded-2xl border border-white/10 text-white/50 text-sm font-medium">
              <Download size={16} className="inline mr-2" /> App installieren
            </button>
          )}

          {showIOSHint && (
            <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/70" onClick={() => setShowIOSHint(false)}>
              <div className="w-full max-w-md p-6 rounded-3xl bg-[#111] border border-[#D4AF37]/20" onClick={e => e.stopPropagation()}>
                <h3 className="text-white font-bold mb-4">iPhone Installation</h3>
                <p className="text-white/70 text-sm mb-4">Tippe auf das Teilen-Symbol und dann auf "Zum Home-Bildschirm".</p>
                <button onClick={() => setShowIOSHint(false)} className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#B8943B] to-[#E8C968] text-black font-bold">Verstanden</button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: '#050505' }}>
      <main className="flex flex-col items-center p-4 max-w-md mx-auto min-h-screen">
        <header className="w-full flex justify-between items-center py-6 border-b border-white/5 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">{merchantConfig?.name}</h1>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: primaryColor }}>Terminal aktiv</p>
          </div>
          <button onClick={() => { setIsAuthenticated(false); setPin(''); }} className="p-3 bg-white/5 rounded-xl border border-white/10">
            <LogOut size={20} className="text-white/60" />
          </button>
        </header>

        <div className="flex-1 w-full flex flex-col items-center justify-center">
          {scanStatus === 'idle' && (
            <div className="w-full space-y-6">
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                <button onClick={() => setStampAmount(1)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${stampAmount === 1 ? 'bg-[#D4AF37] text-black' : 'text-white/40'}`}>+1</button>
                <button onClick={() => setStampAmount(2)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${stampAmount === 2 ? 'bg-[#D4AF37] text-black' : 'text-white/40'}`}>+2</button>
              </div>
              <div className="p-2 rounded-3xl" style={{ background: `linear-gradient(145deg, ${primaryColor}20 0%, #111111 100%)`, border: `1px solid ${primaryColor}40` }}>
                <div id="reader" className="w-full bg-black rounded-2xl overflow-hidden min-h-[300px]" ref={scannerRef}></div>
              </div>
            </div>
          )}
          {scanStatus === 'loading' && <Loader2 className="w-12 h-12 animate-spin" style={{ color: primaryColor }} />}
          {scanStatus === 'success' && (
            <div className="text-center animate-fade-in w-full">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Erfolgreich!</h2>
              <p className="text-white/70 mb-6">{message}</p>
              {newPoints !== null && (
                <div className="p-5 rounded-2xl border border-white/10" style={{ background: `${primaryColor}10` }}>
                  <p className="text-4xl font-black" style={{ color: primaryColor }}>{newPoints} / 10</p>
                </div>
              )}
            </div>
          )}
          {scanStatus === 'error' && (
            <div className="text-center animate-fade-in w-full">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Fehler</h2>
              <p className="text-white/70">{message}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
