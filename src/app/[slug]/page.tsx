'use client';

import { useState, useEffect, useRef, use } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, XCircle, Loader2, Camera, LogOut, Download, Smartphone, Flashlight, Keyboard } from 'lucide-react';

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
  
  const [manualId, setManualId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  
  const scannerRef = useRef<HTMLDivElement>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Capture the PWA install prompt event
  useEffect(() => {
    // Save current slug so the root page knows where to redirect
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_merchant_slug', slug);
    }

    const isIOSDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(isIOSDevice);
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsStandalone(true);
    }

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
    } else {
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

      // Feedback: Vibration
      if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200]);
      }

      // Feedback: Soft "Pling" Sound (iOS compatible)
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'sine';
          // Higher frequency for a "pling"
          osc.frequency.setValueAtTime(1200, ctx.currentTime);
          
          // Envelope: Quick attack, exponential decay for bell-like sound
          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch(e) {}

    } catch (err: any) {
      setMessage(err.message);
      setScanStatus('error');
    } finally {
      setTimeout(() => {
        setScanStatus('idle');
        setNewPoints(null);
        setManualId('');
        if (scannerInstance) {
          try {
            scannerInstance.resume();
          } catch(e) {}
        }
      }, 4000);
    }
  };

  const toggleTorch = async () => {
    try {
      // Html5Qrcode doesn't expose a simple toggle for the Scanner wrapper easily, 
      // but we can try to grab the video track
      const video = document.querySelector('#reader video') as HTMLVideoElement;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        const imageCapture = new (window as any).ImageCapture(track);
        const capabilities = await imageCapture.getPhotoCapabilities();
        
        if (capabilities.fillLightMode && capabilities.fillLightMode.includes('flash')) {
          await track.applyConstraints({
            advanced: [{ torch: !torchOn } as any]
          });
          setTorchOn(!torchOn);
        }
      }
    } catch (err) {
      console.log('Torch not supported', err);
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

          {!isStandalone && (
            <button onClick={handleInstall} className="w-full mt-6 py-3 rounded-2xl border border-white/10 text-white/50 text-sm font-medium flex items-center justify-center gap-2 hover:border-[#D4AF37]/30 hover:text-white/70 transition-all">
              <Download size={16} /> App installieren
            </button>
          )}

          {showIOSHint && (
            <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/80" onClick={() => setShowIOSHint(false)}>
              <div className="w-full max-w-md p-6 rounded-3xl bg-[#111] border border-[#D4AF37]/30" onClick={e => e.stopPropagation()}>
                <h3 className="text-white font-bold text-lg mb-4">📲 App installieren</h3>
                {isIOS ? (
                  <div className="space-y-3 text-sm text-white/70">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                      <span className="text-xl">1️⃣</span>
                      <span>Tippe auf das <strong className="text-white">Teilen-Symbol</strong> (↑) unten in Safari</span>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                      <span className="text-xl">2️⃣</span>
                      <span>Wähle <strong className="text-white">"Zum Home-Bildschirm"</strong></span>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                      <span className="text-xl">3️⃣</span>
                      <span>Tippe auf <strong className="text-white">"Hinzufügen"</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-white/70">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                      <span className="text-xl">1️⃣</span>
                      <span>Tippe auf die <strong className="text-white">3 Punkte (⋮)</strong> oben rechts in Chrome</span>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                      <span className="text-xl">2️⃣</span>
                      <span>Wähle <strong className="text-white">"App installieren"</strong> oder <strong className="text-white">"Zum Startbildschirm"</strong></span>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                      <span className="text-xl">3️⃣</span>
                      <span>Tippe auf <strong className="text-white">"Installieren"</strong></span>
                    </div>
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
            <div className="w-full space-y-4">
              {/* Controls */}
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

              {/* Manual Input Field */}
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

              {/* Scanner */}
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
                  <p className="text-4xl font-black" style={{ color: primaryColor }}>{newPoints} / 9</p>
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
