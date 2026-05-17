'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Check, ChevronLeft, ArrowRight, Star, Shield } from 'lucide-react';

const ADMIN_PASSWORD = '2025';
const SETUP_FEE = 299;

const silverFeatures = [
  'Digitale Treuekarte (Google & Apple Wallet)',
  'Geofencing (100m Benachrichtigung)',
  'Scanner-PWA für Mitarbeiter',
  'Unbegrenzte Stempel',
  'Unbegrenzte Kunden',
];

const goldExtra = [
  'Vollzugriff auf das Dashboard',
  'Alle Statistiken (Top 30 Kunden, Wachstumskurven, Peak-Hours)',
  'Marketing-Push an alle Wallet-Kunden',
  'Mitarbeiter-Verwaltung',
];

// ─── Shared layout wrapper ────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: '#0e0e0f', color: '#e7e5e7', fontFamily: "'Manrope', sans-serif" }}
    >
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(128,151,255,0.08) 0%, transparent 70%)' }}
      />
      {/* Nav */}
      <nav
        className="fixed top-0 w-full z-50"
        style={{ background: 'rgba(14,14,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/Marketif_LOGO_Symbol.png" alt="Marketif" className="h-9 w-auto" />
            <span className="font-headline font-bold text-white text-lg hidden sm:block">
              Marketif <span style={{ color: '#8097ff' }}>Treue</span>
            </span>
          </a>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
            style={{ background: 'rgba(128,151,255,0.1)', border: '1px solid rgba(128,151,255,0.2)', color: '#8097ff' }}
          >
            <Shield size={12} /> Admin
          </div>
        </div>
      </nav>
      <main className="relative z-10 pt-24 pb-20 px-6">{children}</main>
    </div>
  );
}

// ─── Password gate ────────────────────────────────────────────────────────────

