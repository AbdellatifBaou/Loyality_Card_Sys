'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [formState, setFormState] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isPwa = window.location.search.includes('source=pwa');
    if (isStandalone || isPwa) {
      const slug = localStorage.getItem('last_merchant_slug');
      if (slug) router.replace(`/${slug}`);
    }
  }, [router]);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setFormState('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error();
      setFormState('sent');
      setName(''); setEmail(''); setMessage('');
      setTimeout(() => setFormState('idle'), 4000);
    } catch {
      setFormState('error');
      setTimeout(() => setFormState('idle'), 4000);
    }
  };

  const stamps = [1,2,3,4,5,6,7,8,9,10];

  return (
    <main className="min-h-screen overflow-x-hidden" style={{background:'#0e0e0f',color:'#e7e5e7',fontFamily:"'Manrope',sans-serif"}}>

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50" style={{background:'rgba(14,14,15,0.85)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/Marketif_LOGO_Symbol.png" alt="M" className="h-9 w-auto"/>
            <span className="font-headline font-bold text-white text-lg hidden sm:block">Marketif <span style={{color:'#8097ff'}}>Treue</span></span>
          </a>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm font-semibold hidden md:block" style={{color:'#acaaad'}}>Features</a>
            <a href="#showcase" className="text-sm font-semibold hidden md:block" style={{color:'#acaaad'}}>Beispiel</a>
            <a href="#kontakt" className="btn-shimmer text-sm font-bold px-5 py-2.5 rounded-full hover:scale-105 transition-all" style={{background:'#8097ff',color:'#001760',boxShadow:'0 0 20px rgba(128,151,255,0.3)'}}>Kontakt</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-20 px-6 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none animate-pulse-glow" style={{background:'radial-gradient(circle,rgba(128,151,255,0.12) 0%,transparent 65%)'}}/>
        <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full pointer-events-none" style={{background:'radial-gradient(circle,rgba(221,183,255,0.08) 0%,transparent 70%)'}}/>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="animate-fade-in inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full mb-6 sm:mb-8 text-[10px] sm:text-xs font-bold uppercase tracking-widest" style={{background:'rgba(128,151,255,0.1)',border:'1px solid rgba(128,151,255,0.25)',color:'#8097ff'}}>
            ★ Digitale Kundenbindung — Made by Marketif
          </div>

          <h1 className="animate-fade-in font-headline font-black tracking-tighter mb-4 sm:mb-6 leading-[0.92]" style={{fontSize:'clamp(2.8rem,9vw,6.5rem)'}}>
            <span className="text-white block">Mehr Stammkunden.</span>
            <span className="text-gradient-hero block">Mehr Umsatz.</span>
          </h1>

          <p className="animate-fade-in-delay max-w-2xl mx-auto mb-8 sm:mb-12 text-base sm:text-lg leading-relaxed px-2" style={{color:'#acaaad'}}>
            Digitale Stempelkarten für <strong style={{color:'#e7e5e7'}}>Google Wallet &amp; Apple Wallet</strong> — ohne App-Download, ohne Papierkarten. Ihre Kunden sammeln Punkte und Sie gewinnen loyale Stammgäste.
          </p>

          <div className="animate-fade-in-delay-2 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#kontakt" className="btn-shimmer inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full font-black text-base transition-all hover:scale-105" style={{background:'#8097ff',color:'#001760',boxShadow:'0 0 40px rgba(128,151,255,0.35)'}}>Jetzt anfragen →</a>
            <a href="#features" className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full font-bold text-base transition-all hover:scale-105" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',color:'#e7e5e7'}}>Mehr erfahren</a>
          </div>

          <div className="mt-12 sm:mt-20 grid grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {[{v:'10×',l:'Mehr Stammkunden',c:'#8097ff'},{v:'100%',l:'Ohne App für Kunden',c:'#ddb7ff'},{v:'5 Min',l:'Setup-Zeit',c:'#deffab'}].map(s=>(
              <div key={s.l} className="glass-box rounded-[1.2rem] sm:rounded-[2rem] p-4 sm:p-6 text-center">
                <div className="font-headline font-black text-2xl sm:text-4xl mb-1" style={{color:s.c}}>{s.v}</div>
                <div className="text-[9px] sm:text-xs uppercase tracking-widest" style={{color:'#acaaad'}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{background:'#131314',scrollMarginTop:'80px'}} className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-20">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] block mb-3 sm:mb-4" style={{color:'#deffab'}}>Was wir bieten</span>
            <h2 className="font-headline font-bold tracking-tight" style={{fontSize:'clamp(1.8rem,5vw,3.5rem)'}}>Alles für Ihre <span className="text-gradient">Kundenbindung</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {icon:'💳',c:'#8097ff',t:'Digitale Stempelkarten',d:'Kunden erhalten ihre persönliche Treuekarte direkt im Google oder Apple Wallet — kein Download, keine Registrierung nötig.'},
              {icon:'📊',c:'#ddb7ff',t:'Live-Dashboard & Analytics',d:'Echtzeitdaten zu aktiven Karten, Stempelaktivität, Einlösungen und Kundenwachstum in einer übersichtlichen Oberfläche.'},
              {icon:'🔔',c:'#deffab',t:'Push-Nachrichten auf Wallet',d:'Senden Sie Aktionen und Angebote direkt auf die Wallets Ihrer Kunden. Gezielt und ohne Spam.'},
              {icon:'📱',c:'#8097ff',t:'Scanner-App für Personal',d:'Ihr Team scannt QR-Codes vom Smartphone — als PWA ohne App-Store. Schnell, sicher, mit PIN-Schutz.'},
              {icon:'📍',c:'#ddb7ff',t:'Standort-Erinnerung',d:'Wenn Ihr Kunde in der Nähe Ihres Restaurants ist, bekommt er automatisch eine Erinnerung auf sein Wallet. So wird aus jedem Vorbeigang ein potenzieller Besuch.'},
              {icon:'🎁',c:'#deffab',t:'Individuelle Prämien',d:'10 Stempel = 1 Gratis-Gericht, Rabatt oder Überraschung. Alles individuell nach Ihren Wünschen anpassbar.'},
            ].map(f=>(
              <div key={f.t} className="glass-box rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 group text-center sm:text-left">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl mb-4 sm:mb-6 mx-auto sm:mx-0 group-hover:scale-110 transition-transform" style={{background:`${f.c}15`,border:`1px solid ${f.c}30`}}>{f.icon}</div>
                <h3 className="font-headline font-bold text-lg sm:text-xl mb-2 sm:mb-3 text-white">{f.t}</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{color:'#acaaad'}}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOWCASE — Aroma Card */}
      <section id="showcase" className="py-16 sm:py-28 px-4 sm:px-6 relative overflow-hidden" style={{background:'#000',scrollMarginTop:'80px'}}>
        <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(circle at 50% 50%,rgba(45,91,255,0.08) 0%,transparent 60%)'}}/>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            {/* Left: Illustrierte Aroma Karte */}
            <div className="flex justify-center">
              <div className="animate-float w-full max-w-[280px] sm:max-w-sm mx-auto">
                <div className="rounded-[2rem] overflow-hidden" style={{background:'linear-gradient(145deg,#1a1a1a 0%,#0d0d0d 100%)',border:'1px solid rgba(212,175,55,0.25)',boxShadow:'0 40px 80px -20px rgba(0,0,0,0.8),0 0 60px -10px rgba(212,175,55,0.15)'}}>
                  {/* Card Header */}
                  <div className="p-6 pb-4" style={{background:'linear-gradient(135deg,rgba(212,175,55,0.15) 0%,rgba(212,175,55,0.03) 100%)',borderBottom:'1px solid rgba(212,175,55,0.15)'}}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-headline font-black text-xl text-white">Restaurant Aroma</div>
                        <div className="text-xs font-bold uppercase tracking-widest" style={{color:'#D4AF37'}}>Treuekarte</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(212,175,55,0.2)',border:'1px solid rgba(212,175,55,0.3)'}}>
                        <span style={{color:'#D4AF37',fontSize:'1.2rem'}}>🍕</span>
                      </div>
                    </div>
                  </div>
                  {/* Stamps Grid */}
                  <div className="p-6">
                    <div className="grid grid-cols-5 gap-3 mb-6">
                      {stamps.map(i=>(
                        <div key={i} className="aspect-square rounded-xl flex items-center justify-center text-lg font-bold transition-all" style={i<=7?{background:'rgba(212,175,55,0.2)',border:'1px solid rgba(212,175,55,0.4)',color:'#D4AF37',boxShadow:'0 0 12px rgba(212,175,55,0.15)'}:i===10?{background:'linear-gradient(135deg,#D4AF37,#F3D179)',border:'1px solid #D4AF37',color:'#000'}:{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.2)'}}>
                          {i<=7?'✓':i===10?'🎁':i}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{color:'#acaaad'}}>7 von 10 Stempel</span>
                      <div className="h-2 flex-1 mx-4 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                        <div className="h-full rounded-full" style={{width:'70%',background:'linear-gradient(to right,#D4AF37,#F3D179)'}}/>
                      </div>
                      <span className="text-xs font-bold" style={{color:'#D4AF37'}}>70%</span>
                    </div>
                  </div>
                  {/* Card Footer */}
                  <div className="px-6 pb-6">
                    <div className="p-3 rounded-xl text-center text-xs font-bold" style={{background:'rgba(212,175,55,0.1)',border:'1px solid rgba(212,175,55,0.2)',color:'#D4AF37'}}>
                      🎉 Noch 3 Stempel bis zum Gratis-Lieblingsgericht!
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <span className="text-[10px] uppercase tracking-widest font-bold" style={{color:'#acaaad'}}>Im Google & Apple Wallet</span>
                </div>
              </div>
            </div>

            {/* Right: Text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 sm:mb-8" style={{background:'rgba(128,151,255,0.1)',border:'1px solid rgba(128,151,255,0.2)',color:'#8097ff'}}>
                ★ Live Kundenbeispiel
              </div>
              <h2 className="font-headline font-black tracking-tighter mb-4 sm:mb-6" style={{fontSize:'clamp(1.8rem,5vw,3.5rem)'}}>
                Restaurant <span className="text-gradient-hero">Aroma</span> — Augsburg
              </h2>
              <p className="text-lg mb-8 leading-relaxed" style={{color:'#acaaad'}}>
                Für das <strong style={{color:'#e7e5e7'}}>Restaurant Aroma</strong> in Augsburg haben wir ein vollständiges digitales Treueprogramm realisiert: Von der <strong style={{color:'#e7e5e7'}}>gebrandeten Stempelkarte</strong> im Gold-Schwarz-Design bis zum <strong style={{color:'#e7e5e7'}}>Live-Dashboard</strong> für das Personal.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  'Individuelle Stempelkarte im Premium Gold & Black Design',
                  'Scanner-App (PWA) für Mitarbeiter mit PIN-Schutz',
                  'Echtzeit-Dashboard mit Kundenstatistiken',
                  'Push-Benachrichtigungen bei Aktionen',
                  'Automatische Google Wallet Integration',
                ].map(t=>(
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-1 w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{background:'rgba(128,151,255,0.15)',color:'#8097ff'}}>✓</span>
                    <span className="text-sm" style={{color:'#acaaad'}}>{t}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-center lg:justify-start">
                <a href="#kontakt" className="btn-shimmer inline-flex items-center gap-3 font-black px-8 sm:px-10 py-4 sm:py-5 rounded-full hover:scale-105 transition-all text-sm sm:text-base" style={{background:'#8097ff',color:'#001760',boxShadow:'0 0 40px rgba(128,151,255,0.3)'}}>
                  Das will ich auch →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{background:'#0e0e0f'}} className="py-16 sm:py-28 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-12 sm:mb-20">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] block mb-3 sm:mb-4" style={{color:'#8097ff'}}>Prozess</span>
            <h2 className="font-headline font-bold tracking-tight" style={{fontSize:'clamp(1.8rem,5vw,3.5rem)'}}>So einfach <span className="text-gradient">startet es</span></h2>
          </div>
          <div className="space-y-6">
            {[
              {s:'01',c:'#8097ff',t:'Onboarding & Setup',d:'Wir richten Ihr Treueprogramm ein — mit Ihrem Logo, Ihrer Farbe und Ihrer Prämie. In wenigen Minuten ist alles bereit.'},
              {s:'02',c:'#ddb7ff',t:'QR-Code aufstellen',d:'Ihr personalisierter QR-Code auf Tresen, Speisekarte oder als Aufkleber. Kunden scannen einmal und haben ihre Karte sofort im Wallet.'},
              {s:'03',c:'#deffab',t:'Stempel vergeben',d:'Ihr Personal öffnet den Scanner auf dem Smartphone, gibt die PIN ein und vergibt Stempel in Sekunden. Ohne Papier, ohne Stress.'},
              {s:'04',c:'#ffffff',t:'Kunden kommen wieder',d:'Ihre Kunden sammeln Stempel, lösen Prämien ein und kommen regelmäßig wieder. Sie verfolgen alles live im Dashboard.'},
            ].map(i=>(
              <div key={i.s} className="flex gap-4 sm:gap-6 items-start p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] transition-all" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-headline font-black text-base sm:text-lg border-2" style={{color:i.c,borderColor:i.c,background:`${i.c}15`}}>{i.s}</div>
                <div>
                  <h3 className="font-headline font-bold text-lg sm:text-xl mb-1 sm:mb-2" style={{color:i.c}}>{i.t}</h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{color:'#acaaad'}}>{i.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="kontakt" className="py-16 sm:py-28 px-4 sm:px-6 relative overflow-hidden" style={{background:'#131314',scrollMarginTop:'80px'}}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px]" style={{background:'rgba(128,151,255,0.06)'}}/>
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="glass-card rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-16" style={{border:'1px solid rgba(255,255,255,0.08)'}}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20">
              <div className="text-center lg:text-left">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] block mb-4 sm:mb-6" style={{color:'#ddb7ff'}}>Kontakt</span>
                <h2 className="font-headline font-bold tracking-tight mb-4 sm:mb-6" style={{fontSize:'clamp(1.8rem,4vw,3rem)'}}>
                  Lassen Sie uns <span className="text-gradient">starten</span>
                </h2>
                <p className="text-lg mb-10 leading-relaxed" style={{color:'#acaaad'}}>
                  Bereit, Ihre Kundenbindung auf das nächste Level zu heben? Erzählen Sie uns von Ihrem Unternehmen — wir melden uns innerhalb von 24 Stunden.
                </p>
                <div className="space-y-4 sm:space-y-6 flex flex-col items-center lg:items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center" style={{background:'rgba(128,151,255,0.1)'}}>
                      <span style={{color:'#8097ff'}}>✉</span>
                    </div>
                    <span className="font-medium text-white text-sm sm:text-base">kontakt@marketif.de</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center" style={{background:'rgba(221,183,255,0.1)'}}>
                      <span style={{color:'#ddb7ff'}}>🌐</span>
                    </div>
                    <a href="https://marketif.de" target="_blank" className="font-medium text-white hover:underline text-sm sm:text-base">marketif.de</a>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{color:'#acaaad'}}>Name</label>
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="Max Mustermann" className="w-full rounded-xl px-5 py-4 text-white outline-none transition-colors focus:border-[#8097ff]" style={{background:'#262627',border:'1px solid rgba(72,72,74,0.3)'}}/>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{color:'#acaaad'}}>E-Mail</label>
                  <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="max@unternehmen.de" className="w-full rounded-xl px-5 py-4 text-white outline-none transition-colors focus:border-[#8097ff]" style={{background:'#262627',border:'1px solid rgba(72,72,74,0.3)'}}/>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{color:'#acaaad'}}>Nachricht</label>
                  <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} placeholder="Erzählen Sie uns von Ihrem Vorhaben..." className="w-full rounded-xl px-5 py-4 text-white outline-none transition-colors focus:border-[#8097ff] resize-none" style={{background:'#262627',border:'1px solid rgba(72,72,74,0.3)'}}/>
                </div>
                <button onClick={handleSubmit} disabled={formState==='sending'} className="w-full font-bold py-5 rounded-full text-lg transition-all hover:scale-[1.02]" style={formState==='sent'?{background:'#deffab',color:'#2e4800',boxShadow:'0 0 30px rgba(222,255,171,0.4)'}:formState==='error'?{background:'#fd6f85',color:'#490013'}:{background:'#8097ff',color:'#001760',boxShadow:'0 0 20px rgba(128,151,255,0.3)'}}>
                  {formState==='sending'?'Wird gesendet...':formState==='sent'?'✓ Nachricht gesendet!':formState==='error'?'Fehler — bitte erneut':'Nachricht senden'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:'#0e0e0f',borderTop:'1px solid rgba(255,255,255,0.06)'}} className="py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-3">
            <img src="/Marketif_LOGO_Symbol.png" alt="M" className="h-8 w-auto" style={{filter:'brightness(0) invert(1)'}}/>
            <span className="font-headline font-bold text-white">Marketif Treue</span>
          </a>
          <p className="text-sm" style={{color:'#acaaad'}}>© {new Date().getFullYear()} Marketif. Alle Rechte vorbehalten.</p>
          <div className="flex gap-6">
            <a href="https://marketif.de/impressum" target="_blank" className="text-xs uppercase tracking-widest hover:text-white transition-colors" style={{color:'#acaaad'}}>Impressum</a>
            <a href="https://marketif.de/datenschutz" target="_blank" className="text-xs uppercase tracking-widest hover:text-white transition-colors" style={{color:'#acaaad'}}>Datenschutz</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
