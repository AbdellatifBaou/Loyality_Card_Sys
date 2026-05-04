'use client';

import { useState, useEffect, use } from 'react';
import { Users, Coffee, Gift, Activity, CreditCard, RefreshCw, Trash2, AlertTriangle, Lock, LogOut, ChevronRight, UserPlus, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MerchantDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<any>(null);
  const [customerCount, setCustomerCount] = useState(0);
  const [earnCount, setEarnCount] = useState(0);
  const [redeemCount, setRedeemCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '2025') {
      setIsAuthorized(true);
      localStorage.setItem(`auth_${slug}`, 'true');
    } else {
      setAuthError('Falsches Passwort');
    }
  };

  useEffect(() => {
    if (localStorage.getItem(`auth_${slug}`) === 'true') {
      setIsAuthorized(true);
    }
  }, [slug]);

  const fetchData = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      // 1. Get Merchant info
      const { data: merchantData, error: mError } = await supabase
        .from('merchants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (mError || !merchantData) {
        setAuthError('Händler nicht gefunden');
        return;
      }
      setMerchant(merchantData);

      // 2. Fetch specific data for this merchant
      const [
        { count: cc },
        { count: ec },
        { count: rc },
        { data: activity },
        { data: cust },
        { data: staffData }
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantData.id),
        supabase.from('stamps').select('*, customers!inner(*)').eq('customers.merchant_id', merchantData.id).eq('type', 'earn'),
        supabase.from('stamps').select('*, customers!inner(*)').eq('customers.merchant_id', merchantData.id).eq('type', 'redeem'),
        supabase.from('stamps').select('*, customers!inner(wallet_object_id)').eq('customers.merchant_id', merchantData.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('customers').select('*').eq('merchant_id', merchantData.id).order('created_at', { ascending: false }),
        supabase.from('staff').select('*').eq('merchant_id', merchantData.id),
      ]);

      setCustomerCount(cc || 0);
      setEarnCount(ec || 0);
      setRedeemCount(rc || 0);
      setRecentActivity(activity || []);
      setCustomers(cust || []);
      setStaff(staffData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthorized, slug]);

  const deleteCustomer = async (customer: any) => {
    setDeleting(true);
    try {
      await supabase.from('stamps').delete().eq('customer_id', customer.id);
      await supabase.from('customers').delete().eq('id', customer.id);
      setCustomers(prev => prev.filter(c => c.id !== customer.id));
      setCustomerCount(prev => prev - 1);
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffPin || !merchant) return;
    
    setIsAddingStaff(true);
    const { data, error } = await supabase
      .from('staff')
      .insert([{ merchant_id: merchant.id, name: newStaffName, pin: newStaffPin }])
      .select();
      
    if (error) {
      alert('Fehler beim Hinzufügen: ' + error.message);
    } else if (data) {
      setStaff(prev => [...prev, data[0]]);
      setNewStaffName('');
      setNewStaffPin('');
      setShowStaffModal(false);
    }
    setIsAddingStaff(false);
  };

  const deleteStaff = async (id: string) => {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (!error) {
      setStaff(prev => prev.filter(s => s.id !== id));
    }
  };

  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: '#050505' }}>
        <div className="w-full max-w-md p-8 rounded-[40px] relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0A0A0A 0%, #111111 100%)', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
          <div className="text-center mb-8">
            <Lock size={40} className="mx-auto mb-4 text-[#D4AF37] opacity-50" />
            <h1 className="text-2xl font-bold text-white mb-2">Dashboard Login</h1>
            <p className="text-white/40 text-sm">Bitte gib das Passwort für <span className="text-[#D4AF37]">{slug}</span> ein.</p>
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

  const primaryColor = merchant?.primary_color || '#D4AF37';

  return (
    <main className="min-h-screen p-6 md:p-8" style={{ background: '#050505' }}>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <header className="border-b border-white/10 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {merchant?.name || 'Händler'} <span style={{ color: primaryColor }}>Dashboard</span>
            </h1>
            <p className="text-white/50 mt-1 font-medium text-sm flex items-center gap-2">
              <Settings size={14} /> Verwaltung & Statistiken
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchData} disabled={loading} className="p-3 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 transition-all">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => { localStorage.removeItem(`auth_${slug}`); setIsAuthorized(false); }} className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-all">
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
                  <h2 className="text-white/60 font-medium text-sm">Gesammelte Stempel</h2>
                </div>
                <p className="text-4xl font-black text-white">{earnCount}</p>
              </div>
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl" style={{ background: `${primaryColor}1A`, border: `1px solid ${primaryColor}33` }}><Gift size={22} style={{ color: primaryColor }} /></div>
                  <h2 className="text-white/60 font-medium text-sm">Prämien ausgegeben</h2>
                </div>
                <p className="text-4xl font-black text-white">{redeemCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Customers */}
              <div className="lg:col-span-2 space-y-8">
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
                          <th className="p-4 font-medium">Stempel</th>
                          <th className="p-4 font-medium">Fortschritt</th>
                          <th className="p-4 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((customer: any) => {
                          const pct = Math.round((customer.points / 10) * 100);
                          return (
                            <tr key={customer.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                <span className="font-mono text-xs text-white/70 bg-white/5 px-2 py-1 rounded-lg">
                                  {customer.wallet_object_id?.substring(0, 12)}...
                                </span>
                              </td>
                              <td className="p-4 text-white font-bold">{customer.points} <span className="text-white/20">/ 10</span></td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden min-w-[60px]">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: primaryColor }} />
                                  </div>
                                  <span className="text-[10px] text-white/30">{pct}%</span>
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <button onClick={() => setConfirmDelete(customer)} className="p-2 rounded-lg text-white/10 hover:text-red-500 hover:bg-red-500/10 transition-all">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Staff & Activity */}
              <div className="space-y-8">
                {/* Staff Management */}
                <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users size={20} className="text-white/60" />
                      <h2 className="text-lg font-bold text-white">Mitarbeiter (PINs)</h2>
                    </div>
                    <button onClick={() => setShowStaffModal(true)} className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all">
                      <UserPlus size={18} />
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {staff.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/3 border border-white/5">
                        <div>
                          <p className="text-sm font-bold text-white">{s.name}</p>
                          <p className="text-xs font-mono text-[#D4AF37] tracking-[0.2em]">{s.pin}</p>
                        </div>
                        <button onClick={() => deleteStaff(s.id)} className="text-white/10 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {staff.length === 0 && <p className="text-center py-4 text-white/20 text-sm italic">Keine Mitarbeiter angelegt.</p>}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="p-6 border-b border-white/5 flex items-center gap-3">
                    <Activity size={20} className="text-white/60" />
                    <h2 className="text-lg font-bold text-white">Aktivität</h2>
                  </div>
                  <div className="p-4 space-y-4">
                    {recentActivity.map((a: any) => (
                      <div key={a.id} className="flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${a.type === 'earn' ? 'bg-green-500' : 'bg-[#D4AF37]'}`} />
                        <div>
                          <p className="text-xs text-white/70">
                            <span className="font-bold">{a.type === 'earn' ? `+${a.amount} Stempel` : 'Prämie eingelöst'}</span>
                          </p>
                          <p className="text-[10px] text-white/30">{new Date(a.created_at).toLocaleString('de-DE')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowStaffModal(false)}>
          <div className="w-full max-w-sm p-8 rounded-[40px] space-y-6 animate-scale-up" style={{ background: '#111', border: '1px solid rgba(212,175,55,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white">Mitarbeiter hinzufügen</h3>
            <form onSubmit={addStaff} className="space-y-4">
              <input value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-[#D4AF37] transition-all" placeholder="Name (z.B. Latif)" />
              <input value={newStaffPin} onChange={e => setNewStaffPin(e.target.value)} maxLength={6} className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-mono tracking-[0.5em] text-center outline-none focus:border-[#D4AF37] transition-all" placeholder="PIN" />
              <button 
                type="submit" 
                disabled={isAddingStaff}
                className="w-full py-4 rounded-2xl font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50" 
                style={{ background: 'linear-gradient(135deg, #B8943B, #E8C968)' }}
              >
                {isAddingStaff ? <RefreshCw size={20} className="animate-spin" /> : 'Hinzufügen'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="w-full max-w-sm p-8 rounded-[40px] space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} className="text-red-500" />
              <h3 className="text-white font-bold text-lg">Kunden löschen?</h3>
            </div>
            <p className="text-white/60 text-sm">Karte {confirmDelete.wallet_object_id?.substring(0, 8)}... unwiderruflich löschen?</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting} className="flex-1 py-4 rounded-2xl border border-white/10 text-white/60 hover:bg-white/5 transition-all">Abbrechen</button>
              <button onClick={() => deleteCustomer(confirmDelete)} disabled={deleting} className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold flex items-center justify-center gap-2">
                {deleting ? <RefreshCw size={16} className="animate-spin" /> : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
