'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Check, ChevronLeft, Lock, ArrowRight, Star } from 'lucide-react';

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

// ─── Reusable input ───────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = 'text', placeholder, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder: string; error?: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: '#acaaad' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-5 py-4 text-white outline-none transition-colors"
        style={{
          background: '#1f1f21',
          border: `1px solid ${error ? '#fd6f85' : 'rgba(72,72,74,0.5)'}`,
        }}
        onFocus={e => { if (!error) e.currentTarget.style.borderColor = '#8097ff'; }}
        onBlur={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(72,72,74,0.5)'; }}
      />
      {error && <p className="text-xs text-red-400 mt-1.5 font-medium">{error}</p>}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  const steps = ['Kontaktdaten', 'Paket wählen', 'Bezahlung'];
  return (
    <div className="flex items-center justify-center gap-0 mb-12">
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = step > idx;
        const active = step === idx;
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all"
                style={{
                  background: done ? '#8097ff' : active ? '#8097ff' : 'rgba(255,255,255,0.06)',
                  border: `2px solid ${done || active ? '#8097ff' : 'rgba(255,255,255,0.12)'}`,
                  color: done || active ? '#001760' : '#acaaad',
                }}
              >
                {done ? <Check size={16} strokeWidth={3} /> : idx === 3 ? '→' : idx}
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider mt-1.5 hidden sm:block"
                style={{ color: active ? '#8097ff' : done ? '#acaaad' : '#48484a' }}
              >
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-16 sm:w-24 h-px mx-2 mb-4"
                style={{ background: done ? '#8097ff' : 'rgba(255,255,255,0.1)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Password gate ────────────────────────────────────────────────────────────

function PasswordGate({
  password, setPassword, onSubmit, error,
}: {
  password: string; setPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void; error: string;
}) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(circle at 50% 0%, #0e1528 0%, #0e0e0f 60%)', fontFamily: "'Manrope', sans-serif" }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-[2rem]"
        style={{
          background: 'rgba(19,19,20,0.95)',
          border: '1px solid rgba(128,151,255,0.15)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(128,151,255,0.1)', border: '1px solid rgba(128,151,255,0.2)' }}>
            <Lock size={24} style={{ color: '#8097ff' }} />
          </div>
        </div>
        <div className="text-center mb-8">
          <h1 className="font-headline font-bold text-white text-2xl mb-1">Admin-Bereich</h1>
          <p className="text-sm" style={{ color: '#acaaad' }}>Händler-Registrierung</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Passwort"
            className="w-full rounded-xl px-5 py-4 text-white outline-none text-center text-xl tracking-[0.3em]"
            style={{ background: '#1f1f21', border: '1px solid rgba(72,72,74,0.5)' }}
            autoFocus
          />
          {error && <p className="text-center text-red-400 text-sm font-medium">{error}</p>}
          <button
            type="submit"
            className="w-full font-black py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: '#8097ff', color: '#001760', boxShadow: '0 0 20px rgba(128,151,255,0.3)' }}
          >
            Einloggen
          </button>
        </form>
      </div>
    </main>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0e0e0f', fontFamily: "'Manrope', sans-serif" }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(222,255,171,0.15)', border: '2px solid rgba(222,255,171,0.4)' }}>
          <Check size={36} style={{ color: '#deffab' }} strokeWidth={3} />
        </div>
        <h1 className="font-headline font-bold text-white text-3xl mb-3">Zahlung erfolgreich!</h1>
        <p className="mb-8" style={{ color: '#acaaad' }}>
          Vielen Dank. Wir richten das Treueprogramm in Kürze ein und melden uns per E-Mail.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all hover:scale-105"
          style={{ background: '#8097ff', color: '#001760', boxShadow: '0 0 20px rgba(128,151,255,0.3)' }}
        >
          Zurück zur Startseite
        </a>
      </div>
    </main>
  );
}

// ─── Cancelled screen ─────────────────────────────────────────────────────────

function CancelledScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0e0e0f', fontFamily: "'Manrope', sans-serif" }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(253,111,133,0.1)', border: '2px solid rgba(253,111,133,0.3)' }}>
          <span className="text-3xl">×</span>
        </div>
        <h1 className="font-headline font-bold text-white text-3xl mb-3">Zahlung abgebrochen</h1>
        <p className="mb-8" style={{ color: '#acaaad' }}>
          Kein Problem — du kannst jederzeit einen neuen Versuch starten.
        </p>
        <a
          href="/registrierung"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all hover:scale-105"
          style={{ background: '#8097ff', color: '#001760' }}
        >
          Nochmal versuchen
        </a>
      </div>
    </main>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  title, accentColor, badge, setupFee, monthlyPrice, features, extraFeatures,
  selected, onClick,
}: {
  title: string; accentColor: string; badge?: string; setupFee: number;
  monthlyPrice: number; features: string[]; extraFeatures?: string[];
  selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full rounded-[1.5rem] p-6 transition-all relative"
      style={{
        background: selected ? `${accentColor}10` : 'rgba(255,255,255,0.03)',
        border: `2px solid ${selected ? accentColor : 'rgba(255,255,255,0.08)'}`,
        boxShadow: selected ? `0 0 30px -8px ${accentColor}40` : 'none',
      }}
    >
      {badge && (
        <div
          className="absolute -top-3 left-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
          style={{ background: accentColor, color: '#001760' }}
        >
          <Star size={10} fill="currentColor" /> {badge}
        </div>
      )}

      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: accentColor }}>Paket</p>
          <h3 className="font-headline font-black text-2xl text-white">{title}</h3>
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 transition-all"
          style={{
            background: selected ? accentColor : 'rgba(255,255,255,0.08)',
            border: `2px solid ${selected ? accentColor : 'rgba(255,255,255,0.15)'}`,
          }}
        >
          {selected && <Check size={14} strokeWidth={3} style={{ color: '#001760' }} />}
        </div>
      </div>

      <div className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.25)' }}>
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="font-headline font-black text-4xl" style={{ color: accentColor }}>{monthlyPrice}€</span>
          <span className="text-sm font-bold" style={{ color: '#acaaad' }}>/Monat</span>
        </div>
        <p className="text-xs" style={{ color: '#acaaad' }}>+ {setupFee}€ Einrichtungsgebühr (einmalig)</p>
      </div>

      <ul className="space-y-2.5">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: '#e7e5e7' }}>
            <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px]" style={{ background: `${accentColor}20`, color: accentColor }}>✓</span>
            {f}
          </li>
        ))}
        {extraFeatures?.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: '#e7e5e7' }}>
            <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px]" style={{ background: `${accentColor}20`, color: accentColor }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

