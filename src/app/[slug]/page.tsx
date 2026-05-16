'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { CheckCircle2, XCircle, Loader2, LogOut, Download, Flashlight, Keyboard, WifiOff, Clock, RefreshCw } from 'lucide-react';

const QUEUE_KEY = 'offline_stamp_queue';

type PendingScan = {
  objectId: string;
  pin: string;
  amount: number;
  timestamp: number;
};

function loadQueue(): PendingScan[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue: PendingScan[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function enqueue(item: PendingScan) {
  const q = loadQueue();
  q.push(item);
  saveQueue(q);
}

export default function MerchantScannerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [merchantConfig, setMerchantConfig] = useState<any>(null);

  const [scanStatus, setScanStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'queued'>('idle');
  const [message, setMessage] = useState('');
  const [newPoints, setNewPoints] = useState<number | null>(null);
  const [stampAmount, setStampAmount] = useState(1);

  const [manualId, setManualId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const scannerRef = useRef<HTMLDivElement>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const syncQueue = useCallback(async (currentPin: string) => {
    const queue = loadQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    const remaining: PendingScan[] = [];

    for (const item of queue) {
      try {
        const res = await fetch('/api/wallet/stamp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objectId: item.objectId, pin: item.pin, amount: item.amount }),
        });
        if (!res.ok) remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }

    saveQueue(remaining);
    setPendingCount(remaining.length);
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_merchant_slug', slug);
      setPendingCount(loadQueue().length);
      setIsOnline(navigator.onLine);
    }

    const isIOSDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(isIOSDevice);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsStandalone(true);
    }

    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && isAuthenticated && pin) {
      syncQueue(pin);
    }
  }, [isOnline, isAuthenticated, pin, syncQueue]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      setShowIOSHint(true);
    }
  };

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
        () => {}
      );

      return () => { scanner.clear().catch(console.error); };
    }
  }, [isAuthenticated, scanStatus]);

  const playPling = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  const processScan = async (objectId: string, scannerInstance: any) => {
    setScanStatus('loading');

    try {
      const response = await fetch('/api/wallet/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectId, pin, amount: stampAmount }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Fehler beim Stempeln');

      setNewPoints(data.newPoints);
      setMessage(data.type === 'redeem' ? 'Belohnung erreicht! Punkte wurden zurückgesetzt.' : 'Stempel erfolgreich hinzugefügt!');
      setScanStatus('success');

      if (navigator.vibrate) navigator.vibrate([200]);
      playPling();

      // After a successful online scan, sync any queued items
      syncQueue(pin);

    } catch (err: any) {
      const isNetworkError = !navigator.onLine || err instanceof TypeError;

      if (isNetworkError) {
        enqueue({ objectId, pin, amount: stampAmount, timestamp: Date.now() });
        setPendingCount(loadQueue().length);
        setMessage('Offline gespeichert – wird automatisch synchronisiert wenn du wieder online bist.');
        setScanStatus('queued');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } else {
        setMessage(err.message);
        setScanStatus('error');
      }
    } finally {
      setTimeout(() => {
        setScanStatus('idle');
        setNewPoints(null);
        setManualId('');
        if (scannerInstance) {
          try { scannerInstance.resume(); } catch {}
        }
      }, 4000);
    }
  };

  const toggleTorch = async () => {
    try {
      const video = document.querySelector('#reader video') as HTMLVideoElement;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        const imageCapture = new (window as any).ImageCapture(track);
        const capabilities = await imageCapture.getPhotoCapabilities();
        if (capabilities.fillLightMode?.includes('flash')) {
          await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
          setTorchOn(!torchOn);
        }
      }
    } catch {}
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

          {!isStandalone && (
            <button onClick={handleInstall} className="w-full mt-6 py-3 rounded-2xl border border-white/10 text-white/50 text-sm font-medium flex items-center justify-center gap-2 hover:border-[#D4AF37]/30 hover:text-white/70 transition-all">
              <Download size={16} /> App installieren
            </button>
          )}

          {showIOSHint && (
            <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/80" onClick={() => setShowIOSHint(false)}>
              <div className="w-full max-w-md p-6 rounded-3xl bg-[#111] border border-[#D4AF37]/30" onClick={e => e.stopPropagation()}>
                <h3 className="text-white font-bold text-lg mb-4">App installieren</h3>
                {isIOS ? (
                  <div className="space-y-3 text-sm text-white/70">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5"><span className="text-xl">1</span><span>Tippe auf das <strong className="text-white">Teilen-Symbol</strong> (↑) unten in Safari</span></div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5"><span className="text-xl">2</span><span>Wähle <strong className="text-white">"Zum Home-Bildschirm"</strong></span></div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5"><span className="text-xl">3</span><span>Tippe auf <strong className="text-white">"Hinzufügen"</strong></span></div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-white/70">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5"><span className="text-xl">1</span><span>Tippe auf die <strong className="text-white">3 Punkte (⋮)</strong> oben rechts in Chrome</span></div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5"><span className="text-xl">2</span><span>Wähle <strong className="text-white">"App installieren"</strong></span></div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5"><span className="text-xl">3</span><span>Tippe auf <strong className="text-white">"Installieren"</strong></span></div>
                  </div>
                )}
                <button onClick={() => setShowIOSHint(false)} className="w-full mt-5 py-3 rounded-2xl bg-gradient-to-r from-[#B8943B] to-[#E8C968] text-black font-bold">Verstanden</button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: '#050505' }}>
      {/* Offline banner */}
      {!isOnline && (
        <div className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold tracking-wide bg-amber-500/20 border-b border-amber-500/30 text-amber-400">
          <WifiOff size={12} />
          Offline – Scans werden lokal gespeichert
        </div>
      )}

      <main className="flex flex-col items-center p-4 max-w-md mx-auto min-h-screen">
        <header className="w-full flex justify-between items-center py-6 border-b border-white/5 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">{merchantConfig?.name}</h1>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: primaryColor }}>
              {isOnline ? 'Terminal aktiv' : 'Offline-Modus'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Pending badge + sync button */}
            {pendingCount > 0 && (
              <button
                onClick={() => syncQueue(pin)}
                disabled={!isOnline || isSyncing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-bold disabled:opacity-50 transition-all active:scale-95"
                title="Ausstehende Scans synchronisieren"
              >
                {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {pendingCount} ausstehend
              </button>
            )}
            <button onClick={() => { setIsAuthenticated(false); setPin(''); }} className="p-3 bg-white/5 rounded-xl border border-white/10">
              <LogOut size={20} className="text-white/60" />
            </button>
          </div>
        </header>

        <div className="flex-1 w-full flex flex-col items-center justify-center">
          {scanStatus === 'idle' && (
            <div className="w-full space-y-4">
              <div className="flex gap-2">
                <div className="flex flex-1 bg-white/5 p-1 rounded-2xl border border-white/10">
                  <button onClick={() => setStampAmount(1)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${stampAmount === 1 ? 'bg-[#D4AF37] text-black' : 'text-white/40'}`}>+1</button>
                  <button onClick={() => setStampAmount(2)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${stampAmount === 2 ? 'bg-[#D4AF37] text-black' : 'text-white/40'}`}>+2</button>
                </div>
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${showManualInput ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-white/5 text-white/60 border-white/10'}`}
                >
                  <Keyboard size={20} />
                </button>
                <button
                  onClick={toggleTorch}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${torchOn ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-white/5 text-white/60 border-white/10'}`}
                >
                  <Flashlight size={20} />
                </button>
              </div>

              {showManualInput && (
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 animate-fade-in">
                  <input
                    type="text"
                    placeholder="Kunden-ID eingeben..."
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    className="flex-1 bg-transparent px-4 py-3 text-white outline-none font-mono text-sm placeholder:text-white/30"
                    onKeyDown={(e) => { if (e.key === 'Enter' && manualId) processScan(manualId, null); }}
                  />
                  <button
                    onClick={() => { if (manualId) processScan(manualId, null); }}
                    className="bg-[#D4AF37] text-black px-6 py-3 rounded-xl font-bold active:scale-95 transition-all"
                  >
                    OK
                  </button>
                </div>
              )}

              <div className="p-2 rounded-3xl" style={{ background: `linear-gradient(145deg, ${primaryColor}20 0%, #111111 100%)`, border: `1px solid ${primaryColor}40` }}>
                <div id="reader" className="w-full bg-black rounded-2xl overflow-hidden min-h-[300px]" ref={scannerRef}></div>
              </div>
            </div>
          )}

          {scanStatus === 'loading' && (
            <Loader2 className="w-12 h-12 animate-spin" style={{ color: primaryColor }} />
          )}

          {scanStatus === 'success' && (
            <div className="text-center animate-fade-in w-full">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Erfolgreich!</h2>
              <p className="text-white/70 mb-6">{message}</p>
              <div className="p-6 rounded-[32px] border border-white/10" style={{ background: `${primaryColor}15` }}>
                <p className="text-5xl font-black mb-1" style={{ color: primaryColor }}>
                  {newPoints} <span className="text-2xl opacity-40">/ 9</span>
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">Aktueller Punktestand</p>
              </div>
            </div>
          )}

          {scanStatus === 'queued' && (
            <div className="text-center animate-fade-in w-full">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Offline gespeichert</h2>
              <p className="text-white/60 text-sm mb-6">{message}</p>
              <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10">
                <p className="text-amber-400 font-bold text-sm">{pendingCount} Scan{pendingCount !== 1 ? 's' : ''} warte{pendingCount === 1 ? 't' : 'n'} auf Synchronisierung</p>
              </div>
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
