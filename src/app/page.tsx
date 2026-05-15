'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isPwaSource = window.location.search.includes('source=pwa');
    if (isStandalone || isPwaSource) {
      const lastSlug = localStorage.getItem('last_merchant_slug');
      if (lastSlug) router.replace(`/${lastSlug}`);
    }
  }, [router]);

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: '#0e0e0f', color: '#e7e5e7' }}>

      {/* ── NAV ── */}
      <nav className="fixed top-0 w-full z-50" style={{ background: 'rgba(14,14,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/Marketif_LOGO_Symbol.png" alt="Marketif" className="h-9 w-auto" />
            <span className="font-headline font-bold text-white text-lg hidden sm:block" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Marketif <span style={{ color: '#8097ff' }}>Treue</span>
            </span>
          </a>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-sm font-semibold hidden md:block" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>Features</a>
            <a href="#how-it-works" className="text-sm font-semibold hidden md:block" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>So funktioniert's</a>
            <Link
              href="/dashboard"
              className="btn-shimmer text-sm font-bold px-5 py-2.5 rounded-full transition-all hover:scale-105"
              style={{ background: '#8097ff', color: '#001760', boxShadow: '0 0 20px rgba(128,151,255,0.3)', fontFamily: "'Manrope', sans-serif" }}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-20 px-6 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none animate-pulse-glow"
          style={{ background: 'radial-gradient(circle, rgba(128,151,255,0.12) 0%, transparent 65%)' }} />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(221,183,255,0.08) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-bold uppercase tracking-widest"
            style={{ background: 'rgba(128,151,255,0.1)', border: '1px solid rgba(128,151,255,0.25)', color: '#8097ff', fontFamily: "'Manrope', sans-serif" }}>
            <span>★</span> Digitale Kundenbindung — Made by Marketif
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in font-headline font-black tracking-tighter mb-6 leading-[0.95]"
            style={{ fontSize: 'clamp(3rem, 8vw, 6.5rem)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span className="text-white block">Mehr Stammkunden.</span>
            <span className="text-gradient-hero block">Mehr Umsatz.</span>
          </h1>

          <p className="animate-fade-in-delay max-w-2xl mx-auto mb-12 text-lg leading-relaxed"
            style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>
            Digitale Stempelkarten für <strong style={{ color: '#e7e5e7' }}>Google Wallet & Apple Wallet</strong> — ohne App, ohne Papier. Ihre Kunden sammeln Punkte, Sie gewinnen Treue. Einfach, modern, wirkungsvoll.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-delay-2 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://marketif.de/#kontakt" target="_blank"
              className="btn-shimmer inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full font-black text-base transition-all hover:scale-105"
              style={{ background: '#8097ff', color: '#001760', boxShadow: '0 0 40px rgba(128,151,255,0.35)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Jetzt anfragen →
            </a>
            <a href="#features"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full font-bold text-base transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e7e5e7', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Mehr erfahren
            </a>
          </div>

          {/* Floating Stats */}
          <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { value: '10×', label: 'Mehr Stammkunden', color: '#8097ff' },
              { value: '100%', label: 'Ohne App für Kunden', color: '#ddb7ff' },
              { value: '5 Min', label: 'Setup-Zeit', color: '#deffab' },
            ].map((s) => (
              <div key={s.label} className="glass-box rounded-[2rem] p-6 text-center">
                <div className="font-headline font-black text-4xl mb-1" style={{ color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</div>
                <div className="text-xs uppercase tracking-widest" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ background: '#131314', scrollMarginTop: '80px' }} className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-xs font-bold uppercase tracking-[0.3em] block mb-4" style={{ color: '#deffab', fontFamily: "'Manrope', sans-serif" }}>Was wir bieten</span>
            <h2 className="font-headline font-bold tracking-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Alles, was Ihre <span className="text-gradient">Kundenbindung</span> braucht
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '💳',
                color: '#8097ff',
                bg: 'rgba(128,151,255,0.1)',
                border: 'rgba(128,151,255,0.2)',
                title: 'Digitale Stempelkarten',
                desc: 'Kunden erhalten ihre persönliche Treuekarte direkt im Google Wallet oder Apple Wallet — kein Download, keine Registrierung erforderlich.',
              },
              {
                icon: '📊',
                color: '#ddb7ff',
                bg: 'rgba(221,183,255,0.1)',
                border: 'rgba(221,183,255,0.2)',
                title: 'Live-Dashboard',
                desc: 'Verfolgen Sie Echtzeitdaten: aktive Karten, vergebene Stempel, eingelöste Prämien und Kundenwachstum — alles in einer übersichtlichen Oberfläche.',
              },
              {
                icon: '🔔',
                color: '#deffab',
                bg: 'rgba(222,255,171,0.1)',
                border: 'rgba(222,255,171,0.2)',
                title: 'Push-Marketing',
                desc: 'Senden Sie Aktionen, Specials und Angebote direkt auf die Wallets Ihrer Kunden. Kein Spam, nur gezielte Kommunikation.',
              },
              {
                icon: '📱',
                color: '#8097ff',
                bg: 'rgba(128,151,255,0.1)',
                border: 'rgba(128,151,255,0.2)',
                title: 'Scanner-App (PWA)',
                desc: 'Ihr Personal scannt QR-Codes mit PIN-Schutz direkt vom Smartphone — ohne App-Installation. Schnell, sicher, intuitiv.',
              },
              {
                icon: '🏪',
                color: '#ddb7ff',
                bg: 'rgba(221,183,255,0.1)',
                border: 'rgba(221,183,255,0.2)',
                title: 'Multi-Standort fähig',
                desc: 'Perfekt für Restaurants, Cafés und Ketten mit mehreren Filialen. Jeder Standort bekommt sein eigenes Dashboard und Scanner.',
              },
              {
                icon: '🎁',
                color: '#deffab',
                bg: 'rgba(222,255,171,0.1)',
                border: 'rgba(222,255,171,0.2)',
                title: 'Individuelle Prämien',
                desc: 'Definieren Sie Ihre eigene Belohnung: 10 Stempel = 1 Gratis-Gericht, Rabatt oder Überraschungsgeschenk — vollständig anpassbar.',
              },
            ].map((f) => (
              <div key={f.title} className="glass-box rounded-[2rem] p-8 group">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform"
                  style={{ background: f.bg, border: `1px solid ${f.border}` }}>
                  {f.icon}
                </div>
                <h3 className="font-headline font-bold text-xl mb-3 text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ background: '#000000', scrollMarginTop: '80px' }} className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(45,91,255,0.08) 0%, transparent 60%)' }} />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <span className="text-xs font-bold uppercase tracking-[0.3em] block mb-4" style={{ color: '#8097ff', fontFamily: "'Manrope', sans-serif" }}>Prozess</span>
            <h2 className="font-headline font-bold tracking-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              So einfach startet <span className="text-gradient">Ihr Treueprogramm</span>
            </h2>
          </div>

          <div className="space-y-8">
            {[
              { step: '01', color: '#8097ff', title: 'Onboarding & Setup', desc: 'Wir richten Ihr Treueprogramm in wenigen Minuten ein — mit Ihrem Logo, Ihrer Farbe und Ihrer individuellen Prämie.' },
              { step: '02', color: '#ddb7ff', title: 'QR-Code teilen', desc: 'Ihr persönlicher QR-Code auf dem Tresen, der Speisekarte oder als Aufkleber — Kunden scannen einmal und haben ihre Karte sofort.' },
              { step: '03', color: '#deffab', title: 'Stempel vergeben', desc: 'Ihr Personal öffnet den Scanner, gibt die PIN ein und vergibt Stempel in Sekunden. Kein Papier, kein Stress.' },
              { step: '04', color: '#ffffff', title: 'Prämien & Wachstum', desc: 'Kunden kommen wieder, Sie tracken alles im Dashboard und kommunizieren gezielt per Push-Nachricht.' },
            ].map((item, i) => (
              <div key={item.step} className="flex gap-6 items-start p-6 rounded-[2rem] transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-headline font-black text-lg border-2"
                  style={{ color: item.color, borderColor: item.color, background: `${item.color}15`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {item.step}
                </div>
                <div>
                  <h3 className="font-headline font-bold text-xl mb-2" style={{ color: item.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY MARKETIF ── */}
      <section style={{ background: '#131314' }} className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.3em] block mb-6" style={{ color: '#ddb7ff', fontFamily: "'Manrope', sans-serif" }}>Warum Marketif</span>
              <h2 className="font-headline font-bold tracking-tight mb-10" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Ihr <span className="text-gradient">digitaler Partner</span> für echte Kundenbindung
              </h2>
              <ul className="space-y-8">
                {[
                  { icon: '✓', color: '#8097ff', title: 'Kein Tech-Aufwand für Sie', desc: 'Wir richten alles ein. Sie müssen nichts installieren oder konfigurieren.' },
                  { icon: '✓', color: '#ddb7ff', title: 'Ohne App für Ihre Kunden', desc: 'Google & Apple Wallet ist bereits auf jedem Smartphone vorinstalliert.' },
                  { icon: '✓', color: '#deffab', title: 'Persönlicher Support', desc: 'Kein Callcenter. Direkter Ansprechpartner vom Marketif-Team.' },
                ].map((b) => (
                  <li key={b.title} className="flex gap-5">
                    <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                      style={{ background: `${b.color}15`, color: b.color }}>
                      {b.icon}
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-lg mb-1 text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{b.title}</h4>
                      <p className="text-sm" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual Card */}
            <div className="relative">
              <div className="absolute inset-0 rounded-[3rem] blur-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #8097ff, #ddb7ff)' }} />
              <div className="relative rounded-[3rem] p-8 space-y-4" style={{ background: '#1f1f21', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <img src="/Marketif_LOGO_Symbol.png" alt="Marketif" className="h-8 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
                  <span className="font-headline font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Marketif Treue</span>
                  <span className="ml-auto text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(128,151,255,0.15)', color: '#8097ff', fontFamily: "'Manrope', sans-serif" }}>Live</span>
                </div>
                {/* Mock Dashboard Preview */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Aktive Karten', value: '142', color: '#8097ff' },
                    { label: 'Stempel heute', value: '+38', color: '#ddb7ff' },
                    { label: 'Eingelöst', value: '17', color: '#deffab' },
                    { label: 'Retention', value: '73%', color: '#8097ff' },
                  ].map((m) => (
                    <div key={m.label} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="font-headline font-black text-2xl mb-1" style={{ color: m.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{m.value}</div>
                      <div className="text-[10px] uppercase tracking-widest" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>{m.label}</div>
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>Kundenwachstum (6 Monate)</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-2 rounded-full" style={{ width: '73%', background: 'linear-gradient(to right, #8097ff, #ddb7ff)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-28 px-6 relative overflow-hidden" style={{ background: '#0e0e0f' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(128,151,255,0.1) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 70% 50%, rgba(221,183,255,0.07) 0%, transparent 60%)' }} />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="font-headline font-black tracking-tighter mb-6" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Bereit, Ihre Kunden zu <span className="text-gradient-hero">begeistern?</span>
          </h2>
          <p className="mb-10 text-lg" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>
            Kontaktieren Sie uns — wir richten Ihr digitales Treueprogramm in wenigen Tagen ein.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://marketif.de/#kontakt" target="_blank"
              className="btn-shimmer inline-flex items-center justify-center gap-2 px-12 py-5 rounded-full font-black text-lg transition-all hover:scale-105"
              style={{ background: '#8097ff', color: '#001760', boxShadow: '0 0 50px rgba(128,151,255,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Jetzt Projekt starten →
            </a>
            <a href="https://marketif.de" target="_blank"
              className="inline-flex items-center justify-center gap-2 px-12 py-5 rounded-full font-bold text-base transition-all hover:opacity-80"
              style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>
              marketif.de ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0e0e0f', borderTop: '1px solid rgba(255,255,255,0.06)' }} className="py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-3">
            <img src="/Marketif_LOGO_Symbol.png" alt="Marketif" className="h-8 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
            <span className="font-headline font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Marketif Treue</span>
          </a>
          <p className="text-sm" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>
            © {new Date().getFullYear()} Marketif. Alle Rechte vorbehalten.
          </p>
          <div className="flex gap-6">
            <a href="https://marketif.de/impressum" target="_blank" className="text-xs uppercase tracking-widest transition-colors hover:text-white" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>Impressum</a>
            <a href="https://marketif.de/datenschutz" target="_blank" className="text-xs uppercase tracking-widest transition-colors hover:text-white" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>Datenschutz</a>
            <a href="https://marketif.de/#kontakt" target="_blank" className="text-xs uppercase tracking-widest transition-colors hover:text-white" style={{ color: '#acaaad', fontFamily: "'Manrope', sans-serif" }}>Kontakt</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
