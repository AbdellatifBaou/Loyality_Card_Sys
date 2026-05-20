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

// ─── Aligned plan cards (CSS subgrid for perfect row alignment) ───────────────

function AlignedPlanCards({ selected, onSelect }: { selected: 'silber' | 'gold'; onSelect: (p: 'silber' | 'gold') => void }) {
  const plans = [
    { id: 'silber' as const, title: 'Silber', accent: '#B0B0B0', price: 49, features: silverFeatures, badge: undefined },
    { id: 'gold' as const, title: 'Gold', accent: '#D4AF37', price: 89, features: [...silverFeatures, ...goldExtra], badge: 'Empfohlen' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto 1fr', gap: '16px' }}>
      {plans.map(plan => {
        const sel = selected === plan.id;
        return (
          <button
            key={plan.id}
            onClick={() => onSelect(plan.id)}
            style={{
              gridRow: 'span 4',
              display: 'grid',
              gridTemplateRows: 'subgrid',
              gap: 0,
              background: sel ? `${plan.accent}0d` : 'rgba(255,255,255,0.02)',
              border: `2px solid ${sel ? plan.accent : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '1.5rem',
              padding: '24px',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: sel ? `0 0 35px -10px ${plan.accent}50` : 'none',
              transition: 'all 0.2s',
            }}
          >
            {/* Row 1 — Badge */}
            <div style={{ height: '28px', display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              {plan.badge && (
                <div style={{ padding: '4px 12px', borderRadius: '9999px', background: plan.accent, color: '#001760', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ★ {plan.badge}
                </div>
              )}
            </div>

            {/* Row 2 — Title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: plan.accent, marginBottom: '4px' }}>Paket</p>
                <h3 className="font-headline" style={{ fontWeight: 900, fontSize: '24px', color: 'white', margin: 0 }}>{plan.title}</h3>
              </div>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: sel ? plan.accent : 'rgba(255,255,255,0.06)', border: `2px solid ${sel ? plan.accent : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sel && <Check size={13} strokeWidth={3} style={{ color: '#001760' }} />}
              </div>
            </div>

            {/* Row 3 — Price box */}
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${plan.accent}20`, marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                <span className="font-headline" style={{ fontWeight: 900, fontSize: '38px', color: plan.accent }}>{plan.price}€</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#acaaad' }}>/Monat</span>
              </div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#9090a0', margin: 0 }}>+ {SETUP_FEE}€ Einrichtungsgebühr (einmalig)</p>
            </div>

            {/* Row 4 — Features */}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#e7e5e7' }}>
                  <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: `${plan.accent}20`, color: plan.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', fontSize: '9px', fontWeight: 700 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
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
  const [form, setForm] = useState({ name: '', company: '', shortName: '', email: '', phone: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [planMode, setPlanMode] = useState<'definiert' | 'custom'>('custom');
  const [selectedPlan, setSelectedPlan] = useState<'silber' | 'gold'>('gold');
  const [customPrice, setCustomPrice] = useState('');
  const [customPriceError, setCustomPriceError] = useState('');
  const [customSetupFee, setCustomSetupFee] = useState('299');
  const [customSetupFeeError, setCustomSetupFeeError] = useState('');

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
    if (!form.shortName.trim()) errs.shortName = 'Pflichtfeld';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Gültige E-Mail erforderlich';
    if (!form.phone.trim()) errs.phone = 'Pflichtfeld';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStripe = async () => {
    setApiError('');
    if (planMode === 'custom') {
      let valid = true;
      const p = parseFloat(customPrice);
      if (!customPrice || isNaN(p) || p < 1) { setCustomPriceError('Bitte einen Preis eingeben (min. 1 €)'); valid = false; }
      const s = parseFloat(customSetupFee);
      if (customSetupFee === '' || isNaN(s) || s < 0) { setCustomSetupFeeError('Bitte einen Betrag eingeben (0 oder mehr)'); valid = false; }
      if (!valid) return;
      setCustomPriceError('');
      setCustomSetupFeeError('');
    }
    setIsLoading(true);
    try {
      const monthlyPrice = planMode === 'definiert' ? (selectedPlan === 'silber' ? 49 : 89) : parseFloat(customPrice);
      const setupFee = planMode === 'definiert' ? SETUP_FEE : parseFloat(customSetupFee);
      const planName = planMode === 'definiert' ? (selectedPlan === 'silber' ? 'Silber Paket' : 'Gold Paket') : 'Custom Paket';

      const res = await fetch('/api/stripe/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan: planMode === 'custom' ? 'custom' : selectedPlan, monthlyPrice, setupFee, planName }),
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
              <Field label="Firmenname (Offiziell)" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} placeholder="Muster GmbH" error={formErrors.company} />
              <Field label="Kürzel (Für Dashboard Link)" value={form.shortName} onChange={v => setForm(f => ({ ...f, shortName: v }))} placeholder="muster" error={formErrors.shortName} />
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

            {/* Definiert: two aligned plan cards */}
            {planMode === 'definiert' && (
              <AlignedPlanCards selected={selectedPlan} onSelect={setSelectedPlan} />
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
                  className="mb-6 p-4 rounded-xl space-y-4"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(128,151,255,0.15)' }}
                >
                  {/* Monthly price */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#acaaad' }}>Monatlicher Preis</p>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="number" min="1" step="1" value={customPrice}
                          onChange={e => { setCustomPrice(e.target.value); setCustomPriceError(''); }}
                          placeholder="z. B. 120"
                          className="w-full rounded-xl px-5 py-3.5 text-white outline-none font-black text-2xl pr-12 transition-all"
                          style={{ background: '#19191b', border: `1px solid ${customPriceError ? '#fd6f85' : 'rgba(128,151,255,0.3)'}` }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#8097ff'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = customPriceError ? '#fd6f85' : 'rgba(128,151,255,0.3)'; }}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-xl" style={{ color: '#8097ff' }}>€</span>
                      </div>
                      <span className="text-sm font-bold shrink-0" style={{ color: '#acaaad' }}>/Monat</span>
                    </div>
                    {customPriceError && <p className="text-xs text-red-400 mt-1.5 font-medium">{customPriceError}</p>}
                  </div>

                  {/* Setup fee */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#acaaad' }}>Einmalige Einrichtungsgebühr</p>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="number" min="0" step="1" value={customSetupFee}
                          onChange={e => { setCustomSetupFee(e.target.value); setCustomSetupFeeError(''); }}
                          placeholder="299"
                          className="w-full rounded-xl px-5 py-3.5 text-white outline-none font-black text-2xl pr-12 transition-all"
                          style={{ background: '#19191b', border: `1px solid ${customSetupFeeError ? '#fd6f85' : 'rgba(128,151,255,0.3)'}` }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#8097ff'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = customSetupFeeError ? '#fd6f85' : 'rgba(128,151,255,0.3)'; }}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-xl" style={{ color: '#8097ff' }}>€</span>
                      </div>
                      <span className="text-sm font-bold shrink-0" style={{ color: '#acaaad' }}>einmalig</span>
                    </div>
                    {customSetupFeeError && <p className="text-xs text-red-400 mt-1.5 font-medium">{customSetupFeeError}</p>}
                    <p className="text-xs mt-1.5" style={{ color: '#48484a' }}>0 € = kostenlose Einrichtung</p>
                  </div>
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