function PasswordGate({
  password, setPassword, onSubmit, error,
}: {
  password: string;
  setPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
}) {
  return (
    <PageShell>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md animate-fade-in">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(128,151,255,0.12)', border: '1px solid rgba(128,151,255,0.25)' }}
            >
              <Shield size={28} style={{ color: '#8097ff' }} />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="font-headline font-black text-white text-3xl mb-2 tracking-tight">
              Admin-<span className="text-gradient">Zugang</span>
            </h1>
            <p className="text-sm" style={{ color: '#acaaad' }}>
              Händler-Registrierung · Nur für Marketif-Mitarbeiter
            </p>
          </div>

          <div
            className="rounded-[2rem] p-8"
            style={{
              background: 'rgba(19,19,20,0.8)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
          >
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: '#acaaad' }}>
                  Passwort
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-5 py-4 text-white outline-none transition-all text-lg tracking-widest"
                  style={{ background: '#19191b', border: `1px solid ${error ? '#fd6f85' : 'rgba(72,72,74,0.5)'}` }}
                  autoFocus
                  onFocus={e => { if (!error) e.currentTarget.style.borderColor = '#8097ff'; }}
                  onBlur={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(72,72,74,0.5)'; }}
                />
                {error && <p className="text-red-400 text-sm mt-2 font-medium">{error}</p>}
              </div>
              <button
                type="submit"
                className="btn-shimmer w-full font-black py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 text-base"
                style={{ background: '#8097ff', color: '#001760', boxShadow: '0 0 25px rgba(128,151,255,0.3)' }}
              >
                Einloggen →
              </button>
            </form>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  const steps = ['Kontaktdaten', 'Paket wählen', 'Stripe'];
  return (
    <div className="flex items-center justify-center mb-12">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all"
                style={{
                  background: done || active ? '#8097ff' : 'rgba(255,255,255,0.06)',
                  border: `2px solid ${done || active ? '#8097ff' : 'rgba(255,255,255,0.1)'}`,
                  color: done || active ? '#001760' : '#48484a',
                }}
              >
                {done ? <Check size={15} strokeWidth={3} /> : n === 3 ? '→' : n}
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider hidden sm:block"
                style={{ color: active ? '#8097ff' : done ? '#acaaad' : '#48484a' }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-14 sm:w-20 h-px mx-2 mb-5"
                style={{ background: done ? '#8097ff' : 'rgba(255,255,255,0.08)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Input field ──────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = 'text', placeholder, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder: string; error?: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: '#acaaad' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-5 py-4 text-white outline-none transition-all"
        style={{
          background: '#19191b',
          border: `1px solid ${error ? '#fd6f85' : 'rgba(72,72,74,0.5)'}`,
        }}
        onFocus={e => { if (!error) e.currentTarget.style.borderColor = '#8097ff'; }}
        onBlur={e => { if (!error) e.currentTarget.style.borderColor = error ? '#fd6f85' : 'rgba(72,72,74,0.5)'; }}
      />
      {error && <p className="text-xs text-red-400 mt-1.5 font-medium">{error}</p>}
    </div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  title, accent, badge, monthlyPrice, features, extraFeatures, selected, onClick,
}: {
  title: string; accent: string; badge?: string; monthlyPrice: number;
  features: string[]; extraFeatures?: string[]; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full rounded-[1.5rem] p-6 transition-all"
      style={{
        background: selected ? `${accent}0d` : 'rgba(255,255,255,0.02)',
        border: `2px solid ${selected ? accent : 'rgba(255,255,255,0.07)'}`,
        boxShadow: selected ? `0 0 35px -10px ${accent}50` : 'none',
        transform: selected ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Fixed-height badge row — ensures both cards align regardless of badge presence */}
      <div className="h-7 flex items-center mb-3">
        {badge && (
          <div
            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
            style={{ background: accent, color: accent === '#C0C0C0' ? '#111' : '#001760' }}
          >
            <Star size={9} fill="currentColor" /> {badge}
          </div>
        )}
      </div>

      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: accent }}>Paket</p>
          <h3 className="font-headline font-black text-2xl text-white">{title}</h3>
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all"
          style={{
            background: selected ? accent : 'rgba(255,255,255,0.06)',
            border: `2px solid ${selected ? accent : 'rgba(255,255,255,0.12)'}`,
          }}
        >
          {selected && <Check size={13} strokeWidth={3} style={{ color: '#001760' }} />}
        </div>
      </div>

      <div
        className="mb-5 p-4 rounded-xl"
        style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${accent}20` }}
      >
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="font-headline font-black text-4xl" style={{ color: accent }}>{monthlyPrice}€</span>
          <span className="text-sm font-bold" style={{ color: '#acaaad' }}>/Monat</span>
        </div>
        <p className="text-xs font-semibold" style={{ color: '#9090a0' }}>+ {SETUP_FEE}€ Einrichtungsgebühr (einmalig)</p>
      </div>

      <ul className="space-y-2.5">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: '#e7e5e7' }}>
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold"
              style={{ background: `${accent}20`, color: accent }}
            >✓</span>
            {f}
          </li>
        ))}
        {extraFeatures?.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: '#e7e5e7' }}>
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold"
              style={{ background: `${accent}20`, color: accent }}
            >✓</span>
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen() {
  return (
    <PageShell>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-md animate-fade-in">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(222,255,171,0.12)', border: '2px solid rgba(222,255,171,0.35)' }}
          >
            <Check size={36} style={{ color: '#deffab' }} strokeWidth={2.5} />
          </div>
          <h1 className="font-headline font-black text-white text-3xl mb-3 tracking-tight">Zahlung erfolgreich!</h1>
          <p className="text-base mb-8 leading-relaxed" style={{ color: '#acaaad' }}>
            Vielen Dank. Wir richten das Treueprogramm in Kürze ein und melden uns per E-Mail.
          </p>
          <a
            href="/"
            className="btn-shimmer inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all hover:scale-105"
            style={{ background: '#8097ff', color: '#001760', boxShadow: '0 0 25px rgba(128,151,255,0.3)' }}
          >
            Zurück zur Startseite
          </a>
        </div>
      </div>
    </PageShell>
  );
}

// ─── Cancelled screen ─────────────────────────────────────────────────────────

function CancelledScreen() {
  return (
    <PageShell>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-md animate-fade-in">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black"
            style={{ background: 'rgba(253,111,133,0.1)', border: '2px solid rgba(253,111,133,0.25)', color: '#fd6f85' }}
          >
            ×
          </div>
          <h1 className="font-headline font-black text-white text-3xl mb-3 tracking-tight">Zahlung abgebrochen</h1>
          <p className="text-base mb-8 leading-relaxed" style={{ color: '#acaaad' }}>
            Kein Problem — du kannst jederzeit einen neuen Versuch starten.
          </p>
          <a
            href="/registrierung"
            className="btn-shimmer inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all hover:scale-105"
            style={{ background: '#8097ff', color: '#001760' }}
          >
            Nochmal versuchen <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </PageShell>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function RegistrierungContent() {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === 'true';
  const isCancelled = searchParams.get('cancelled') === 'true';

  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [planMode, setPlanMode] = useState<'definiert' | 'custom'>('custom');
  const [selectedPlan, setSelectedPlan] = useState<'silber' | 'gold'>('gold');
  const [customPrice, setCustomPrice] = useState('');
  const [customPriceError, setCustomPriceError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      setAuthError('Falsches Passwort');
      setTimeout(() => setAuthError(''), 3000);
    }
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Pflichtfeld';
    if (!form.company.trim()) errs.company = 'Pflichtfeld';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Gültige E-Mail erforderlich';
    if (!form.phone.trim()) errs.phone = 'Pflichtfeld';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStripe = async () => {
    setApiError('');
    if (planMode === 'custom') {
      const p = parseFloat(customPrice);
      if (!customPrice || isNaN(p) || p < 1) {
        setCustomPriceError('Bitte einen Preis eingeben (min. 1 €)');
        return;
      }
      setCustomPriceError('');
    }
    setIsLoading(true);
    try {
      const monthlyPrice = planMode === 'definiert' ? (selectedPlan === 'silber' ? 49 : 89) : parseFloat(customPrice);
      const planName = planMode === 'definiert' ? (selectedPlan === 'silber' ? 'Silber Paket' : 'Gold Paket') : 'Custom Paket';

      const res = await fetch('/api/stripe/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan: planMode === 'custom' ? 'custom' : selectedPlan, monthlyPrice, planName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen der Zahlung');
      window.location.href = data.url;
    } catch (err: any) {
      setApiError(err.message);
      setIsLoading(false);
    }
  };

  if (isSuccess) return <SuccessScreen />;
  if (isCancelled) return <CancelledScreen />;
  if (!isAuthenticated) return <PasswordGate password={password} setPassword={setPassword} onSubmit={handleAuth} error={authError} />;

  const monthlyDisplay = planMode === 'definiert'
    ? (selectedPlan === 'silber' ? 49 : 89)
    : (customPrice ? parseFloat(customPrice) : null);

  const planLabel = planMode === 'definiert' ? (selectedPlan === 'silber' ? 'Silber' : 'Gold') : 'Custom';

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">

        {/* Page header */}
        <div className="text-center mb-10 animate-fade-in">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
            style={{ background: 'rgba(128,151,255,0.1)', border: '1px solid rgba(128,151,255,0.2)', color: '#8097ff' }}
          >
            ★ Händler-Registrierung
          </div>
          <h1
            className="font-headline font-black text-white tracking-tight mb-3"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: '1.05' }}
          >
            Neuen Händler <span className="text-gradient-hero">anlegen</span>
          </h1>
          <p className="text-sm" style={{ color: '#acaaad' }}>
            Kontakt eintragen → Paket wählen → Zahlung über Stripe
          </p>
        </div>

        <StepIndicator step={step} />

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div
            className="glass-card rounded-[2rem] p-8 animate-fade-in"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="font-headline font-bold text-white text-xl mb-6">Kontaktdaten</h2>
            <div className="space-y-5">
              <Field label="Vollständiger Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Max Mustermann" error={formErrors.name} />
              <Field label="Firmenname" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} placeholder="Muster GmbH" error={formErrors.company} />
              <Field label="E-Mail Adresse" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" placeholder="mail@unternehmen.de" error={formErrors.email} />
              <Field label="Telefonnummer" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} type="tel" placeholder="+49 123 456789" error={formErrors.phone} />
            </div>
            <button
              onClick={() => { if (validateStep1()) setStep(2); }}
              className="btn-shimmer w-full mt-8 font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 text-base"
              style={{ background: '#8097ff', color: '#001760', boxShadow: '0 0 25px rgba(128,151,255,0.25)' }}
            >
              Weiter <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="animate-fade-in space-y-6">

            {/* Back + summary */}
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-sm font-bold transition-colors hover:text-white"
              style={{ color: '#acaaad' }}
            >
              <ChevronLeft size={16} /> Zurück
            </button>

            <div
              className="rounded-2xl px-5 py-4 flex items-center justify-between"
              style={{ background: 'rgba(128,151,255,0.06)', border: '1px solid rgba(128,151,255,0.15)' }}
            >
              <div>
                <p className="font-bold text-white text-sm">{form.name} · {form.company}</p>
                <p className="text-xs mt-0.5" style={{ color: '#acaaad' }}>{form.email} · {form.phone}</p>
              </div>
              <button onClick={() => setStep(1)} className="text-xs font-bold ml-4 shrink-0" style={{ color: '#8097ff' }}>Ändern</button>
            </div>

            {/* Mode toggle */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#acaaad' }}>Preismodell</p>
              <div
                className="flex p-1 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {(['custom', 'definiert'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setPlanMode(mode)}
                    className="flex-1 py-3 rounded-xl text-sm font-black transition-all"
                    style={planMode === mode ? { background: '#8097ff', color: '#001760' } : { color: '#acaaad' }}
                  >
                    {mode === 'definiert' ? 'Definiert' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {/* Definiert: two plan cards */}
            {planMode === 'definiert' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PlanCard
                  title="Silber"
                  accent="#B0B0B0"
                  monthlyPrice={49}
                  features={silverFeatures}
                  selected={selectedPlan === 'silber'}
                  onClick={() => setSelectedPlan('silber')}
                />
                <PlanCard
                  title="Gold"
                  accent="#D4AF37"
                  badge="Empfohlen"
                  monthlyPrice={89}
                  features={silverFeatures}
                  extraFeatures={goldExtra}
                  selected={selectedPlan === 'gold'}
                  onClick={() => setSelectedPlan('gold')}
                />
              </div>
            )}

            {/* Custom plan */}
            {planMode === 'custom' && (
              <div
                className="rounded-[1.5rem] p-6"
                style={{ background: 'rgba(128,151,255,0.05)', border: '2px solid rgba(128,151,255,0.2)' }}
              >
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: '#8097ff' }}>Paket</p>
                  <h3 className="font-headline font-black text-2xl text-white">Custom</h3>
                </div>

                <div
                  className="mb-6 p-4 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(128,151,255,0.15)' }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#acaaad' }}>Monatlicher Preis</p>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={customPrice}
                        onChange={e => { setCustomPrice(e.target.value); setCustomPriceError(''); }}
                        placeholder="z. B. 120"
                        className="w-full rounded-xl px-5 py-3.5 text-white outline-none font-black text-2xl pr-12 transition-all"
                        style={{
                          background: '#19191b',
                          border: `1px solid ${customPriceError ? '#fd6f85' : 'rgba(128,151,255,0.3)'}`,
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#8097ff'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = customPriceError ? '#fd6f85' : 'rgba(128,151,255,0.3)'; }}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-xl" style={{ color: '#8097ff' }}>€</span>
                    </div>
                    <span className="text-sm font-bold shrink-0" style={{ color: '#acaaad' }}>/Monat</span>
                  </div>
                  {customPriceError && <p className="text-xs text-red-400 mt-2 font-medium">{customPriceError}</p>}
                  <p className="text-xs mt-2" style={{ color: '#48484a' }}>+ {SETUP_FEE}€ Einrichtungsgebühr (einmalig)</p>
                </div>

                <ul className="space-y-2.5">
                  {[...silverFeatures, ...goldExtra].map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: '#e7e5e7' }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold" style={{ background: 'rgba(128,151,255,0.15)', color: '#8097ff' }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {apiError && (
              <div
                className="rounded-xl px-4 py-3 text-sm font-medium"
                style={{ background: 'rgba(253,111,133,0.1)', border: '1px solid rgba(253,111,133,0.2)', color: '#fd6f85' }}
              >
                {apiError}
              </div>
            )}

            <button
              onClick={handleStripe}
              disabled={isLoading}
              className="btn-shimmer w-full font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100 text-base"
              style={{ background: '#8097ff', color: '#001760', boxShadow: '0 0 30px rgba(128,151,255,0.3)' }}
            >
              {isLoading ? (
                <><Loader2 size={20} className="animate-spin" /> Weiterleitung zu Stripe…</>
              ) : (
                <>Weiter zu Stripe · {planLabel}{monthlyDisplay ? ` ${monthlyDisplay}€/Monat` : ''} <ArrowRight size={18} /></>
              )}
            </button>

            <p className="text-center text-xs" style={{ color: '#48484a' }}>
              Sichere Zahlung über Stripe · SSL-verschlüsselt
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ─── Export with Suspense ─────────────────────────────────────────────────────

export default function RegistrierungPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0e0e0f' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#8097ff' }} />
        </div>
      }
    >
      <RegistrierungContent />
    </Suspense>
  );
}
