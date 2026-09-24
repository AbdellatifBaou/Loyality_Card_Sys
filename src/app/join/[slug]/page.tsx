'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ArrowRight, MapPin, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { use } from 'react';

const DICT = {
  de: {
    merchantNotFound: "Händler nicht gefunden.",
    errorCreating: "Fehler beim Erstellen der Karte",
    exclusiveLoyalty: "Exklusives Treueprogramm",
    exclusiveBenefits1: "Exklusive",
    exclusiveBenefits2: "Vorteile & Specials",
    ready: "Bereit...",
    addToWallet: "Zum Wallet hinzufügen",
    addToAppleWallet: "Zu Apple Wallet hinzufügen",
    addToGoogleWallet: "In Google Wallet speichern",
    orChooseOther: "Anderes Wallet wählen",
    defaultReward: "10 Stempel = 1 GRATIS Belohnung",
  },
  en: {
    merchantNotFound: "Merchant not found.",
    errorCreating: "Error creating pass",
    exclusiveLoyalty: "Exclusive Loyalty Program",
    exclusiveBenefits1: "Exclusive",
    exclusiveBenefits2: "Benefits & Specials",
    ready: "Ready...",
    addToWallet: "Add to Wallet",
    addToAppleWallet: "Add to Apple Wallet",
    addToGoogleWallet: "Save to Google Wallet",
    orChooseOther: "Choose other wallet",
    defaultReward: "10 stamps = 1 FREE reward",
  },
  fr: {
    merchantNotFound: "Commerçant non trouvé.",
    errorCreating: "Erreur lors de la création de la carte",
    exclusiveLoyalty: "Programme de Fidélité Exclusif",
    exclusiveBenefits1: "Avantages",
    exclusiveBenefits2: "Exclusifs & Spéciaux",
    ready: "Prêt...",
    addToWallet: "Ajouter au Wallet",
    addToAppleWallet: "Ajouter à Apple Wallet",
    addToGoogleWallet: "Enregistrer dans Google Wallet",
    orChooseOther: "Choisir un autre portefeuille",
    defaultReward: "10 tampons = 1 récompense GRATUITE",
  }
};

export default function DynamicJoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;

  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/.test(ua);
      if (isIOS) setDeviceType('ios');
      else if (isAndroid) setDeviceType('android');
      else setDeviceType('other');
    }
  }, []);

  useEffect(() => {
    async function loadMerchant() {
      const { data, error } = await supabase
        .from('merchants_loyality')
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

  const handleJoinGoogle = async () => {
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
        throw new Error(data.error || DICT[(merchant?.language || 'de') as keyof typeof DICT]?.errorCreating || 'Error');
      }

      window.location.href = data.url;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleJoinApple = () => {
    setJoining(true);
    setError(null);
    try {
      window.location.href = `/api/wallet/apple/generate?slug=${encodeURIComponent(merchant.slug)}`;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTimeout(() => setJoining(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <Loader2 className="animate-spin text-white/50" size={32} />
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
  const primaryColor = merchant.primary_color || '#3b82f6';
  const logoUrl = merchant.logo_url || '/Aroma_logo.png';
  const lang = merchant.language || 'de';
  const t = DICT[lang as keyof typeof DICT] || DICT.de;
  const rewardText = merchant.reward_text || t.defaultReward;

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
          >{t.exclusiveLoyalty}</p>
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
      <div className="grid grid-cols-2 gap-4 mb-10 w-full max-w-sm px-4">
        <div 
          className="p-4 rounded-3xl flex flex-col items-start gap-4"
          style={{ 
            background: '#0F0F0F',
            border: '1px solid #222'
          }}
        >
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ background: `${primaryColor}1A`, border: `1px solid ${primaryColor}33` }}>
            {merchant.stamp_symbol || '✨'}
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
            <p className="font-bold text-white text-xs leading-snug">{t.exclusiveBenefits1}<br/>{t.exclusiveBenefits2}</p>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="w-full max-w-md px-6 pb-12 mt-4 space-y-3">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-4 text-xs">
            {error}
          </div>
        )}

        {/* Primary Action Button (Device-aware) */}
        {deviceType === 'ios' ? (
          <>
            <a
              href={`/api/wallet/apple/generate?slug=${encodeURIComponent(merchant.slug)}`}
              className="w-full font-black py-5 rounded-[22px] flex items-center justify-center gap-3 transition-all active:scale-95 overflow-hidden relative bg-black text-white border border-white/20 shadow-xl text-sm uppercase tracking-wider"
            >
              <span className="text-xl"></span> {t.addToAppleWallet}
              <ArrowRight size={18} strokeWidth={2.5} />
            </a>
            <button
              onClick={handleJoinGoogle}
              disabled={joining}
              className="w-full text-center text-xs font-bold text-white/50 hover:text-white pt-2 transition-colors cursor-pointer"
            >
              {t.addToGoogleWallet}
            </button>
          </>
        ) : deviceType === 'android' ? (
          <>
            <button
              onClick={handleJoinGoogle}
              disabled={joining}
              className="w-full font-black py-5 rounded-[22px] flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 overflow-hidden relative text-black text-sm uppercase tracking-wider shadow-xl cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                boxShadow: `0 15px 30px ${primaryColor}30`,
              }}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
              {t.addToGoogleWallet}
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
            <a
              href={`/api/wallet/apple/generate?slug=${encodeURIComponent(merchant.slug)}`}
              className="w-full text-center text-xs font-bold text-white/50 hover:text-white pt-2 transition-colors block"
            >
               {t.addToAppleWallet} (.pkpass)
            </a>
          </>
        ) : (
          <div className="space-y-3">
            <a
              href={`/api/wallet/apple/generate?slug=${encodeURIComponent(merchant.slug)}`}
              className="w-full font-bold py-4 rounded-[20px] flex items-center justify-center gap-3 transition-all active:scale-95 bg-black text-white border border-white/20 text-sm shadow-md"
            >
              <span className="text-lg"></span> {t.addToAppleWallet}
            </a>
            <button
              onClick={handleJoinGoogle}
              disabled={joining}
              className="w-full font-bold py-4 rounded-[20px] flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 text-black text-sm shadow-md"
              style={{ background: primaryColor }}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
              {t.addToGoogleWallet}
            </button>
          </div>
        )}
        
        <div className="flex items-center justify-center gap-2 pt-6 opacity-30">
          <div className="h-[1px] w-8 bg-white" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white">Powered by Marketif</span>
          <div className="h-[1px] w-8 bg-white" />
        </div>
      </div>
    </main>
  );
}