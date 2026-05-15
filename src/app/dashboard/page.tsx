'use client';

import { useState, useEffect } from 'react';
import { Users, Coffee, Gift, Activity, CreditCard, RefreshCw, Trash2, AlertTriangle, Lock, LogOut, BarChart2, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
  
  // B2B State
  const [merchantCount, setMerchantCount] = useState(0);
  const [merchantGrowthData, setMerchantGrowthData] = useState<any[]>([]);
  const [topMerchants, setTopMerchants] = useState<any[]>([]);
  const [inactiveMerchants, setInactiveMerchants] = useState<any[]>([]);

  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

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
        { data: cust },
        { data: merchants },
        { data: recentStamps }
      ] = await Promise.all([
        supabase.from('customers_loyality').select('*', { count: 'exact', head: true }),
        supabase.from('stamps_loyality').select('*', { count: 'exact', head: true }).eq('type', 'earn'),
        supabase.from('stamps_loyality').select('*', { count: 'exact', head: true }).eq('type', 'redeem'),
        supabase.from('stamps_loyality').select('*, customers_loyality(wallet_object_id)').order('created_at', { ascending: false }).limit(10),
        supabase.from('customers_loyality').select('id, wallet_object_id, points, created_at, merchant_id, merchants_loyality(name, primary_color, slug)').order('created_at', { ascending: false }),
        supabase.from('merchants_loyality').select('*'),
        supabase.from('stamps_loyality').select('*, customers_loyality!inner(merchant_id)').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);
      setCustomerCount(cc || 0);
      setEarnCount(ec || 0);
      setRedeemCount(rc || 0);
      setRecentActivity(activity || []);
      setCustomers(cust || []);
      setMerchantCount(merchants?.length || 0);

      // Merchant Growth Data
      const monthMap = new Map();
      const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        monthMap.set(`${months[d.getMonth()]} ${d.getFullYear()}`, 0);
      }

      if (merchants) {
        merchants.forEach((m: any) => {
          const date = new Date(m.created_at);
          const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
          if (monthMap.has(key)) {
            monthMap.set(key, monthMap.get(key) + 1);
          }
        });
      }
      setMerchantGrowthData(Array.from(monthMap, ([name, count]) => ({ name, count })));

      // Top Merchants & Inactive Partners
      if (merchants) {
        const merchantActivity = new Map();
        merchants.forEach((m: any) => merchantActivity.set(m.id, { ...m, recentStamps: 0, lastActivity: null }));

        if (recentStamps) {
          recentStamps.forEach((stamp: any) => {
            const mId = stamp.customers?.merchant_id;
            if (mId && merchantActivity.has(mId)) {
              const m = merchantActivity.get(mId);
              m.recentStamps += stamp.amount || 1;
              const stampDate = new Date(stamp.created_at);
              if (!m.lastActivity || stampDate > m.lastActivity) {
                m.lastActivity = stampDate;
              }
            }
          });
        }

        const allMapped = Array.from(merchantActivity.values());
        
        // Top Merchants
        const top = [...allMapped].sort((a, b) => b.recentStamps - a.recentStamps).filter(m => m.recentStamps > 0);
        setTopMerchants(top);

        // Inactive (no activity in last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const inactive = allMapped.filter(m => !m.lastActivity || m.lastActivity < sevenDaysAgo);
        setInactiveMerchants(inactive);
      }

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
      await supabase.from('stamps_loyality').delete().eq('customer_id', customer.id);
      await supabase.from('customers_loyality').delete().eq('id', customer.id);
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
            <img src="/Marketif_LOGO_Symbol.png" alt="Marketif" className="h-16 w-auto mx-auto mb-6 opacity-90" style={{ filter: 'brightness(0) invert(1)' }} />
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
          <div className="flex items-center gap-4">
            <img src="/Marketif_LOGO_Symbol.png" alt="Marketif" className="h-10 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Marketif <span style={{ color: '#D4AF37' }}>Loyalty</span>
              </h1>
              <p className="text-white/50 mt-0.5 font-medium text-sm">Admin Dashboard</p>
            </div>
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

        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-white/5 pb-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-all ${activeTab === 'overview' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-white/40 hover:text-white/70'}`}
          >
            <div className="flex items-center gap-2"><Activity size={16}/> Übersicht</div>
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-all ${activeTab === 'analytics' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-white/40 hover:text-white/70'}`}
          >
            <div className="flex items-center gap-2"><BarChart2 size={16}/> B2B Analytics</div>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={32} className="animate-spin text-white/30" />
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20"><Store size={22} className="text-purple-500" /></div>
                  <h2 className="text-white/60 font-medium text-sm">Händler</h2>
                </div>
                <p className="text-4xl font-black text-white">{merchantCount}</p>
              </div>
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20"><Users size={22} className="text-blue-500" /></div>
                  <h2 className="text-white/60 font-medium text-sm">Nutzer</h2>
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
                      const pct = Math.round((customer.points / 9) * 100);
                      const color = customer.merchants_loyality?.primary_color || '#D4AF37';
                      return (
                        <tr key={customer.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <span className="font-mono text-xs text-white/70 bg-white/5 px-2 py-1 rounded-lg">
                              {customer.wallet_object_id?.substring(0, 12)}...
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                              {customer.merchants_loyality?.name || '—'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-bold">{customer.points}</span>
                            <span className="text-white/40 text-xs"> / 9</span>
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
                        <td className="p-4"><span className="font-mono text-xs text-white/70">{activity.customers_loyality?.wallet_object_id?.substring(0, 8)}...</span></td>
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

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <BarChart2 size={20} className="text-purple-500" />
                  <h2 className="text-lg font-bold text-white">Merchant-Wachstum</h2>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={merchantGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ background: '#111', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '12px' }}
                        itemStyle={{ color: '#a855f7' }}
                      />
                      <Line type="monotone" dataKey="count" name="Neue Partner" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Inactive Merchants */}
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle size={20} className="text-red-500" />
                  <h2 className="text-lg font-bold text-white">Inaktive Partner (&gt; 7 Tage)</h2>
                </div>
                {inactiveMerchants.length === 0 ? (
                  <p className="text-white/40 text-sm">Alle Partner sind aktuell aktiv!</p>
                ) : (
                  <div className="space-y-3">
                    {inactiveMerchants.map((m: any) => (
                      <div key={m.id} className="flex justify-between items-center p-4 rounded-2xl bg-black/40 border border-red-500/10">
                        <div>
                          <p className="text-sm font-bold text-white">{m.name}</p>
                          <p className="text-xs text-white/40">Zuletzt aktiv: {m.lastActivity ? m.lastActivity.toLocaleDateString('de-DE') : 'Nie'}</p>
                        </div>
                        <span className="px-3 py-1 bg-red-500/20 text-red-500 text-xs font-bold rounded-lg uppercase tracking-wider">Inaktiv</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* Top Merchants (Activity Heatmap) */}
              <div className="p-6 rounded-3xl h-full" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <Activity size={20} className="text-green-500" />
                  <h2 className="text-lg font-bold text-white">Aktivitäts-Heatmap (Top Partner, 30 Tage)</h2>
                </div>
                {topMerchants.length === 0 ? (
                  <p className="text-white/40 text-sm">Keine Aktivität in den letzten 30 Tagen.</p>
                ) : (
                  <div className="space-y-3">
                    {topMerchants.map((m: any, idx: number) => {
                      const maxStamps = topMerchants[0].recentStamps;
                      const pct = Math.max(10, Math.round((m.recentStamps / maxStamps) * 100));
                      return (
                        <div key={m.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden">
                          <div className="absolute inset-0 bg-green-500/10" style={{ width: `${pct}%`, transition: 'width 1s ease-out' }} />
                          <div className="relative flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className="text-white/30 font-mono text-xs">{idx + 1}.</span>
                              <p className="text-sm font-bold text-white">{m.name}</p>
                            </div>
                            <p className="text-sm font-bold text-green-400">+{m.recentStamps} <span className="text-[10px] text-white/30 uppercase">Stempel</span></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
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
