'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ArrowRight, MapPin, Coffee, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { use } from 'react';

export default function DynamicJoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;

  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadMerchant() {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setError('Händler nicht gefunden.');
      } else {
        setMerchant(data);
      }
      setLoading(false);
    }
    loadMerchant();
  }, [slug]);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);

    try {
      const response = await fetch('/api/wallet/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantName: merchant.name,
          classId: `marketif_loyalty_${merchant.slug}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen der Karte');
      }

      window.location.href = data.url;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <Loader2 className="animate-spin" style={{ color: '#C8A84B' }} size={32} />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6" style={{ background: '#0A0A0A' }}>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const isAroma = merchant.slug === 'aroma';
  const address = merchant.address ?? (isAroma ? 'Steingasse 7, 86150 Augsburg' : null);

  if (isAroma) {
    return (
      <main
        className="min-h-screen flex flex-col items-center animate-fade-in"
        style={{ 
          background: '#050505',
          backgroundImage: 'radial-gradient(circle at 50% 0%, #1a1608 0%, #050505 60%)'
        }}
      >
        {/* Hero Section */}
        <div className="w-full flex flex-col items-center pt-16 pb-10 px-6 relative overflow-hidden">
          {/* Animated Gold Glow */}
          <div 
            className="absolute top-[-100px] w-[500px] h-[300px] opacity-30 blur-[100px]"
            style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }}
          />

          <div className="relative group cursor-pointer mb-8">
            <div className="absolute inset-0 bg-[#D4AF37] opacity-20 blur-2xl group-hover:opacity-40 transition-opacity rounded-full" />
            <img
              src="/Aroma_logo.png"
              alt="Restaurant Aroma"
              className="w-32 h-32 object-contain rounded-3xl relative z-10 border border-[#D4AF37]/30 shadow-2xl"
            />
          </div>

          <div className="text-center relative z-10">
            <p
              className="text-[10px] font-black tracking-[0.6em] uppercase mb-3 opacity-60"
              style={{ color: '#D4AF37' }}
            >
              Exklusives Treueprogramm
            </p>
            <h1 className="text-5xl font-extrabold text-white leading-none tracking-tight mb-4">
              Restaurant Aroma
            </h1>
            
            {address && (
              <div
                className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <MapPin size={14} style={{ color: '#D4AF37' }} />
                <span>{address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Digital Card Preview */}
        <div className="w-full max-w-md px-6 mb-10">
          <div
            className="rounded-[40px] p-8 relative overflow-hidden group"
            style={{
              background: 'linear-gradient(145deg, #0A0A0A 0%, #111111 100%)',
              border: '1px solid rgba(212, 175, 55, 0.15)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.05)',
            }}
          >
            {/* Glossy overlay */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
            
            <div className="flex justify-between items-center mb-8">
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40 text-white">Digital Member Card</span>
              <div className="bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-wider">Aroma Rewards</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-full flex items-center justify-center relative transition-all duration-500 hover:scale-110"
                  style={{
                    border: '1.5px dashed rgba(212, 175, 55, 0.25)',
                    background: 'rgba(212, 175, 55, 0.03)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  <span className="text-[10px] font-bold text-[#D4AF37]/20">{i + 1}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center">
              <p className="text-[#D4AF37] text-sm font-bold flex items-center gap-2">
                <Star size={16} fill="#D4AF37" /> 10 Stempel = 1 GRATIS Getränk 🎁
              </p>
              <p className="text-[10px] uppercase tracking-widest mt-2 opacity-30 text-white">Digital im Google Wallet speicherbar</p>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="w-full max-w-md px-6 grid grid-cols-2 gap-3 mb-10">
          <div
            className="p-5 rounded-3xl flex flex-col gap-3"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
              <Coffee size={20} style={{ color: '#D4AF37' }} />
            </div>
            <div>
              <p className="font-bold text-white text-xs leading-snug">Jeder 10. Kaffee<br/>auf Kosten des Hauses</p>
            </div>
          </div>
          
          <div
            className="p-5 rounded-3xl flex flex-col gap-3"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
              <Star size={20} style={{ color: '#D4AF37' }} />
            </div>
            <div>
              <p className="font-bold text-white text-xs leading-snug">Exklusive<br/>Vorteile & Specials</p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="w-full max-w-md px-6 pb-12 mt-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-4 text-xs">
              {error}
            </div>
          )}
          
          <button
            onClick={handleJoin}
            disabled={joining || success}
            className="w-full font-black py-6 rounded-[24px] flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-50 overflow-hidden relative"
            style={{
              background: 'linear-gradient(135deg, #B8943B 0%, #E8C968 50%, #B8943B 100%)',
              boxShadow: '0 20px 40px rgba(184, 148, 59, 0.4)',
              color: '#000',
              fontSize: '15px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {/* Button Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 translate-x-[-100%] animate-[shine_3s_infinite]" />
            
            {joining ? (
              <Loader2 className="animate-spin" size={24} />
            ) : success ? (
              <>
                <CheckCircle2 size={24} /> Bereit...
              </>
            ) : (
              <>
                Karte zum Wallet hinzufügen <ArrowRight size={22} strokeWidth={3} />
              </>
            )}
          </button>
          
          <div className="flex items-center justify-center gap-2 mt-6 opacity-30">
            <div className="h-[1px] w-8 bg-white" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">Powered by Marketif</span>
            <div className="h-[1px] w-8 bg-white" />
          </div>
        </div>
      </main>
    );
  }

  // Generischer Fallback für andere Merchants
  const logoUrl = null;
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm w-full space-y-8 animate-fade-in">
        <div className="mx-auto w-32 h-32 flex items-center justify-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={merchant.name}
              className="w-full h-full object-contain rounded-2xl shadow-2xl"
            />
          ) : (
            <div className="w-24 h-24 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center text-2xl font-bold">
              {merchant.name.substring(0, 2)}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Digitale Stempelkarte</h1>
          <p className="text-white/60 text-lg">
            Sammle Stempel bei <strong>{merchant.name}</strong> und sichere dir bei
            10 Stempeln ein Gratis-Getränk!
          </p>
        </div>

        <div className="grid gap-4 text-left py-4">
          <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
            <CheckCircle2 className="text-green-500 mt-1 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium">Jeder 10. Kaffee geht auf uns</p>
              <p className="text-sm text-white/40">
                Einfach Karte vorzeigen und Stempel sammeln.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
            <CheckCircle2 className="text-green-500 mt-1 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium">Immer griffbereit</p>
              <p className="text-sm text-white/40">
                Kein Papierkram. Direkt in deinem Google Wallet.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleJoin}
            disabled={joining || success}
            className="w-full bg-blue-600 hover:brightness-110 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-black/20 disabled:opacity-50"
          >
            {joining ? (
              <Loader2 className="animate-spin" size={24} />
            ) : success ? (
              <>
                Wird hinzugefügt... <CheckCircle2 size={24} />
              </>
            ) : (
              <>
                Karte hinzufügen <ArrowRight size={24} />
              </>
            )}
          </button>
          <p className="text-xs text-white/30 mt-4">
            Kompatibel mit Google Wallet auf Android.
          </p>
        </div>
      </div>
    </main>
  );
}
