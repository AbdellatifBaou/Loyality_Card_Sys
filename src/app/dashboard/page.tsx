'use client';

import { useState, useEffect } from 'react';
import { Users, Coffee, Gift, Activity, CreditCard, RefreshCw, Trash2, AlertTriangle, Lock, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [customerCount, setCustomerCount] = useState(0);
  const [earnCount, setEarnCount] = useState(0);
  const [redeemCount, setRedeemCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '2025') {
      setIsAuthorized(true);
      localStorage.setItem('admin_auth', 'true');
    } else {
      setAuthError('Falsches Passwort');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('admin_auth') === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const fetchData = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const [
        { count: cc },
        { count: ec },
        { count: rc },
        { data: activity },
        { data: cust }
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('stamps').select('*', { count: 'exact', head: true }).eq('type', 'earn'),
        supabase.from('stamps').select('*', { count: 'exact', head: true }).eq('type', 'redeem'),
        supabase.from('stamps').select('*, customers(wallet_object_id)').order('created_at', { ascending: false }).limit(10),
        supabase.from('customers').select('id, wallet_object_id, points, created_at, merchant_id, merchants(name, primary_color)').order('created_at', { ascending: false }),
      ]);
      setCustomerCount(cc || 0);
      setEarnCount(ec || 0);
      setRedeemCount(rc || 0);
      setRecentActivity(activity || []);
      setCustomers(cust || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthorized]);

  const deleteCustomer = async (customer: any) => {
    setDeleting(true);
    try {
      // Must delete stamps first (FK constraint)
      await supabase.from('stamps').delete().eq('customer_id', customer.id);
      await supabase.from('customers').delete().eq('id', customer.id);
      setCustomers(prev => prev.filter(c => c.id !== customer.id));
      setCustomerCount(prev => prev - 1);
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: '#050505' }}>
        <div className="w-full max-w-md p-8 rounded-[40px] relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0A0A0A 0%, #111111 100%)', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
          <div className="text-center mb-8">
            <Lock size={40} className="mx-auto mb-4 text-[#D4AF37] opacity-50" />
            <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-white/40 text-sm">Bitte gib das Admin-Passwort ein.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-2xl px-6 py-4 text-center text-white outline-none focus:border-[#D4AF37] transition-all"
              placeholder="Passwort"
              autoFocus
            />
            {authError && <p className="text-red-500 text-xs text-center">{authError}</p>}
            <button type="submit" className="w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-black transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #B8943B, #E8C968)' }}>
              Anmelden
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-8" style={{ background: '#050505' }}>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <header className="border-b border-white/10 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Marketif <span style={{ color: '#D4AF37' }}>Loyalty</span>
            </h1>
            <p className="text-white/50 mt-1 font-medium text-sm">Admin Dashboard</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchData} disabled={loading} className="p-3 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 transition-all">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => { localStorage.removeItem('admin_auth'); setIsAuthorized(false); }} className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={32} className="animate-spin text-white/30" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20"><Users size={22} className="text-blue-500" /></div>
                  <h2 className="text-white/60 font-medium text-sm">Aktive Karten</h2>
                </div>
                <p className="text-4xl font-black text-white">{customerCount}</p>
              </div>
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20"><Coffee size={22} className="text-green-500" /></div>
                  <h2 className="text-white/60 font-medium text-sm">Vergebene Stempel</h2>
                </div>
                <p className="text-4xl font-black text-white">{earnCount}</p>
              </div>
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}><Gift size={22} style={{ color: '#D4AF37' }} /></div>
                  <h2 className="text-white/60 font-medium text-sm">Eingelöste Prämien</h2>
                </div>
                <p className="text-4xl font-black text-white">{redeemCount}</p>
              </div>
            </div>

            {/* Customer Management */}
            <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="p-6 border-b border-white/5 flex items-center gap-3">
                <CreditCard size={20} className="text-white/60" />
                <h2 className="text-lg font-bold text-white">Kundenkarten</h2>
                <span className="ml-auto text-xs text-white/40 font-medium">{customerCount} Gesamt</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }} className="text-white/50 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium">Kunden-ID</th>
                      <th className="p-4 font-medium">Händler</th>
                      <th className="p-4 font-medium">Stempel</th>
                      <th className="p-4 font-medium">Fortschritt</th>
                      <th className="p-4 font-medium">Registriert</th>
                      <th className="p-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer: any) => {
                      const pct = Math.round((customer.points / 10) * 100);
                      const color = customer.merchants?.primary_color || '#D4AF37';
                      return (
                        <tr key={customer.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <span className="font-mono text-xs text-white/70 bg-white/5 px-2 py-1 rounded-lg">
                              {customer.wallet_object_id?.substring(0, 12)}...
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                              {customer.merchants?.name || '—'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-bold">{customer.points}</span>
                            <span className="text-white/40 text-xs"> / 10</span>
                          </td>
                          <td className="p-4 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                              </div>
                              <span className="text-xs text-white/40 w-8 text-right">{pct}%</span>
                            </div>
                          </td>
                          <td className="p-4 text-white/50 text-xs">
                            {new Date(customer.created_at).toLocaleDateString('de-DE')}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => setConfirmDelete(customer)}
                              className="p-2 rounded-xl text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all"
                              title="Kunden löschen"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {customers.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-white/30">Noch keine Kunden.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="p-6 border-b border-white/5 flex items-center gap-3">
                <Activity size={20} className="text-white/60" />
                <h2 className="text-lg font-bold text-white">Letzte Aktivitäten</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }} className="text-white/50 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium">Zeitpunkt</th>
                      <th className="p-4 font-medium">Kunde (ID)</th>
                      <th className="p-4 font-medium">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((activity: any) => (
                      <tr key={activity.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="p-4 text-white/70 text-sm">{new Date(activity.created_at).toLocaleString('de-DE')}</td>
                        <td className="p-4"><span className="font-mono text-xs text-white/70">{activity.customers?.wallet_object_id?.substring(0, 8)}...</span></td>
                        <td className="p-4">
                          {activity.type === 'earn' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold uppercase tracking-widest border border-green-500/20">
                              <Coffee size={12} /> +{activity.amount} Stempel
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest" style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                              <Gift size={12} /> Prämie eingelöst
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {recentActivity.length === 0 && (
                      <tr><td colSpan={3} className="p-8 text-center text-white/30">Keine Aktivitäten gefunden.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm p-6 rounded-3xl space-y-4"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="text-white font-bold text-lg">Kunden löschen?</h3>
            </div>
            <p className="text-white/60 text-sm">
              Alle Stempel und Daten für Karte{' '}
              <span className="font-mono text-white/80 bg-white/5 px-1 rounded">
                {confirmDelete.wallet_object_id?.substring(0, 12)}...
              </span>{' '}
              werden dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-white/60 hover:bg-white/5 transition-colors text-sm font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={() => deleteCustomer(confirmDelete)}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
