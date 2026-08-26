'use client';

import { useState, useEffect } from 'react';
import { Users, Coffee, Gift, Activity, CreditCard, RefreshCw, Trash2, AlertTriangle, Unlock, Lock, LogOut, BarChart2, Store, DollarSign, Download, FileText, X, Edit3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ADMIN_DICT } from '@/locales/admin';

export default function DashboardPage() {
  const [adminLang, setAdminLang] = useState('de');
  const t = ADMIN_DICT[adminLang as keyof typeof ADMIN_DICT] || ADMIN_DICT.de;

  useEffect(() => {
    if (localStorage.getItem('admin_lang')) {
      setAdminLang(localStorage.getItem('admin_lang') as string);
    }
  }, []);

  const handleLangChange = (l: string) => {
    setAdminLang(l);
    localStorage.setItem('admin_lang', l);
  };
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
  const [allMerchants, setAllMerchants] = useState<any[]>([]);
  const [inactiveMerchants, setInactiveMerchants] = useState<any[]>([]);

  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'finances'>('overview');

  const [manualActivationMerchant, setManualActivationMerchant] = useState<any>(null);
  const [manualMonths, setManualMonths] = useState('12');
  const [manualActivating, setManualActivating] = useState(false);

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [resetPinData, setResetPinData] = useState<{merchantId: string, currentPin: string} | null>(null);
  const [resetPinValue, setResetPinValue] = useState('');

  const [financesYear, setFinancesYear] = useState(2026);
  const [financesData, setFinancesData] = useState<any[]>([]);
  const [failedFinancesData, setFailedFinancesData] = useState<any[]>([]);
  const [financesLoading, setFinancesLoading] = useState(false);


  const [showCreateMerchant, setShowCreateMerchant] = useState(false);
  const [newMerchantName, setNewMerchantName] = useState('');
  const [newMerchantColor, setNewMerchantColor] = useState('#D4AF37');
  const [newMerchantPackage, setNewMerchantPackage] = useState('custom');
  const [newMerchantPrice, setNewMerchantPrice] = useState('49');
  const [newMerchantLogo, setNewMerchantLogo] = useState('');
  const [newMerchantSymbol, setNewMerchantSymbol] = useState('☕️');
  const [newMerchantLanguage, setNewMerchantLanguage] = useState('de');
  const [newMerchantStampGoal, setNewMerchantStampGoal] = useState<number>(9);
  const [newMerchantRewardText, setNewMerchantRewardText] = useState('');
  const [creatingMerchant, setCreatingMerchant] = useState(false);
  const [createdMerchantResult, setCreatedMerchantResult] = useState<any>(null);

  const [confirmDeleteMerchant, setConfirmDeleteMerchant] = useState<any>(null);
  const [deletingMerchant, setDeletingMerchant] = useState(false);
  const [newsMessage, setNewsMessage] = useState('');
  const [activeNews, setActiveNews] = useState('');
  const [newsLoading, setNewsLoading] = useState(false);

  // Edit Merchant State
  const [editMerchant, setEditMerchant] = useState<any>(null);
  const [editMerchantName, setEditMerchantName] = useState('');
  const [editMerchantColor, setEditMerchantColor] = useState('');
  const [editMerchantLogo, setEditMerchantLogo] = useState('');
  const [editMerchantRewardText, setEditMerchantRewardText] = useState('');
  const [editMerchantStampGoal, setEditMerchantStampGoal] = useState<number>(9);
  const [editMerchantLanguage, setEditMerchantLanguage] = useState('de');
  const [savingEditMerchant, setSavingEditMerchant] = useState(false);

  useEffect(() => {
    if (editMerchant) {
      setEditMerchantName(editMerchant.name || '');
      setEditMerchantColor(editMerchant.primary_color || '#D4AF37');
      setEditMerchantLogo(editMerchant.logo_url || '');
      setEditMerchantRewardText(editMerchant.reward_text || '');
      setEditMerchantStampGoal(editMerchant.stamp_goal || 9);
      setEditMerchantLanguage(editMerchant.language || 'de');
    }
  }, [editMerchant]);

  const handleSendNews = async (isActive: boolean) => {
    setNewsLoading(true);
    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_auth')}` },
        body: JSON.stringify({ password: '2025', message: newsMessage, isActive })
      });
      const data = await res.json();
      if (data.success) {
        setActiveNews(isActive ? newsMessage : '');
        if (!isActive) setNewsMessage('');
        showToast(t.successSaved || 'Erfolgreich gespeichert!', 'success');
      }
    } catch(e) {
      showToast(t.error || 'Fehler', 'error');
    }
    setNewsLoading(false);
  };

  const handleSaveMerchant = async () => {
    if (!editMerchant) return;
    setSavingEditMerchant(true);
    try {
      const res = await fetch('/api/admin/update-merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_auth')}` },
        body: JSON.stringify({ 
          password: '2025', 
          merchantId: editMerchant.id,
          name: editMerchantName,
          primaryColor: editMerchantColor,
          logoUrl: editMerchantLogo,
          rewardText: editMerchantRewardText,
          stampGoal: editMerchantStampGoal,
          language: editMerchantLanguage
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Händler erfolgreich aktualisiert', 'success');
        setEditMerchant(null);
        fetchData();
      } else {
        showToast(data.error || 'Fehler beim Speichern', 'error');
      }
    } catch (e) {
      showToast('Fehler beim Speichern', 'error');
    }
    setSavingEditMerchant(false);
  };

  const fetchFinances = async (year: number) => {
    setFinancesLoading(true);
    try {
      const res = await fetch('/api/admin/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_auth')}` },
        body: JSON.stringify({ password: '2025', year })
      });
      const data = await res.json();
      if (data.success) {
        setFinancesData(data.invoices || []);
        setFailedFinancesData(data.failedInvoices || []);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setFinancesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'finances' && isAuthorized) {
      fetchFinances(financesYear);
    }
  }, [activeTab, financesYear, isAuthorized]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthorized(true);
    localStorage.setItem('admin_auth', password);
  };

  useEffect(() => {
    if (!!localStorage.getItem('admin_auth')) {
      setIsAuthorized(true);
    }
  }, []);

  const fetchData = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_auth')}` },
        body: JSON.stringify({ password: '2025' })
      });
      
      const res = await response.json();
      if (!response.ok || !res.success) {
        if (response.status === 401) {
          localStorage.removeItem('admin_auth');
          setIsAuthorized(false);
          setAuthError('Sitzung abgelaufen oder Passwort falsch. Bitte neu einloggen.');
        } else {
          setAuthError(res.error || 'Fehler beim Laden');
        }
        return;
      }

      const {
        customerCount: cc,
        earnCount: ec,
        redeemCount: rc,
        recentActivity: activity,
        customers: cust,
        merchants,
        recentStamps
      } = res.data;

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
            const mId = stamp.customers_loyality?.merchant_id;
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
        setAllMerchants([...allMapped].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

        // Inactive (no activity in last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const inactive = allMapped.filter(m => !m.lastActivity || m.lastActivity < sevenDaysAgo);
        setInactiveMerchants(inactive);
      }

    } catch (err) {
      console.error(err);
      setAuthError('Netzwerkfehler');
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
      const response = await fetch('/api/admin/delete-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_auth')}` },
        body: JSON.stringify({ customerId: customer.id })
      });
      const result = await response.json();
      if (result.success) {
        setCustomers(prev => prev.filter(c => c.id !== customer.id));
        setCustomerCount(prev => prev - 1);
        setConfirmDelete(null);
      } else {
        showToast((t.errorDeleting || 'Fehler beim Löschen: ') + result.error, 'error');
      }
    } catch (err: any) {
      showToast((t.networkErrorDeleting || 'Netzwerkfehler beim Löschen: ') + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleMerchant = async (merchantId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/toggle-merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_auth')}` },
        body: JSON.stringify({ merchantId, isActive: !currentStatus })
      });
      const result = await response.json();
      if (result.success) {
        setTopMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, is_active: !currentStatus } : m));
      setAllMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, is_active: !currentStatus } : m));
      } else {
        showToast((t.errorGeneric || 'Fehler: ') + result.error, 'error');
      }
    } catch (err) {
      showToast(t.networkError || 'Netzwerkfehler', 'error');
    }
  };

  const handleCreateMerchant = async () => {
    if (!newMerchantName || !newMerchantColor) return;
    setCreatingMerchant(true);
    try {
      const response = await fetch('/api/admin/create-merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_auth')}` },
        body: JSON.stringify({ password: '2025', name: newMerchantName, primaryColor: newMerchantColor, logoUrl: newMerchantLogo, stampSymbol: newMerchantSymbol, language: newMerchantLanguage, packageType: newMerchantPackage, customPrice: newMerchantPackage === 'custom' ? parseFloat(newMerchantPrice) : null, stampGoal: newMerchantStampGoal, rewardText: newMerchantRewardText })
      });
      const data = await response.json();
      if (data.success) {
        setCreatedMerchantResult(data.merchant);
        fetchData();
      } else {
        showToast((t.errorGeneric || 'Fehler: ') + data.error, 'error');
      }
    } catch (e: any) {
      showToast((t.systemError || 'Systemfehler: ') + e.message, 'error');
    } finally {
      setCreatingMerchant(false);
    }
  };

  
  const handleResetPin = (merchantId: string, currentPin: string) => {
    setResetPinData({ merchantId, currentPin });
    setResetPinValue('');
  };

  const handleDeleteMerchant = async () => {
    if (!confirmDeleteMerchant) return;
    setDeletingMerchant(true);
    try {
      const response = await fetch('/api/admin/delete-merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_auth')}` },
        body: JSON.stringify({ 
          password: '2025', 
          merchantId: confirmDeleteMerchant.id
        })
      });
      const data = await response.json();
      if (data.success) {
        setAllMerchants(prev => prev.filter(m => m.id !== confirmDeleteMerchant.id));
        setTopMerchants(prev => prev.filter(m => m.id !== confirmDeleteMerchant.id));
        setMerchantCount(prev => prev - 1);
        setConfirmDeleteMerchant(null);
      } else {
        showToast((t.errorGeneric || 'Fehler: ') + data.error, 'error');
      }
    } catch (e: any) {
      showToast((t.systemError || 'Systemfehler: ') + e.message, 'error');
    } finally {
      setDeletingMerchant(false);
    }
  };

  const handleManualActivation = async () => {
    if (!manualActivationMerchant) return;
    setManualActivating(true);
    try {
      const res = await fetch('/api/admin/manual-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_auth')}` },
        body: JSON.stringify({ password: '2025', merchantId: manualActivationMerchant.id, months: manualMonths })
      });
      if (res.ok) {
        setManualActivationMerchant(null);
        fetchData();
      } else {
        let errMsg = '';
        try {
           const errData = await res.json();
           errMsg = errData.error || res.statusText;
        } catch(e) {
           errMsg = res.statusText;
        }
        showToast((t.errorManualActivation || 'Fehler: ') + errMsg, 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast((t.systemError || 'Systemfehler: ') + e.message, 'error');
    } finally {
      setManualActivating(false);
    }
  };

  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: '#050505' }}>
        <div className="w-full max-w-md p-8 rounded-[40px] relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0A0A0A 0%, #111111 100%)', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
          <div className="text-center mb-8">
            <img src="/Marketif_LOGO_Symbol.png" alt="Marketif" className="h-16 w-auto mx-auto mb-6 opacity-90" style={{ filter: 'brightness(0) invert(1)' }} />
            <h1 className="text-2xl font-bold text-white mb-2">{t.loginAdminTitle}</h1>
            <p className="text-white/40 text-sm">{t.enterPasswordDesc}</p>
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
              <p className="text-white/50 mt-0.5 font-medium text-sm">{t.adminDashboard}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <select 
              value={adminLang}
              onChange={(e) => handleLangChange(e.target.value)}
              className="bg-[#111111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
            >
              <option value="de">🇩🇪 DE</option>
              <option value="fr">🇫🇷 FR</option>
            </select>
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
            <div className="flex items-center gap-2"><Activity size={16}/> {t.tabOverview}</div>
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-all ${activeTab === 'analytics' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-white/40 hover:text-white/70'}`}
          >
            <div className="flex items-center gap-2"><BarChart2 size={16}/> {t.tabAnalytics}</div>
          </button>
          <button 
            onClick={() => setActiveTab('finances')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-all ${activeTab === 'finances' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-white/40 hover:text-white/70'}`}
          >
            <div className="flex items-center gap-2"><DollarSign size={16}/> {t.tabFinances}</div>
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
                  <h2 className="text-white/60 font-medium text-sm">{t.merchants}</h2>
                </div>
                <p className="text-4xl font-black text-white">{merchantCount}</p>
              </div>
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20"><Users size={22} className="text-blue-500" /></div>
                  <h2 className="text-white/60 font-medium text-sm">{t.users}</h2>
                </div>
                <p className="text-4xl font-black text-white">{customerCount}</p>
              </div>
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20"><Coffee size={22} className="text-green-500" /></div>
                  <h2 className="text-white/60 font-medium text-sm">{t.stampsGiven}</h2>
                </div>
                <p className="text-4xl font-black text-white">{earnCount}</p>
              </div>
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}><Gift size={22} style={{ color: '#D4AF37' }} /></div>
                  <h2 className="text-white/60 font-medium text-sm">{t.rewardsRedeemed}</h2>
                </div>
                <p className="text-4xl font-black text-white">{redeemCount}</p>
              </div>
            </div>

            
                {/* News Broadcast */}
                <div className="mt-6 p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20"><Activity size={22} className="text-indigo-500" /></div>
                    <h2 className="text-lg font-bold text-white">{t.newsBroadcast || 'System News (Broadcast)'}</h2>
                  </div>
                  {activeNews && (
                    <div className="mb-4 p-4 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200">
                      <strong>{t.activeNewsLabel}</strong> {activeNews}
                    </div>
                  )}
                  <textarea 
                    value={newsMessage}
                    onChange={(e) => setNewsMessage(e.target.value)}
                    placeholder={t.newsPlaceholder || 'Nachricht an alle Händler-Dashboards...'}
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 mb-4 min-h-[100px] resize-y focus:outline-none focus:border-indigo-500/50"
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleSendNews(true)}
                      disabled={newsLoading || !newsMessage.trim()}
                      className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      {newsLoading ? 'Lädt...' : (t.sendNews || 'News Senden')}
                    </button>
                    {activeNews && (
                      <button 
                        onClick={() => handleSendNews(false)}
                        disabled={newsLoading}
                        className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-500 font-bold rounded-xl transition-colors disabled:opacity-50"
                      >
                        {t.deactivateNews || 'News Deaktivieren'}
                      </button>
                    )}
                  </div>
                </div>

            {/* Customer Management */}
            <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Store size={20} className="text-white/60" />
                  <h2 className="text-lg font-bold text-white">{t.partnerMerchants}</h2>
                  <span className="text-xs text-white/40 font-medium ml-2">{merchantCount} {t.total}</span>
                </div>
                <button 
                  onClick={() => setShowCreateMerchant(true)}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Users size={16} />
                  {t.createMerchantBtn}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }} className="text-white/50 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium">{t.merchant}</th>
                      <th className="p-4 font-medium">{t.slug}</th>
                      <th className="p-4 font-medium">{t.package}</th>
                      <th className="p-4 font-medium">{t.customers}</th>
                      <th className="p-4 font-medium">{t.status}</th>
                      <th className="p-4 font-medium">{t.aboAndPayment}</th>
                      <th className="p-4 font-medium">{t.registered}</th>
                      <th className="p-4 font-medium">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const merchantStats = new Map();
                      customers.forEach((c: any) => {
                        const mId = c.merchant_id;
                        merchantStats.set(mId, (merchantStats.get(mId) || 0) + 1);
                      });

                      // Get merchants from topMerchants or recentActivity or elsewhere
                      // Actually I should have a 'merchants' state. 
                      // Wait, I have 'topMerchants' which contains merchant info.
                      // Let's use the topMerchants list which is already sorted/mapped.
                      
                      return allMerchants.map((m: any) => (
                        <tr key={m.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${m.primary_color || '#D4AF37'}20`, color: m.primary_color || '#D4AF37' }}>
                                {m.name?.substring(0, 1)}
                              </div>
                              <span className="font-bold text-white">{m.name}</span>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-xs text-white/40">
                            <div>{m.slug}</div>
                            <div className="mt-1 flex items-center gap-2 text-[10px] bg-white/5 p-1 rounded inline-flex">
                              <Lock className="w-3 h-3 text-white/30" />
                              <strong className="text-white tracking-widest">{m.admin_pin}</strong>
                              <button onClick={() => handleResetPin(m.id, m.admin_pin)} className="text-[#D4AF37] hover:text-white transition-colors ml-1" title="Passwort ändern">
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70">
                              {m.package_type || 'silber'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-bold">{merchantStats.get(m.id) || 0}</span>
                            <span className="text-white/40 text-xs"> {t.customers}</span>
                          </td>
                          <td className="p-4">
                            {m.is_active === false ? (
                              <button onClick={() => toggleMerchant(m.id, false)} className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer">
                                Deaktiviert
                              </button>
                            ) : (
                              <button onClick={() => toggleMerchant(m.id, true)} className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 transition-all cursor-pointer">
                                Aktiv
                              </button>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-white">
                                {m.stripe_subscription_id === 'manual_invoice' ? t.manualInvoice : (m.stripe_subscription_id ? t.stripeAbo : t.noAbo)}
                              </span>
                              <span className={`text-[10px] font-bold ${m.subscription_status === 'active' || m.subscription_status === 'cancels_at_period_end' ? 'text-green-500' : 'text-red-500'}`}>
                                {m.subscription_status === 'active' ? t.statusActive : m.subscription_status === 'cancels_at_period_end' ? t.statusCanceledActive : (m.subscription_status || 'UNBEKANNT').toUpperCase()}
                                {m.current_period_end && ` ${t.until} ${new Date(m.current_period_end).toLocaleDateString('de-DE')})`}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-white/50 text-xs">
                            {new Date(m.created_at).toLocaleDateString('de-DE')}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setEditMerchant(m)}
                                title="Bearbeiten"
                                className="p-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 rounded-lg transition-colors border border-yellow-500/20"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={() => setManualActivationMerchant(m)}
                                title={t.manualActivationTooltip}
                                className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/20"
                              >
                                <Unlock size={14} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteMerchant(m)}
                                title={t.deleteMerchantTooltip}
                                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                    {allMerchants.length === 0 && (
                      <tr><td colSpan={8} className="p-8 text-center text-white/30">{t.noMerchantsFound}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="p-6 border-b border-white/5 flex items-center gap-3">
                <Activity size={20} className="text-white/60" />
                <h2 className="text-lg font-bold text-white">{t.recentActivity}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }} className="text-white/50 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium">{t.time}</th>
                      <th className="p-4 font-medium">{t.customerId}</th>
                      <th className="p-4 font-medium">{t.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((activity: any) => {
                      const merchantName = activity.customers_loyality?.merchants_loyality?.name || t.merchant;
                      const merchantColor = activity.customers_loyality?.merchants_loyality?.primary_color || '#D4AF37';
                      
                      return (
                        <tr key={activity.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="p-4 text-white/70 text-sm">{new Date(activity.created_at).toLocaleString('de-DE')}</td>
                          <td className="p-4">
                            <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: `${merchantColor}20`, color: merchantColor, border: `1px solid ${merchantColor}40` }}>
                              {merchantName}
                            </span>
                          </td>
                          <td className="p-4">
                            {activity.type === 'earn' ? (
                              <span className="inline-flex items-center gap-1.5 text-white/70 text-xs font-medium">
                                <Coffee size={12} className="text-green-500" /> {t.gaveXStamps.split("+X")[0]} <span className="text-white font-bold">+{activity.amount} {t.stampsUpper.toLowerCase()}</span> {t.gaveXStamps.split("Stempel ")[1]}
                              </span>
                            ) : activity.type === 'correction' ? (
                              <span className="inline-flex items-center gap-1.5 text-white/70 text-xs font-medium">
                                <Activity size={12} className="text-blue-500" /> {t.correctedXStamps.split("X")[0]} <span className="text-blue-400 font-bold">{activity.amount > 0 ? '+' : ''}{activity.amount} {t.stampsUpper.toLowerCase()}</span> {t.correctedXStamps.split("Stempel ")[1]}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-white/70 text-xs font-medium">
                                <Gift size={12} style={{ color: '#D4AF37' }} /> <span className="text-[#D4AF37] font-bold">{t.redeemedReward}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {recentActivity.length === 0 && (
                      <tr><td colSpan={3} className="p-8 text-center text-white/30">{t.noActivityFound}</td></tr>
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
                  <h2 className="text-lg font-bold text-white">{t.merchantGrowth}</h2>
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
                      <Line type="monotone" dataKey="count" name={t.newPartners} stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Inactive Merchants */}
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle size={20} className="text-red-500" />
                  <h2 className="text-lg font-bold text-white">{t.inactivePartners7Days}</h2>
                </div>
                {inactiveMerchants.length === 0 ? (
                  <p className="text-white/40 text-sm">{t.allPartnersActive}</p>
                ) : (
                  <div className="space-y-3">
                    {inactiveMerchants.map((m: any) => (
                      <div key={m.id} className="flex justify-between items-center p-4 rounded-2xl bg-black/40 border border-red-500/10">
                        <div>
                          <p className="text-sm font-bold text-white">{m.name}</p>
                          <p className="text-xs text-white/40">{t.lastActive} {m.lastActivity ? m.lastActivity.toLocaleDateString('de-DE') : t.never}</p>
                        </div>
                        <span className="px-3 py-1 bg-red-500/20 text-red-500 text-xs font-bold rounded-lg uppercase tracking-wider">{t.inactive}</span>
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
                  <h2 className="text-lg font-bold text-white">{t.activityHeatmap}</h2>
                </div>
                {topMerchants.length === 0 ? (
                  <p className="text-white/40 text-sm">{t.noActivity30Days}</p>
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
                            <p className="text-sm font-bold text-green-400">+{m.recentStamps} <span className="text-[10px] text-white/30 uppercase">{t.stampsUpper}</span></p>
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

        {/* FINANCES TAB */}
        {activeTab === 'finances' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header mit Gesamt-MRR (Erwartet) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20"><Activity size={22} className="text-green-500" /></div>
                  <h2 className="text-white/60 font-medium text-sm">{t.currentMRRExpected}</h2>
                </div>
                {(() => {
                  let mrr = 0;
                  topMerchants.forEach((m: any) => {
                    if (m.is_active !== false) {
                      if (m.package_type === 'gold') mrr += 89;
                      else if (m.package_type === 'custom') mrr += 199;
                      else mrr += 49; // default silber
                    }
                  });
                  return <p className="text-4xl font-black text-white">{mrr}€</p>;
                })()}
                <p className="text-xs text-white/40 mt-2">{t.basedOnActivePackages}</p>
              </div>

              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}><DollarSign size={22} style={{ color: '#D4AF37' }} /></div>
                  <h2 className="text-white/60 font-medium text-sm">{t.paidAnnualRevenue} ({financesYear})</h2>
                </div>
                {financesLoading ? (
                  <div className="h-10 flex items-center"><RefreshCw size={24} className="animate-spin text-white/30" /></div>
                ) : (
                  <p className="text-4xl font-black text-white">
                    {(financesData.reduce((acc, curr) => acc + curr.amount_paid, 0) / 100).toFixed(2)}€
                  </p>
                )}
                <p className="text-xs text-white/40 mt-2">{t.basedOnStripeInvoices}</p>
              </div>
            </div>

            <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-white/60" />
                  <h2 className="text-lg font-bold text-white">{t.stripeInvoices}</h2>
                </div>
                
                <div className="flex items-center gap-3">
                  <select 
                    value={financesYear}
                    onChange={(e) => setFinancesYear(Number(e.target.value))}
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#D4AF37] transition-all text-sm appearance-none"
                  >
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                    <option value={2028}>2028</option>
                  </select>

                  <button 
                    onClick={() => {
                      if (financesData.length === 0) return;
                      const csvRows = [
                        ['Datum', 'Rechnungs-ID', 'Kunde', 'E-Mail', 'Betrag']
                      ];
                      financesData.forEach(inv => {
                        csvRows.push([
                          new Date(inv.created * 1000).toLocaleDateString('de-DE'),
                          inv.id,
                          inv.customer_name || '-',
                          inv.customer_email || '-',
                          (inv.amount_paid / 100).toFixed(2)
                        ]);
                      });
                      const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(";")).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `marketif_finanzen_${financesYear}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    disabled={financesData.length === 0 || financesLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    <Download size={16} /> {t.csvDownload}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }} className="text-white/50 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium">{t.date}</th>
                      <th className="p-4 font-medium">{t.customerEmail}</th>
                      <th className="p-4 font-medium">{t.amount}</th>
                      <th className="p-4 font-medium text-right">{t.actionCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financesLoading ? (
                      <tr><td colSpan={4} className="p-8 text-center text-white/30"><RefreshCw size={24} className="animate-spin mx-auto" /></td></tr>
                    ) : financesData.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-white/30">{t.noPaymentsFound}</td></tr>
                    ) : (
                      financesData.map((inv: any) => (
                        <tr key={inv.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="p-4 text-white/70 text-sm">{new Date(inv.created * 1000).toLocaleDateString('de-DE')}</td>
                          <td className="p-4">
                            <p className="text-sm font-bold text-white">{inv.customer_name || t.unknown}</p>
                            <p className="text-xs text-white/40">{inv.customer_email || '-'}</p>
                          </td>
                          <td className="p-4">
                            <span className="text-green-400 font-bold">{(inv.amount_paid / 100).toFixed(2)} {inv.currency.toUpperCase()}</span>
                          </td>
                          <td className="p-4 text-right">
                            {inv.invoice_pdf && (
                              <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-[#D4AF37] hover:underline">
                                {t.viewPdf}
                              </a>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Failed Invoices Section */}
            <div className="p-6 rounded-3xl" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle size={20} className="text-red-500" />
                <h2 className="text-lg font-bold text-red-500">{t.failedPaymentsTitle}</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'rgba(239, 68, 68, 0.1)' }} className="text-red-400/80 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium">{t.date}</th>
                      <th className="p-4 font-medium">{t.customerEmail}</th>
                      <th className="p-4 font-medium">{t.amount}</th>
                      <th className="p-4 font-medium text-right">{t.failedAttempts}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financesLoading ? (
                      <tr><td colSpan={4} className="p-8 text-center text-red-500/50"><RefreshCw size={24} className="animate-spin mx-auto" /></td></tr>
                    ) : failedFinancesData.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-red-500/50">{t.noFailedPaymentsFound}</td></tr>
                    ) : (
                      failedFinancesData.map((inv: any) => (
                        <tr key={inv.id} className="border-b border-red-500/10 last:border-0 hover:bg-red-500/5 transition-colors">
                          <td className="p-4 text-red-400/70 text-sm">{new Date(inv.created * 1000).toLocaleDateString('de-DE')}</td>
                          <td className="p-4">
                            <p className="text-sm font-bold text-red-400">{inv.customer_name || t.unknown}</p>
                            <p className="text-xs text-red-400/60">{inv.customer_email || '-'}</p>
                          </td>
                          <td className="p-4">
                            <span className="text-red-500 font-bold">{(inv.amount_due / 100).toFixed(2)} {inv.currency.toUpperCase()}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-bold">
                              {inv.attempt_count} Versuche
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
  </div>

      
      {/* Toast Notification */}
      {toast && (
        <div
          className={"fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[100] animate-fade-in flex items-center gap-3 " + (toast.type === 'success' ? 'bg-[#D4AF37] text-black' : 'bg-red-500 text-white')}
        >
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Reset PIN Modal */}
      {resetPinData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-2">{t.enterNewPin || 'Neues 4-stelliges Passwort (PIN) eingeben:'}</h3>
            <p className="text-sm text-white/50 mb-4">{t.currentPin || 'Aktueller PIN'}: {resetPinData.currentPin}</p>
            <input
              type="text"
              maxLength={4}
              inputMode="numeric"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono tracking-widest text-center outline-none focus:border-[#D4AF37] transition-all mb-4"
              value={resetPinValue}
              onChange={e => setResetPinValue(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setResetPinData(null); setResetPinValue(''); }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 font-medium transition-all"
              >
                {t.cancel || 'Abbrechen'}
              </button>
              <button
                onClick={async () => {
                  if (resetPinValue.length !== 4) return;
                  try {
                    const response = await fetch('/api/admin/reset-pin', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_auth')}` },
                      body: JSON.stringify({ password: '2025', merchantId: resetPinData.merchantId, newPin: resetPinValue })
                    });
                    const data = await response.json();
                    if (data.success) {
                      showToast(t.passwordChangedSuccess || 'Passwort erfolgreich geändert!', 'success');
                      fetchData();
                      setResetPinData(null);
                      setResetPinValue('');
                    } else {
                      showToast((t.errorGeneric || 'Fehler: ') + data.error, 'error');
                    }
                  } catch (e: any) {
                    showToast((t.systemError || 'Systemfehler: ') + e.message, 'error');
                  }
                }}
                disabled={resetPinValue.length !== 4}
                className="flex-1 py-3 bg-[#D4AF37] hover:bg-[#b0922e] text-black rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {t.ok || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <h3 className="text-white font-bold text-lg">{t.deleteCustomerTitle}</h3>
            </div>
            <p className="text-white/60 text-sm">
              {t.deleteCustomerDesc1}{' '}
              <span className="font-mono text-white/80 bg-white/5 px-1 rounded">
                {confirmDelete.wallet_object_id?.substring(0, 12)}...
              </span>{' '}
              {t.deleteCustomerDesc2}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-white/60 hover:bg-white/5 transition-colors text-sm font-medium"
              >{t.cancel}</button>
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
      {/* Manual Activation Modal */}
      {manualActivationMerchant && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#111111] border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">{t.manualActivationTitle2}</h3>
            <p className="text-white/60 text-sm mb-6">
              {t.manualActivationDesc1} <strong className="text-white">{manualActivationMerchant.name}</strong> {t.manualActivationDesc2}
            </p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">{t.activationDuration}</label>
                <select 
                  value={manualMonths}
                  onChange={(e) => setManualMonths(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option className="bg-[#111111] text-white" value="1">{t.month1}</option>
                  <option className="bg-[#111111] text-white" value="3">{t.month3}</option>
                  <option className="bg-[#111111] text-white" value="6">{t.month6}</option>
                  <option className="bg-[#111111] text-white" value="12">{t.year1}</option>
                  <option className="bg-[#111111] text-white" value="24">{t.year2}</option>
                  <option className="bg-[#111111] text-white" value="120">{t.lifetime}</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setManualActivationMerchant(null)}
                className="flex-1 py-3 text-white/60 font-medium hover:text-white transition-colors"
                disabled={manualActivating}
              >{t.cancel}</button>
              <button
                onClick={handleManualActivation}
                disabled={manualActivating}
                className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {manualActivating ? t.pleaseWait : t.activateBtn}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Merchant Modal */}
      {editMerchant && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111111] border border-white/10 rounded-3xl p-8 max-w-md w-full my-8">
            <h3 className="text-xl font-bold text-white mb-6">Händler bearbeiten</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest mb-2 font-bold">Firmenname</label>
                <input
                  type="text"
                  value={editMerchantName}
                  onChange={e => setEditMerchantName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest mb-2 font-bold">Hauptfarbe (HEX)</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={editMerchantColor}
                    onChange={e => setEditMerchantColor(e.target.value)}
                    className="w-12 h-12 rounded-xl bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editMerchantColor}
                    onChange={e => setEditMerchantColor(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest mb-2 font-bold">Logo (URL oder Base64)</label>
                <input
                  type="text"
                  value={editMerchantLogo}
                  onChange={e => setEditMerchantLogo(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest mb-2 font-bold">Belohnungstext</label>
                <input
                  type="text"
                  value={editMerchantRewardText}
                  onChange={e => setEditMerchantRewardText(e.target.value)}
                  placeholder="z.B. 10 Stempel = 1 GRATIS Döner"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest mb-2 font-bold">Anzahl Stempel</label>
                <select
                  value={editMerchantStampGoal}
                  onChange={e => setEditMerchantStampGoal(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(num => (
                    <option key={num} value={num} className="bg-[#111111]">{num} Stempel</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest mb-2 font-bold">Sprache</label>
                <select
                  value={editMerchantLanguage}
                  onChange={e => setEditMerchantLanguage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                >
                  <option value="de" className="bg-[#111111]">Deutsch</option>
                  <option value="en" className="bg-[#111111]">Englisch</option>
                  <option value="fr" className="bg-[#111111]">Französisch</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditMerchant(null)}
                  className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSaveMerchant}
                  disabled={savingEditMerchant}
                  className="flex-1 py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#C5A030] transition-colors disabled:opacity-50"
                >
                  {savingEditMerchant ? t.pleaseWait : t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Merchant Modal */}
      {showCreateMerchant && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111111] border border-white/10 rounded-3xl p-8 max-w-md w-full my-8">
            <h3 className="text-xl font-bold text-white mb-2">{t.createMerchantTitle}</h3>
            <p className="text-white/60 text-sm mb-6">
              {t.createMerchantDesc}
            </p>

            {createdMerchantResult ? (
              <div className="space-y-6">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                  <p className="text-green-500 font-bold mb-2">{t.merchantCreatedSuccessTitle}</p>
                  <div className="space-y-2 mt-4 text-sm">
                    <p className="text-white/60">{t.dashboardLink}</p>
                    <a href={`/dashboard/${createdMerchantResult.slug}`} target="_blank" rel="noreferrer" className="text-blue-400 block break-all">
                      https://treue.marketif.de/dashboard/{createdMerchantResult.slug}
                    </a>
                    <p className="text-white/60 mt-4">{t.scannerLink}</p>
                    <a href={`/${createdMerchantResult.slug}`} target="_blank" rel="noreferrer" className="text-blue-400 block break-all">
                      https://treue.marketif.de/{createdMerchantResult.slug}
                    </a>
                    <p className="text-white/60 mt-4">Join-Link:</p>
                    <a href={`/join/${createdMerchantResult.slug}`} target="_blank" rel="noreferrer" className="text-blue-400 block break-all">
                      https://treue.marketif.de/join/{createdMerchantResult.slug}
                    </a>
                    <p className="text-white/60 mt-4">{t.adminPin}</p>
                    <p className="text-2xl font-mono text-white tracking-widest">{createdMerchantResult.pin}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateMerchant(false);
                    setCreatedMerchantResult(null);
                    setNewMerchantName('');
                    setNewMerchantLogo('');
                    setNewMerchantSymbol('☕️');
                  }}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
                >
                  Schließen
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">{t.merchantName}</label>
                  <input 
                    type="text"
                    value={newMerchantName}
                    onChange={(e) => setNewMerchantName(e.target.value)}
                    placeholder={t.merchantNamePlaceholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">{t.primaryColor}</label>
                  <div className="flex gap-3">
                    <input 
                      type="color"
                      value={newMerchantColor}
                      onChange={(e) => setNewMerchantColor(e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input 
                      type="text"
                      value={newMerchantColor}
                      onChange={(e) => setNewMerchantColor(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">{t.logoUpload}</label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const maxSize = 500;
                            
                            if (width > height) {
                              if (width > maxSize) {
                                height *= maxSize / width;
                                width = maxSize;
                              }
                            } else {
                              if (height > maxSize) {
                                width *= maxSize / height;
                                height = maxSize;
                              }
                            }
                            
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.drawImage(img, 0, 0, width, height);
                              // compress as png (Satori doesn't support webp)
                              const dataUrl = canvas.toDataURL('image/png');
                              setNewMerchantLogo(dataUrl);
                            }
                          };
                          img.src = event.target?.result as string;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                  {newMerchantLogo && (
                    <div className="mt-2 text-green-400 text-xs flex items-center">
                      <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
                      Bild erfolgreich geladen & optimiert
                    </div>
                  )}
                  <p className="text-[10px] text-white/30 mt-1">{t.logoUploadSub}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">{t.stampSymbol}</label>
                  <div className="space-y-2">
                    <select 
                      value={!['☕️','🥐','🍔','🍕','✂️','💅','💆‍♀️','🍺','🍹','🛍️','🎁','⭐'].includes(newMerchantSymbol) ? 'custom' : newMerchantSymbol}
                      onChange={(e) => {
                        if (e.target.value === 'custom') setNewMerchantSymbol('✨');
                        else setNewMerchantSymbol(e.target.value);
                      }}
                      className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="☕️">☕️ Kaffeetasse (Café)</option>
                      <option value="🥐">🥐 Croissant (Bäckerei)</option>
                      <option value="🍔">🍔 Burger (Restaurant/Imbiss)</option>
                      <option value="🍕">🍕 Pizza (Pizzeria)</option>
                      <option value="✂️">✂️ Schere (Friseur/Barbershop)</option>
                      <option value="💅">💅 Nagellack (Nagelstudio)</option>
                      <option value="💆‍♀️">💆‍♀️ Massage (Spa/Kosmetik)</option>
                      <option value="🍺">🍺 Bier (Bar/Pub)</option>
                      <option value="🍹">🍹 Cocktail (Bar)</option>
                      <option value="🛍️">🛍️ Einkaufstasche (Einzelhandel)</option>
                      <option value="🎁">🎁 Geschenk (Allgemein)</option>
                      <option value="⭐">⭐ Stern (Allgemein)</option>
                      <option value="custom">✍️ Eigenes Emoji eingeben...</option>
                    </select>
                    {(!['☕️','🥐','🍔','🍕','✂️','💅','💆‍♀️','🍺','🍹','🛍️','🎁','⭐'].includes(newMerchantSymbol)) && (
                      <input 
                        type="text"
                        placeholder="Füge dein Emoji ein..."
                        value={newMerchantSymbol}
                        onChange={(e) => setNewMerchantSymbol(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#D4AF37]/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">{t.language}</label>
                  <select 
                    value={newMerchantLanguage}
                    onChange={(e) => setNewMerchantLanguage(e.target.value)}
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="de">{t.langDe}</option>
                    <option value="en">{t.langEn}</option>
                    <option value="fr">{t.langFr}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">{t.package}</label>
                  <select 
                    value={newMerchantPackage}
                    onChange={(e) => setNewMerchantPackage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option className="bg-[#111111] text-white" value="silber">{t.pkgSilver}</option>
                    <option className="bg-[#111111] text-white" value="gold">{t.pkgGold}</option>
                    <option className="bg-[#111111] text-white" value="custom">{t.customPackage}</option>
                  </select>
                </div>

                {newMerchantPackage === 'custom' && (
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-2">{t.customPrice}</label>
                    <input 
                      type="number"
                      value={newMerchantPrice}
                      onChange={(e) => setNewMerchantPrice(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">Stempel-Ziel (Anzahl Stempel für Belohnung)</label>
                  <input 
                    type="number"
                    min="3"
                    max="14"
                    value={newMerchantStampGoal}
                    onChange={(e) => setNewMerchantStampGoal(parseInt(e.target.value) || 9)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">Belohnungstext (Für Wallet & Push)</label>
                  <input 
                    type="text"
                    value={newMerchantRewardText}
                    onChange={(e) => setNewMerchantRewardText(e.target.value)}
                    placeholder="z.B. Dein Gratis-Lieblingsgericht ist bereit"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="flex gap-4 mt-8 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setShowCreateMerchant(false)}
                    className="flex-1 py-3 text-white/60 font-medium hover:text-white transition-colors"
                    disabled={creatingMerchant}
                  >{t.cancel}</button>
                  <button
                    onClick={handleCreateMerchant}
                    disabled={creatingMerchant || !newMerchantName}
                    className="flex-1 py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#c4a130] transition-colors disabled:opacity-50"
                  >
                    {creatingMerchant ? t.creatingBtn : t.createMerchantSubmitBtn}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111111] border border-red-500/30 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setConfirmDeleteMerchant(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center text-center mb-6 mt-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t.confirmDeleteMerchant}</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                {t.deleteMerchantWarning1} <span className="font-bold text-red-400">{confirmDeleteMerchant.name}</span> {t.deleteMerchantWarning2}
              </p>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDeleteMerchant(null)}
                className="flex-1 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
                disabled={deletingMerchant}
              >{t.cancel}</button>
              <button
                onClick={handleDeleteMerchant}
                disabled={deletingMerchant}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingMerchant ? <RefreshCw className="animate-spin" size={18} /> : t.yesDeleteAll}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
