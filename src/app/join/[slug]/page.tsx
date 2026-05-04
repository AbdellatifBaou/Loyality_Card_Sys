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
        style={{ background: '#0A0A0A' }}
      >
        {/* Hero mit Gold-Glow */}
        <div
          className="w-full flex flex-col items-center pt-14 pb-8 px-6"
          style={{
            background:
              'radial-gradient(ellipse 90% 50% at 50% 0%, rgba(200, 168, 75, 0.2) 0%, transparent 100%)',
          }}
        >
          <img
            src="/Aroma_logo.png"
            alt="Restaurant Aroma"
            className="w-28 h-28 object-contain rounded-2xl mb-5"
            style={{
              boxShadow:
                '0 0 60px rgba(200, 168, 75, 0.4), 0 12px 40px rgba(0,0,0,0.7)',
            }}
          />

          <p
            className="text-xs font-bold tracking-[0.4em] uppercase mb-2"
            style={{ color: '#C8A84B' }}
          >
            Treueprogramm
          </p>
          <h1 className="text-4xl font-bold text-white text-center leading-tight tracking-tight">
            Restaurant Aroma
          </h1>

          {address && (
            <div
              className="flex items-center gap-2 mt-3 text-sm"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              <MapPin size={13} style={{ color: '#C8A84B', flexShrink: 0 }} />
              <span>{address}</span>
            </div>
          )}
        </div>

        {/* Stempelkarten-Vorschau */}
        <div className="w-full max-w-sm px-6 mb-5">
          <p
            className="text-center text-xs tracking-widest uppercase mb-3"
            style={{ color: 'rgba(255,255,255,0.28)' }}
          >
            Deine digitale Stempelkarte
          </p>
          <div
            className="rounded-3xl p-5"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(200, 168, 75, 0.18)',
              boxShadow: 'inset 0 1px 0 rgba(200, 168, 75, 0.08)',
            }}
          >
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-full flex items-center justify-center"
                  style={{
                    border: '2px dashed rgba(200, 168, 75, 0.28)',
                    background: 'rgba(200, 168, 75, 0.04)',
                  }}
                />
              ))}
            </div>
            <p
              className="text-center text-xs mt-4"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              10 Stempel = 1 Gratis-Getränk 🎁
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="w-full max-w-sm px-6 space-y-2.5 mb-6">
          <div
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.028)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <Star size={17} className="mt-0.5 flex-shrink-0" style={{ color: '#C8A84B' }} />
            <div>
              <p className="font-semibold text-white text-sm">
                Jeder 10. Besuch geht auf uns
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Einfach Karte vorzeigen und Stempel sammeln.
              </p>
            </div>
          </div>
          <div
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.028)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <Coffee size={17} className="mt-0.5 flex-shrink-0" style={{ color: '#C8A84B' }} />
            <div>
              <p className="font-semibold text-white text-sm">
                Immer dabei, nie verlieren
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Direkt in deinem Google Wallet gespeichert.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="w-full max-w-sm px-6 pb-10 mt-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleJoin}
            disabled={joining || success}
            className="w-full font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all text-black disabled:opacity-60"
            style={{
              background:
                'linear-gradient(135deg, #B8943B 0%, #E8C968 50%, #B8943B 100%)',
              boxShadow: '0 6px 32px rgba(200, 168, 75, 0.5)',
              fontSize: '16px',
              letterSpacing: '0.02em',
            }}
          >
            {joining ? (
              <Loader2 className="animate-spin" size={22} />
            ) : success ? (
              <>
                <CheckCircle2 size={22} /> Wird hinzugefügt...
              </>
            ) : (
              <>
                Karte zum Wallet hinzufügen <ArrowRight size={20} />
              </>
            )}
          </button>
          <p
            className="text-xs text-center mt-4"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            Kompatibel mit Google Wallet auf Android
          </p>
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
