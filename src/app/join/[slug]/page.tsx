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

  const address = merchant.address || null;
  const primaryColor = merchant.primary_color || '#3b82f6'; // Fallback blue
  const logoUrl = merchant.logo_url || '/Aroma_logo.png'; // Fallback
  const rewardText = merchant.reward_text || '10 Stempel = 1 GRATIS Getränk';

  return (
    <main
      className="min-h-screen flex flex-col items-center animate-fade-in"
      style={{ 
        background: '#050505',
        backgroundImage: `radial-gradient(circle at 50% 0%, ${primaryColor}20 0%, #050505 60%)`
      }}
    >
        {/* Hero Section */}
        <div className="w-full flex flex-col items-center pt-16 pb-10 px-6 relative overflow-hidden">
          {/* Animated Glow */}
          <div 
            className="absolute top-[-100px] w-[500px] h-[300px] opacity-20 blur-[100px]"
            style={{ background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)` }}
          />

          <div className="relative group cursor-pointer mb-8">
            <div className="absolute inset-0 opacity-20 blur-2xl group-hover:opacity-40 transition-opacity rounded-full" style={{ background: primaryColor }} />
            <img
              src={logoUrl}
              alt={merchant.name}
              className="w-32 h-32 object-contain rounded-3xl relative z-10 shadow-2xl bg-black/40"
              style={{ border: `1px solid ${primaryColor}40` }}
            />
          </div>

          <div className="text-center relative z-10">
            <p
              className="text-[10px] font-black tracking-[0.6em] uppercase mb-3 opacity-60"
              style={{ color: primaryColor }}
            >
              Exklusives Treueprogramm
            </p>
            <h1 className="text-5xl font-extrabold text-white leading-none tracking-tight mb-4">
              {merchant.name}
            </h1>
            
            {address && (
              <div
                className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <MapPin size={14} style={{ color: primaryColor }} />
                <span>{address}</span>
              </div>
            )}
          </div>
        </div>



        {/* Info Cards */}
        <div className="w-full max-w-md px-6 grid grid-cols-2 gap-3 mb-10 mt-6">
          <div
            className="p-5 rounded-3xl flex flex-col gap-3"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${primaryColor}1A`, border: `1px solid ${primaryColor}33` }}>
              <Coffee size={20} style={{ color: primaryColor }} />
            </div>
            <div>
              <p className="font-bold text-white text-xs leading-snug">{rewardText}</p>
            </div>
          </div>
          
          <div
            className="p-5 rounded-3xl flex flex-col gap-3"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${primaryColor}1A`, border: `1px solid ${primaryColor}33` }}>
              <Star size={20} style={{ color: primaryColor }} />
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
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
              boxShadow: `0 20px 40px ${primaryColor}40`,
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

}
