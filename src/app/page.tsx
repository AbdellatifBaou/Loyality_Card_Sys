'use client';

import { ArrowRight, CheckCircle, ShieldCheck, Sparkles, Smartphone, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // If the user opens the PWA or is in standalone mode, redirect to their last used terminal
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isPwaSource = window.location.search.includes('source=pwa');
    
    if (isStandalone || isPwaSource) {
      const lastSlug = localStorage.getItem('last_merchant_slug');
      if (lastSlug) {
        router.replace(`/${lastSlug}`);
      }
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#D4AF37] selection:text-black">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(circle_at_center,_#1a1608_0%,_transparent_70%)] opacity-60" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in">
            <Sparkles size={16} className="text-[#D4AF37]" />
            <span className="text-xs font-bold tracking-widest uppercase text-white/60">Premium Loyalty Solutions</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight">
            Marketif <span className="bg-gradient-to-r from-[#D4AF37] via-[#F3D179] to-[#B8943B] bg-clip-text text-transparent">Loyalty</span>
          </h1>
          
          <p className="text-xl text-white/50 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
            Revolutionieren Sie Ihre Kundenbindung mit digitalen Stempelkarten für Google Wallet & Apple Wallet. Premium, einfach und effektiv.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/dashboard"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#B8943B] to-[#E8C968] text-black font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              Zum Admin Dashboard <ArrowRight size={20} />
            </Link>
            <div className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 text-white/60 font-bold backdrop-blur-sm">
              Für Restaurants & Cafés
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-[40px] bg-white/3 border border-white/5 hover:border-[#D4AF37]/30 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="text-[#D4AF37]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Digitale Wallets</h3>
              <p className="text-white/40 text-sm leading-relaxed">Keine Papierkarten mehr. Kunden tragen ihre Treuekarte direkt in Google & Apple Wallet.</p>
            </div>

            <div className="p-8 rounded-[40px] bg-white/3 border border-white/5 hover:border-[#D4AF37]/30 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="text-[#D4AF37]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Live Analytics</h3>
              <p className="text-white/40 text-sm leading-relaxed">Verfolgen Sie in Echtzeit, wie viele Karten im Umlauf sind und wie oft Kunden wiederkehren.</p>
            </div>

            <div className="p-8 rounded-[40px] bg-white/3 border border-white/5 hover:border-[#D4AF37]/30 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="text-[#D4AF37]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Multi-Tenant</h3>
              <p className="text-white/40 text-sm leading-relaxed">Verwalten Sie mehrere Standorte oder Partner mit dedizierten Dashboards und Scannern.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-20 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-12 opacity-30 grayscale contrast-125">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
            <ShieldCheck size={32} /> Secure
          </div>
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
            <CheckCircle size={32} /> Verified
          </div>
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter italic">
            Marketif <span className="font-light">Premium</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-white/20 text-sm border-t border-white/5">
        <p>© {new Date().getFullYear()} Marketif Loyalty. Alle Rechte vorbehalten.</p>
      </footer>
    </main>
  );
}
