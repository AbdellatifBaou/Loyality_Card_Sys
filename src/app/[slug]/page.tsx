'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { notFound } from 'next/navigation';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';
import { SCANNER_DICT } from '@/locales/admin';
import { CheckCircle2, XCircle, Loader2, LogOut, Download, Flashlight, Keyboard, WifiOff, Clock, RefreshCw, AlertTriangle } from 'lucide-react';

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
  const [preMerchant, setPreMerchant] = useState<any>(null);
  const [preLoading, setPreLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  
  useEffect(() => {
    async function loadPreMerchant() {
      const { data } = await supabase.from('merchants_loyality').select('*').eq('slug', slug).single();
      if (data) {
        setPreMerchant(data);
      } else {
        setIsNotFound(true);
      }
      setPreLoading(false);
    }
    loadPreMerchant();
  }, [slug]);

  if (isNotFound) {
    notFound();
  }

  const lang = merchantConfig?.language || preMerchant?.language || 'de';
  const t = SCANNER_DICT[lang as keyof typeof SCANNER_DICT] || SCANNER_DICT.de;

  const primaryColor = merchantConfig?.primary_color || preMerchant?.primary_color || '#D4AF37';

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
        if (!res.ok) throw new Error(data.error || t.loginFailed);
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

      if (!response.ok) throw new Error(data.error || t.errorStamping);

      setNewPoints(data.newPoints);
      setMessage(data.type === 'redeem' ? t.rewardReached : t.stampAddedSuccess);
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
        setMessage(t.offlineSavedDesc);
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
  if (!isAuthenticated) {
    if (preLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white/50"></div>
        </div>
      );
    }
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
            <img src="/Marketif_LOGO_Symbol.png" alt="Marketif" className="h-12 w-auto mx-auto mb-5 opacity-90" style={{ filter: 'brightness(0) invert(1)' }} />
            <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-white">{t.scannerTitle}</h1>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40 text-white">{t.terminalFor} {slug}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-black/50 border rounded-2xl px-4 py-5 text-center text-3xl tracking-[0.5em] outline-none transition-all" style={{ borderColor: `${primaryColor}33`, color: primaryColor }}
              placeholder="••••"
              autoFocus
            />
            {authError && <p className="text-red-500 text-sm text-center font-medium">{authError}</p>}
            <button
              type="submit"
              disabled={pin.length < 4 || isAuthenticating}
              className="w-full font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: primaryColor, color: '#000' }}
            >
              {isAuthenticating ? <Loader2 className="animate-spin" /> : t.open}
            </button>
          </form>

          {!isStandalone && (
            <button onClick={handleInstall} className="w-full mt-6 py-3 rounded-2xl border border-white/10 text-white/50 text-sm font-medium flex items-center justify-center gap-2 hover: hover:text-white/70 transition-all">
              <Download size={16} /> {t.installApp}
            </button>
          )}

          {showIOSHint && (
            <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/80" onClick={() => setShowIOSHint(false)}>
              <div className="w-full max-w-md p-6 rounded-3xl bg-[#111] border " onClick={e => e.stopPropagation()}>
                <h3 className="text-white font-bold text-lg mb-4">{t.installApp}</h3>
                {isIOS ? (
                  <div className="space-y-3 text-sm text-white/70">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5"><span className="text-xl">1</span><span>{t.tapShareIcon.split('(↑)')[0]} <strong className="text-white">(↑)</strong> {t.tapShareIcon.split('(↑)')[1]}</span></div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5"><span className="text-xl">2</span><span>{t.chooseAddToHome.split("'")[0]} <strong className="text-white">"{t.chooseAddToHome.split("'")[1]}"</strong></span></div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5"><span className="text-xl">3</span><span>{t.tapAdd.split("'")[0]} <strong className="text-white">"{t.tapAdd.split("'")[1]}"</strong></span></div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-white/70">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5"><span className="text-xl">1</span><span>{t.tap3Dots.split('(⋮)')[0]} <strong className="text-white">(⋮)</strong> {t.tap3Dots.split('(⋮)')[1]}</span></div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5"><span className="text-xl">2</span><span>{t.chooseText} <strong className="text-white">"{t.installApp}"</strong></span></div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5"><span className="text-xl">3</span><span>{t.tapInstall.split("'")[0]} <strong className="text-white">"{t.tapInstall.split("'")[1]}"</strong></span></div>
                  </div>
                )}
                <button onClick={() => setShowIOSHint(false)} className="w-full mt-5 py-3 rounded-2xl text-black font-bold" style={{ backgroundColor: primaryColor }}>{t.understood}</button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (merchantConfig?.is_active === false) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: '#050505' }}>
        <div className="bg-[#111] border border-red-500/30 rounded-3xl p-8 text-center max-w-md w-full shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
             <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-4">{t.terminalLocked}</h2>
          <p className="text-white/60 mb-8 text-sm">
            {t.merchantAccountDeactivated.split('Dashboard')[0]} <strong className="text-white">{t.dashboardText}</strong> {t.merchantAccountDeactivated.split('Dashboard')[1]}
          </p>
          <button onClick={() => { setIsAuthenticated(false); setPin(''); }} className="w-full py-4 bg-white/5 text-white rounded-2xl font-bold border border-white/10 hover:bg-white/10 transition-colors">
            Ausloggen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: '#050505' }}>
      {/* Offline banner */}
      {!isOnline && (
        <div className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold tracking-wide border-b" style={{ backgroundColor: `${primaryColor}33`, borderColor: `${primaryColor}4D`, color: primaryColor }}>
          <WifiOff size={12} />
          {t.offlineScansSavedLocally}
        </div>
      )}

      <main className="flex flex-col items-center p-4 max-w-md mx-auto min-h-screen">
        <header className="w-full flex justify-between items-center py-6 border-b border-white/5 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">{merchantConfig?.name}</h1>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: primaryColor }}>
              {isOnline ? t.terminalActive : t.offlineMode}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Pending badge + sync button */}
            {pendingCount > 0 && (
              <button
                onClick={() => syncQueue(pin)}
                disabled={!isOnline || isSyncing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold disabled:opacity-50 transition-all active:scale-95" style={{ borderColor: `${primaryColor}66`, backgroundColor: `${primaryColor}1A`, color: primaryColor }}
                title={t.syncPendingScans}
              >
                {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {pendingCount} {t.pending}
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
                  <button onClick={() => setStampAmount(1)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${stampAmount === 1 ? 'text-black' : 'text-white/40'}`} style={stampAmount === 1 ? { backgroundColor: primaryColor } : {}}>+1</button>
                  <button onClick={() => setStampAmount(2)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${stampAmount === 2 ? 'text-black' : 'text-white/40'}`} style={stampAmount === 2 ? { backgroundColor: primaryColor } : {}}>+2</button>
                </div>
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${!showManualInput && 'bg-white/5 text-white/60 border-white/10'}`} style={showManualInput ? { backgroundColor: primaryColor, borderColor: primaryColor, color: '#000' } : {}}
                >
                  <Keyboard size={20} />
                </button>
                <button
                  onClick={toggleTorch}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${!torchOn && 'bg-white/5 text-white/60 border-white/10'}`} style={torchOn ? { backgroundColor: primaryColor, borderColor: primaryColor, color: '#000' } : {}}
                >
                  <Flashlight size={20} />
                </button>
              </div>

              {showManualInput && (
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 animate-fade-in">
                  <input
                    type="text"
                    placeholder={t.enterCustomerId}
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    className="flex-1 bg-transparent px-4 py-3 text-white outline-none font-mono text-sm placeholder:text-white/30"
                    onKeyDown={(e) => { if (e.key === 'Enter' && manualId) processScan(manualId, null); }}
                  />
                  <button
                    onClick={() => { if (manualId) processScan(manualId, null); }}
                    className="text-black px-6 py-3 rounded-xl font-bold active:scale-95 transition-all" style={{ backgroundColor: primaryColor }}
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
              <h2 className="text-2xl font-bold text-white mb-2">{t.successTitle}</h2>
              <p className="text-white/70 mb-6">{message}</p>
              <div className="p-6 rounded-[32px] border border-white/10" style={{ background: `${primaryColor}15` }}>
                <p className="text-5xl font-black mb-1" style={{ color: primaryColor }}>
                  {newPoints} <span className="text-2xl opacity-40">/ {merchantConfig?.stamp_goal || 9}</span>
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">{t.currentPointBalance}</p>
              </div>
            </div>
          )}

          {scanStatus === 'queued' && (
            <div className="text-center animate-fade-in w-full">
              <div className="w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${primaryColor}33`, borderColor: `${primaryColor}66`, color: primaryColor }}>
                <Clock className="w-8 h-8 " />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{t.offlineSavedTitle}</h2>
              <p className="text-white/60 text-sm mb-6">{message}</p>
              <div className="p-4 rounded-2xl border" style={{ borderColor: `${primaryColor}33`, backgroundColor: `${primaryColor}1A` }}>
                <p className=" font-bold text-sm">{t.scansWaitingForSync(pendingCount)}</p>
              </div>
            </div>
          )}

          {scanStatus === 'error' && (
            <div className="text-center animate-fade-in w-full">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">{t.errorTitle}</h2>
              <p className="text-white/70">{message}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