// ─── Main content (inside Suspense because of useSearchParams) ────────────────

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

  const [planMode, setPlanMode] = useState<'definiert' | 'custom'>('definiert');
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
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Pflichtfeld';
    if (!form.company.trim()) e.company = 'Pflichtfeld';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Gültige E-Mail erforderlich';
    if (!form.phone.trim()) e.phone = 'Pflichtfeld';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStripe = async () => {
    setApiError('');
    if (planMode === 'custom') {
      const p = parseFloat(customPrice);
      if (!customPrice || isNaN(p) || p < 1) {
        setCustomPriceError('Bitte gib einen Preis ein (min. 1 €)');
        return;
      }
      setCustomPriceError('');
    }

    setIsLoading(true);
    try {
      const monthlyPrice = planMode === 'definiert'
        ? (selectedPlan === 'silber' ? 49 : 89)
        : parseFloat(customPrice);

      const planName = planMode === 'definiert'
        ? (selectedPlan === 'silber' ? 'Silber Paket' : 'Gold Paket')
        : 'Custom Paket';

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

  const planLabel = planMode === 'definiert'
    ? (selectedPlan === 'silber' ? 'Silber' : 'Gold')
    : 'Custom';

  return (
    <main className="min-h-screen" style={{ background: '#0e0e0f', color: '#e7e5e7', fontFamily: "'Manrope', sans-serif" }}>

      {/* Nav */}
      <nav
        className="fixed top-0 w-full z-50"
        style={{ background: 'rgba(14,14,15,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/Marketif_LOGO_Symbol.png" alt="Marketif" className="h-8 w-auto" />
            <span className="font-headline font-bold text-white hidden sm:block">
              Marketif <span style={{ color: '#8097ff' }}>Treue</span>
            </span>
          </a>
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#acaaad' }}>
            Admin · Registrierung
          </span>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 pt-28 pb-20">

        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: 'rgba(128,151,255,0.1)', border: '1px solid rgba(128,151,255,0.2)', color: '#8097ff' }}
          >
            Händler-Registrierung
          </div>
          <h1 className="font-headline font-black text-white mb-2" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
            Neuen Händler <span className="text-gradient">anlegen</span>
          </h1>
          <p className="text-sm" style={{ color: '#acaaad' }}>
            Informationen eintragen, Paket wählen, Zahlung über Stripe abschließen.
          </p>
        </div>

        <StepIndicator step={step} />

        {/* ── STEP 1: Kontaktdaten ── */}
        {step === 1 && (
          <div
            className="rounded-[2rem] p-8 animate-fade-in"
            style={{ background: 'rgba(31,31,33,0.6)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
          >
            <h2 className="font-headline font-bold text-white text-xl mb-6">Kontaktdaten</h2>
            <div className="space-y-5">
              <Field
                label="Vollständiger Name"
                value={form.name}
                onChange={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Max Mustermann"
                error={formErrors.name}
              />
              <Field
                label="Firmenname"
                value={form.company}
                onChange={v => setForm(f => ({ ...f, company: v }))}
                placeholder="Muster GmbH"
                error={formErrors.company}
              />
              <Field
                label="E-Mail Adresse"
                value={form.email}
                onChange={v => setForm(f => ({ ...f, email: v }))}
                type="email"
                placeholder="mail@unternehmen.de"
                error={formErrors.email}
              />
              <Field
                label="Telefonnummer"
                value={form.phone}
                onChange={v => setForm(f => ({ ...f, phone: v }))}
                type="tel"
                placeholder="+49 123 456789"
                error={formErrors.phone}
              />
            </div>

            <button
              onClick={() => { if (validateStep1()) setStep(2); }}
              className="w-full mt-8 font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: '#8097ff', color: '#001760', boxShadow: '0 0 20px rgba(128,151,255,0.25)' }}
            >
              Weiter <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Paket ── */}
        {step === 2 && (
          <div className="animate-fade-in space-y-6">

            {/* Back button */}
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-sm font-bold transition-colors hover:text-white"
              style={{ color: '#acaaad' }}
            >
              <ChevronLeft size={18} /> Zurück
            </button>

            {/* Contact summary */}
            <div
              className="rounded-2xl px-5 py-4 flex items-center justify-between"
              style={{ background: 'rgba(128,151,255,0.05)', border: '1px solid rgba(128,151,255,0.15)' }}
            >
              <div>
                <p className="font-bold text-white text-sm">{form.name} · {form.company}</p>
                <p className="text-xs" style={{ color: '#acaaad' }}>{form.email} · {form.phone}</p>
              </div>
              <button onClick={() => setStep(1)} className="text-xs font-bold" style={{ color: '#8097ff' }}>Ändern</button>
            </div>

            {/* Mode toggle */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#acaaad' }}>Preismodell</p>
              <div
                className="flex p-1 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {(['definiert', 'custom'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setPlanMode(mode)}
                    className="flex-1 py-3 rounded-xl text-sm font-black capitalize transition-all"
                    style={planMode === mode
                      ? { background: '#8097ff', color: '#001760' }
                      : { color: '#acaaad' }}
                  >
                    {mode === 'definiert' ? 'Definiert' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Definiert mode: Silber + Gold cards ── */}
            {planMode === 'definiert' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PlanCard
                  title="Silber"
                  accentColor="#C0C0C0"
                  setupFee={SETUP_FEE}
                  monthlyPrice={49}
                  features={silverFeatures}
                  selected={selectedPlan === 'silber'}
                  onClick={() => setSelectedPlan('silber')}
                />
                <PlanCard
                  title="Gold"
                  accentColor="#D4AF37"
                  badge="Empfohlen"
                  setupFee={SETUP_FEE}
                  monthlyPrice={89}
                  features={silverFeatures}
                  extraFeatures={goldExtra}
                  selected={selectedPlan === 'gold'}
                  onClick={() => setSelectedPlan('gold')}
                />
              </div>
            )}

            {/* ── Custom mode ── */}
            {planMode === 'custom' && (
              <div
                className="rounded-[1.5rem] p-6"
                style={{ background: 'rgba(128,151,255,0.06)', border: '2px solid rgba(128,151,255,0.25)' }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: '#8097ff' }}>Paket</p>
                    <h3 className="font-headline font-black text-2xl text-white">Custom</h3>
                  </div>
                </div>

                {/* Price input */}
                <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#acaaad' }}>Monatlicher Preis</p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={customPrice}
                        onChange={e => { setCustomPrice(e.target.value); setCustomPriceError(''); }}
                        placeholder="z. B. 120"
                        className="w-full rounded-xl px-5 py-3.5 text-white outline-none font-black text-2xl pr-14"
                        style={{
                          background: '#1f1f21',
                          border: `1px solid ${customPriceError ? '#fd6f85' : 'rgba(128,151,255,0.3)'}`,
                        }}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-xl" style={{ color: '#8097ff' }}>€</span>
                    </div>
                    <span className="text-sm font-bold shrink-0" style={{ color: '#acaaad' }}>/Monat</span>
                  </div>
                  {customPriceError && <p className="text-xs text-red-400 mt-2 font-medium">{customPriceError}</p>}
                  <p className="text-xs mt-2" style={{ color: '#48484a' }}>+ {SETUP_FEE}€ Einrichtungsgebühr (einmalig)</p>
                </div>

                {/* All features */}
                <ul className="space-y-2.5">
                  {[...silverFeatures, ...goldExtra].map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: '#e7e5e7' }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px]" style={{ background: 'rgba(128,151,255,0.15)', color: '#8097ff' }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Error */}
            {apiError && (
              <div className="rounded-xl px-4 py-3 text-sm text-red-300 font-medium" style={{ background: 'rgba(253,111,133,0.1)', border: '1px solid rgba(253,111,133,0.2)' }}>
                {apiError}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleStripe}
              disabled={isLoading}
              className="w-full font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100"
              style={{ background: '#8097ff', color: '#001760', boxShadow: '0 0 30px rgba(128,151,255,0.3)' }}
            >
              {isLoading ? (
                <><Loader2 size={20} className="animate-spin" /> Weiterleitung zu Stripe…</>
              ) : (
                <>Weiter zu Stripe · {planLabel} {monthlyDisplay ? `${monthlyDisplay}€/Monat` : ''} <ArrowRight size={18} /></>
              )}
            </button>

            <p className="text-center text-xs" style={{ color: '#48484a' }}>
              Sichere Zahlung über Stripe · SSL-verschlüsselt
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Default export with Suspense ─────────────────────────────────────────────

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
