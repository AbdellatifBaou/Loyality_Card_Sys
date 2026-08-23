'use client';

import { useState, useEffect, use } from 'react';
import { Users, Pizza, Gift, Activity, Bell, CreditCard, RefreshCw, Trash2, AlertTriangle, Lock, LogOut, UserPlus, Settings, Download, X, Edit3, Minus, Plus, Clock, BarChart2, Megaphone, Send, ExternalLink, Eye, EyeOff, CheckCircle, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PRICING } from '@/lib/pricing';
import { MERCHANT_DICT } from '@/locales/merchant';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const DICT = {
  de: {
    defaultStampHeader1: " von 9 Stempeln ",
    defaultStampBody: "Du hast {points} Stempel gesammelt.",
    redeemHeader: "Prämie eingelöst! ",
    redeemBody: "Viel Spaß mit deiner Prämie!",
    rewardHeader: "Belohnung bereit! ✨",
    rewardBody: "Dein gratis Geschenk wartet auf dich!"
  },
  en: {
    defaultStampHeader1: " of 9 stamps ",
    defaultStampBody: "You have collected {points} stamps.",
    redeemHeader: "Reward redeemed! ",
    redeemBody: "Enjoy your reward!",
    rewardHeader: "Reward ready! ✨",
    rewardBody: "Your free gift is waiting for you!"
  },
  fr: {
    defaultStampHeader1: " sur 9 tampons ",
    defaultStampBody: "Vous avez collecté {points} tampons.",
    redeemHeader: "Récompense réclamée! ",
    redeemBody: "Profitez de votre récompense!",
    rewardHeader: "Récompense prête! ✨",
    rewardBody: "Votre cadeau gratuit vous attend!"
  }
};

export default function MerchantDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = use(params);
  const slug = decodeURIComponent(rawSlug).toLowerCase();
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<any>(null);
  const [preMerchant, setPreMerchant] = useState<any>(null);
  const [preLoading, setPreLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  useEffect(() => {
    async function loadPreMerchant() {
      const { data } = await supabase.from('merchants_loyality').select('*').eq('slug', slug).single();
      if (data) {
        setPreMerchant(data);
      } else {
        setNotFound(true);
      }
      setPreLoading(false);
    }
    loadPreMerchant();
  }, [slug]);

  const primaryColor = merchant?.primary_color || preMerchant?.primary_color || '#D4AF37';

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
  // Customer detail panel
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [stampHistory, setStampHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editPoints, setEditPoints] = useState<number | null>(null);
  const [savingPoints, setSavingPoints] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [systemNews, setSystemNews] = useState('');
  
  // New Analytics State
  const [currentMonthCustomers, setCurrentMonthCustomers] = useState(0);
  const [weekdayData, setWeekdayData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [totalLiability, setTotalLiability] = useState(0);
  const [retentionRate, setRetentionRate] = useState(0);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'marketing' | 'billing' | 'qrcodes' | 'security' | 'push'>('overview');
  const [pushSettings, setPushSettings] = useState<any>({});
  const [savingPush, setSavingPush] = useState(false);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [cumulativeMonthlyData, setCumulativeMonthlyData] = useState<any[]>([]);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');
  const [messages, setMessages] = useState<any[]>([]);

  // Stripe Billing State
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');

  // Security State
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinChangeStatus, setPinChangeStatus] = useState<{loading: boolean, error: string, success: string}>({loading: false, error: '', success: ''});
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showOldPin, setShowOldPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    // Support global admin PIN
    if (password === '2025') {
      setIsAuthorized(true);
      localStorage.setItem(`auth_${slug}`, 'true');
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: password, slug })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        // Check if the staff member has "Admin" in their name
        const staffName = data.staffName || data.merchant?.name || ''; // Fallback
        if (!data.merchant?.name?.toLowerCase().includes('admin') && 
            !data.staffName?.toLowerCase().includes('admin')) {
          setAuthError('Diese PIN hat keinen Zugriff auf das Dashboard.');
          return;
        }

        setIsAuthorized(true);
        localStorage.setItem(`auth_${slug}`, 'true');
        if (data.staffId) {
          localStorage.setItem(`staffId_${slug}`, data.staffId);
        }
      } else {
        setAuthError(data.error || 'Ungültige PIN');
      }
    } catch (err) {
      setAuthError('Verbindungsfehler');
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
      const response = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password: '2025' })
      });
      
      const resData = await response.json();
      
      if (!response.ok || !resData.success) {
        setAuthError(resData.error || 'Fehler beim Laden');
        return;
      }
      
      const { 
        merchant: merchantData, 
        customerCount: cc, 
        earnStamps, 
        redeemStamps, 
        recentActivity: activity, 
        customers: cust, 
        staff: staffData,
        messages: fetchedMessages
      } = resData.data;

      if (!merchantData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setMerchant(merchantData);

      // Fetch system news
      try {
        const newsRes = await fetch('/api/news');
        const newsData = await newsRes.json();
        if (newsData.active && newsData.message) {
          setSystemNews(newsData.message);
        }
      } catch (err) {}

      setPushSettings({
        stamp_header: merchantData?.push_settings?.stamp_header || `${(DICT as any)[merchantData?.language || merchant?.language || 'de']?.defaultStampHeader1 || ' von 9 Stempeln '} ${merchantData?.stamp_symbol || '✨'}`,
        stamp_body: merchantData?.push_settings?.stamp_body || `${(DICT as any)[merchantData?.language || merchant?.language || 'de']?.defaultStampBody || 'Du hast {points} Stempel gesammelt.'}${(DICT as any)[merchantData?.language || merchant?.language || 'de']?.defaultStampBodyEnd || ' Weiter so!'}`,
        reward_header: merchantData?.push_settings?.reward_header || (DICT as any)[merchantData?.language || merchant?.language || 'de']?.rewardHeader || 'Belohnung bereit! ✨',
        reward_body: merchantData?.push_settings?.reward_body || merchantData?.reward_text || (DICT as any)[merchantData?.language || merchant?.language || 'de']?.defaultRewardBody || 'Herzlichen Glückwunsch!',
        redeem_header: merchantData?.push_settings?.redeem_header || `${(DICT as any)[merchantData?.language || merchant?.language || 'de']?.redeemHeader || 'Prämie eingelöst! '}${merchantData?.stamp_symbol || '✨'}`,
        redeem_body: merchantData?.push_settings?.redeem_body || `${(DICT as any)[merchantData?.language || merchant?.language || 'de']?.redeemBody || 'Viel Spaß mit deiner Prämie!'} ${(DICT as any)[merchantData?.language || merchant?.language || 'de']?.defaultRedeemBodyEnd || ' Deine Karte wurde auf 0 zurückgesetzt.'}`,
        miss_you_header: merchantData?.push_settings?.miss_you_header || `${(DICT as any)[merchantData?.language || merchant?.language || 'de']?.defaultMissYouHeader || 'Wir vermissen dich bei'} ${merchantData?.name || 'uns'}! 👋`,
        miss_you_body: merchantData?.push_settings?.miss_you_body || (DICT as any)[merchantData?.language || merchant?.language || 'de']?.defaultMissYouBody || 'Du warst schon länger nicht mehr da.'
      });
      setCustomerCount(cc || 0);
      setEarnCount(earnStamps?.length || 0);
      setRedeemCount(redeemStamps?.length || 0);
      setRecentActivity(activity || []);
      setCustomers(cust || []);
      setMessages(fetchedMessages || []);

      // 3. New Advanced Analytics
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Kunden pro aktuellen Monat
      const newThisMonth = cust ? cust.filter((c: any) => new Date(c.created_at) >= firstDayOfMonth).length : 0;
      setCurrentMonthCustomers(newThisMonth);

      // Wochentag, Uhrzeit & Mitarbeiter Analyse
      const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      const weekMap = new Map([['Mo', 0], ['Di', 0], ['Mi', 0], ['Do', 0], ['Fr', 0], ['Sa', 0], ['So', 0]]);
      
      const hourMap = new Map();
      for (let i = 8; i <= 22; i++) {
        hourMap.set(`${i}:00`, 0);
      }
      
      const staffMap = new Map();
      if (staffData) staffData.forEach((s: any) => staffMap.set(s.id, { ...s, stampsGiven: 0 }));

      if (earnStamps) {
        earnStamps.forEach((stamp: any) => {
          // Weekday
          const d = new Date(stamp.created_at);
          const dayName = weekdays[d.getDay()];
          weekMap.set(dayName, weekMap.get(dayName) + stamp.amount);

          // Hour
          const hour = d.getHours();
          if (hour >= 8 && hour <= 22) {
            const hKey = `${hour}:00`;
            hourMap.set(hKey, hourMap.get(hKey) + stamp.amount);
          }

          // Staff Ranking
          if (stamp.staff_id && staffMap.has(stamp.staff_id)) {
             staffMap.get(stamp.staff_id).stampsGiven += stamp.amount;
          }
        });
      }

      setWeekdayData(Array.from(weekMap, ([name, count]) => ({ name, count })));
      setHourlyData(Array.from(hourMap, ([name, count]) => ({ name, count })));
      
      // Sort staff by stamps given
      const sortedStaff = Array.from(staffMap.values()).sort((a, b) => b.stampsGiven - a.stampsGiven);
      setStaff(sortedStaff);

      // Liability & Retention
      if (cust && cust.length > 0) {
        const totalPoints = cust.reduce((sum: number, c: any) => sum + (c.points || 0), 0);
        setTotalLiability(totalPoints);
        
        // Customers with points > 0 OR who have redeemed points are considered returning
        const returningCount = cust.filter((c: any) => c.points > 1).length; // simple logic: points > 1 means they came back
        setRetentionRate(Math.round((returningCount / cust.length) * 100));
      } else {
        setTotalLiability(0);
        setRetentionRate(0);
      }

      // Aggregate monthly data for new customers
      const monthMap = new Map();
      const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      
      const today = new Date();
      const last6Months: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
        last6Months.push({ key, date: d });
        monthMap.set(key, { newCount: 0 });
      }

      if (cust) {
        const oldestMonth = last6Months[0].date;
        let cumulativeTotal = cust.filter((c: any) => new Date(c.created_at) < oldestMonth).length;

        cust.forEach((c: any) => {
          const date = new Date(c.created_at);
          if (date >= oldestMonth) {
            const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
            if (monthMap.has(key)) {
              monthMap.get(key).newCount += 1;
            }
          }
        });

        const cumulativeData = last6Months.map(m => {
          cumulativeTotal += monthMap.get(m.key).newCount;
          return { name: m.key, count: cumulativeTotal };
        });
        
        setCumulativeMonthlyData(cumulativeData);
        
        // Build regular monthlyData as well for fallback/other charts if needed
        setMonthlyData(last6Months.map(m => ({ name: m.key, count: monthMap.get(m.key).newCount })));
      }

      // Calculate Lifetime Stamps for Top 30 Customers
      if (cust && earnStamps) {
        const customerLifetimeStamps = new Map();
        earnStamps.forEach((stamp: any) => {
           customerLifetimeStamps.set(
              stamp.customer_id, 
              (customerLifetimeStamps.get(stamp.customer_id) || 0) + stamp.amount
           );
        });

        const top = cust.map((c: any) => ({
           ...c,
           lifetimeStamps: customerLifetimeStamps.get(c.id) || 0
        })).sort((a: any, b: any) => b.lifetimeStamps - a.lifetimeStamps).slice(0, 30);
        
        setTopCustomers(top);
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthorized, slug]);

  // Lock deactivated merchants to billing tab
  useEffect(() => {
    if (merchant && merchant.is_active === false) {
      setActiveTab('billing');
    }
  }, [merchant]);

  const exportToCSV = () => {
    if (customers.length === 0) return;
    const header = ['Kunden-ID', 'Stempel', 'Registriert am', 'Wallet ID'];
    const csvContent = [
      header.join(','),
      ...customers.map(c => [
        c.id, 
        c.points, 
        new Date(c.created_at).toLocaleString('de-DE'), 
        c.wallet_object_id || ''
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kunden_export_${merchant?.name || slug}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStripeReactivate = async (plan: 'silber' | 'gold' | 'custom') => {
    if (!merchant) return;
    setBillingLoading(true);
    setBillingError('');
    try {
      const response = await fetch('/api/stripe/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchant.id,
          plan: plan
        })
      });
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
        setBillingLoading(false);
      } else {
        setBillingError(data.error || 'Fehler beim Checkout');
        setBillingLoading(false);
      }
    } catch (err) {
      setBillingError('Verbindungsfehler');
      setBillingLoading(false);
    }
  };

  const handleStripePortal = async () => {
    if (!merchant) return;
    setBillingLoading(true);
    setBillingError('');
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: merchant.id })
      });
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
        setBillingLoading(false);
      } else {
        setBillingError(data.error || 'Fehler beim Laden des Kundenportals');
        setBillingLoading(false);
      }
    } catch (err) {
      setBillingError('Verbindungsfehler');
      setBillingLoading(false);
    }
  };

  const deleteCustomer = async (customer: any) => {
    setDeleting(true);
    try {
      const response = await fetch('/api/admin/delete-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id })
      });
      const result = await response.json();
      if (result.success) {
        setCustomers(prev => prev.filter(c => c.id !== customer.id));
        setCustomerCount(prev => prev - 1);
        setConfirmDelete(null);
      } else {
        alert('Fehler beim Löschen: ' + result.error);
      }
    } catch (err) {
      alert('Netzwerkfehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTitle || !msgBody) return;
    setSendingMsg(true);
    setMsgSuccess('');
    
    try {
      await fetch('/api/wallet/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, header: msgTitle, body: msgBody })
      });
      setMsgSuccess('Nachricht erfolgreich an alle Kunden gesendet!');
      setMsgTitle('');
      setMsgBody('');
      fetchData(); // Refresh to get the new message
    } catch (err) {
      console.error(err);
      setMsgSuccess('Fehler beim Senden.');
    } finally {
      setSendingMsg(false);
    }
  };

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffPin || !merchant) return;
    
    setIsAddingStaff(true);
    try {
      const response = await fetch('/api/admin/add-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: merchant.id, name: newStaffName, pin: newStaffPin, password: '2025' })
      });
      const resData = await response.json();
      
      if (!response.ok || !resData.success) {
        alert('Fehler beim Hinzufügen: ' + (resData.error || 'Netzwerkfehler'));
      } else if (resData.data) {
        setStaff(prev => [...prev, resData.data[0]]);
        setNewStaffName('');
        setNewStaffPin('');
        setShowStaffModal(false);
      }
    } catch (err: any) {
      alert('Systemfehler: ' + err.message);
    } finally {
      setIsAddingStaff(false);
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      const response = await fetch('/api/admin/delete-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: '2025' })
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        setStaff(prev => prev.filter(s => s.id !== id));
      } else {
        alert('Fehler beim Löschen: ' + resData.error);
      }
    } catch (err: any) {
      alert('Systemfehler: ' + err.message);
    }
  };

  const openCustomer = async (customer: any) => {
    setSelectedCustomer(customer);
    setEditPoints(customer.points);
    setHistoryLoading(true);
    try {
      const response = await fetch('/api/admin/stamp-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id })
      });
      const result = await response.json();
      if (result.success) {
        setStampHistory(result.data || []);
      } else {
        setStampHistory([]);
      }
    } catch (err) {
      console.error(err);
      setStampHistory([]);
    }
    setHistoryLoading(false);
  };

  const savePushSettings = async () => {
    setSavingPush(true);
    try {
      const response = await fetch('/api/merchant/update-push-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchant.id,
          settings: pushSettings
        })
      });
      if (response.ok) {
        alert('Push-Einstellungen gespeichert!');
      } else {
        alert('Fehler beim Speichern der Push-Einstellungen.');
      }
    } catch (err) {
      alert('Netzwerkfehler.');
    } finally {
      setSavingPush(false);
    }
  };

  const savePoints = async () => {
    if (editPoints === null || !selectedCustomer) return;
    setSavingPoints(true);
    
    try {
      const response = await fetch('/api/admin/update-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          newPoints: editPoints,
          staffId: localStorage.getItem(`staffId_${slug}`) || null
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, points: editPoints } : c));
        setSelectedCustomer((prev: any) => ({ ...prev, points: editPoints }));
      } else {
        alert('Fehler beim Aktualisieren: ' + (result.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      alert('Netzwerkfehler beim Aktualisieren');
    } finally {
      setSavingPoints(false);
    }
  };

  const exportCSV = () => {
    const header = 'Kunden-ID,Stempel,Registriert';
    const rows = customers.map((c: any) =>
      `"${c.wallet_object_id}",${c.points},"${new Date(c.created_at).toLocaleDateString('de-DE')}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kunden_${slug}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeStatus({ loading: true, error: '', success: '' });
    try {
      const response = await fetch('/api/merchant/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, oldPin, newPin })
      });
      const data = await response.json();
      if (data.success) {
        setPinChangeStatus({ loading: false, error: '', success: 'PIN erfolgreich geändert!' });
        setOldPin('');
        setNewPin('');
      } else {
        setPinChangeStatus({ loading: false, error: data.error || 'Fehler beim Ändern', success: '' });
      }
    } catch (err) {
      setPinChangeStatus({ loading: false, error: 'Netzwerkfehler', success: '' });
    }
  };

  const lang = preMerchant?.language || 'de';
  const t = MERCHANT_DICT[lang as keyof typeof MERCHANT_DICT] || MERCHANT_DICT.de;

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center p-8 bg-[#111] border border-[#333] rounded-3xl max-w-sm mx-4">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">{t.merchantNotFound}</h1>
          <p className="text-gray-400">{t.merchantNotFoundDesc}</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {

    if (preLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white/50"></div>
        </div>
      );
    }
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: '#050505' }}>
        <div className="w-full max-w-md p-8 rounded-[40px] relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0A0A0A 0%, #111111 100%)', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
          <div className="text-center mb-8">
            <img src="/Marketif_LOGO_Symbol.png" alt="Marketif" className="h-14 w-auto mx-auto mb-6 opacity-90" style={{ filter: 'brightness(0) invert(1)' }} />
            <h1 className="text-2xl font-bold text-white mb-2">{t.dashboardLogin}</h1>
            <p className="text-white/40 text-sm">{t.enterPasswordFor}<span style={{ color: primaryColor }}>{slug}</span> ein.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
<style>{`input:focus { border-color: ${primaryColor} !important; }`}</style>
            <div className="relative">
              <input
                type={showLoginPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-2xl px-6 py-4 text-center text-white outline-none focus:border-white/50 transition-all"
                placeholder={t.passwordPlaceholder}
                autoFocus
              />
              <button 
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
              >
                {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {authError && <p className="text-red-500 text-xs text-center">{authError}</p>}
            <button type="submit" className="w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-black transition-all active:scale-95" style={{ backgroundColor: primaryColor }}>
              Anmelden
            </button>
          </form>
        </div>
      </main>
    );
  }



  const handle1ClickUpgrade = async () => {
    if (!merchant?.id) return;
    setBillingLoading(true);
    setBillingError('');
    try {
      const res = await fetch('/api/stripe/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: merchant.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Upgrade');
      
      // Reload page to unlock dashboard
      window.location.reload();
    } catch (err: any) {
      setBillingError(err.message || 'Etwas ist schiefgelaufen.');
      setBillingLoading(false);
    }
  };
  if (merchant?.package_type?.toLowerCase() === 'silber') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: '#050505' }}>
        <div className="w-full max-w-4xl p-8 md:p-10 rounded-[40px] text-center" style={{ background: 'linear-gradient(145deg, #0A0A0A 0%, #111111 100%)', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
          <div className="mx-auto w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
            <Lock style={{ color: primaryColor }} size={40} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">{t.dashboardLocked}</h2>
          <p className="text-white/60 mb-8 max-w-2xl mx-auto leading-relaxed">
            Als Nutzer des Silber-Pakets hast du keinen Zugriff auf das Analytics-Dashboard.
            Schalte jetzt detaillierte Statistiken, Kundenverwaltung und Mitarbeiter-PINs frei!
          </p>

          <div className="mb-8 rounded-2xl overflow-hidden border-2 border-white/20 shadow-none mx-auto max-w-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-6 z-10">
            </div>
            <img src="/dashboard-preview.jpg" alt="Dashboard Preview" className="w-full h-auto" />
          </div>

          <div className="max-w-md mx-auto space-y-4">
            {billingError && (
              <div className="p-3 rounded-xl text-sm bg-red-500/10 text-red-500 border border-red-500/20 mb-4">
                {billingError}
              </div>
            )}
            <button 
              onClick={handle1ClickUpgrade}
              disabled={billingLoading}
              className="block w-full py-4 rounded-2xl font-bold text-black transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3" 
              style={{ backgroundColor: primaryColor }}
            >
              {billingLoading ? <RefreshCw className="animate-spin" size={20} /> : <><Activity size={20} /> Jetzt für +{PRICING.gold.price - PRICING.silber.price}€/Monat auf Gold upgraden</>}
            </button>
            <p className="text-xs text-white/40 mt-3">
              Keine erneuten Einrichtungskosten. Die Differenz für den aktuellen Monat wird automatisch anteilig berechnet und sofort abgebucht.
            </p>
            <button onClick={() => { localStorage.removeItem(`auth_${slug}`); setIsAuthorized(false); }} className="mt-6 block w-full py-3 rounded-xl font-bold text-white/50 border border-white/10 hover:bg-white/5 transition-all text-sm">
              Abmelden
            </button>
          </div>
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
            <img src="/Marketif_LOGO_Symbol.png" alt="Marketif" className="h-9 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                {merchant?.name || 'Händler'} <span style={{ color: primaryColor }}>Dashboard</span>
              </h1>
              <p className="text-white/50 mt-0.5 font-medium text-sm flex items-center gap-2">
                <Settings size={14} /> {t.mgmtStats}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={exportCSV} className="p-3 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 transition-all" title="CSV Export">
              <Download size={20} />
            </button>
            <button onClick={fetchData} disabled={loading} className="p-3 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 transition-all">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => { localStorage.removeItem(`auth_${slug}`); setIsAuthorized(false); }} className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </header>

          {systemNews && (
            <div className="bg-indigo-500/20 border border-indigo-500/50 rounded-xl p-4 flex gap-4 items-start animate-fade-in">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-indigo-200 font-bold mb-1">Marketif News</h3>
                <p className="text-white/80 text-sm whitespace-pre-line">{systemNews}</p>
              </div>
              <button onClick={() => setSystemNews('')} className="text-white/40 hover:text-white/80">
                <X size={20} />
              </button>
            </div>
          )}


        {/* Payment Warning Banner */}
        {merchant?.subscription_status === 'payment_failed' && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-4">
            <AlertTriangle className="shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold text-sm mb-1">Wichtiger Hinweis zur Abrechnung</p>
              <p className="text-sm text-red-400/90 leading-relaxed">
                Bei der Abbuchung deiner letzten Zahlung ist ein Fehler aufgetreten. Bitte überprüfe deine hinterlegte Zahlungsmethode unter dem Reiter <strong>"Abo & Abrechnung"</strong> oder sorge für ausreichende Deckung, um eine automatische Sperrung deines Zugangs zu vermeiden.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        {merchant?.is_active === false && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-medium text-sm flex items-center gap-3">
            <AlertTriangle size={20} />
            {t.accountDeactivatedAlert}
          </div>
        )}
        
          {systemNews && (
            <div className="bg-indigo-500/20 border border-indigo-500/50 rounded-xl p-4 flex gap-4 items-start animate-fade-in mb-6">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-indigo-200 font-bold mb-1">Marketif News</h3>
                <p className="text-white/80 text-sm whitespace-pre-line">{systemNews}</p>
              </div>
              <button onClick={() => setSystemNews('')} className="text-white/40 hover:text-white/80">
                <X size={20} />
              </button>
            </div>
          )}

        <div className="flex gap-4 border-b border-white/5 pb-1">
          <button 
            onClick={() => setActiveTab('overview')}
            disabled={merchant?.is_active === false}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-all ${merchant?.is_active === false ? 'opacity-50 cursor-not-allowed border-transparent text-white/20' : 'border-transparent text-white/40 hover:text-white/70'}`}
            style={merchant?.is_active !== false ? { borderColor: activeTab === 'overview' ? primaryColor : 'transparent', color: activeTab === 'overview' ? primaryColor : undefined } : {}}
          >
            <div className="flex items-center gap-2"><Activity size={16}/> {t.tabOverview}</div>
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            disabled={merchant?.is_active === false}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-all ${merchant?.is_active === false ? 'opacity-50 cursor-not-allowed border-transparent text-white/20' : 'border-transparent text-white/40 hover:text-white/70'}`}
            style={merchant?.is_active !== false ? { borderColor: activeTab === 'analytics' ? primaryColor : 'transparent', color: activeTab === 'analytics' ? primaryColor : undefined } : {}}
          >
            <div className="flex items-center gap-2"><BarChart2 size={16}/> {t.tabAnalytics}</div>
          </button>
          <button 
            onClick={() => setActiveTab('marketing')}
            disabled={merchant?.is_active === false}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-all ${merchant?.is_active === false ? 'opacity-50 cursor-not-allowed border-transparent text-white/20' : 'border-transparent text-white/40 hover:text-white/70'}`}
            style={merchant?.is_active !== false ? { borderColor: activeTab === 'marketing' ? primaryColor : 'transparent', color: activeTab === 'marketing' ? primaryColor : undefined } : {}}
          >
            <div className="flex items-center gap-2"><Megaphone size={16}/> {t.tabMarketing}</div>
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-all whitespace-nowrap ${'border-transparent text-white/40 hover:text-white/70'}`}
            style={{ borderColor: activeTab === 'billing' ? primaryColor : 'transparent', color: activeTab === 'billing' ? primaryColor : undefined }}
          >
            <div className="flex items-center gap-2"><CreditCard size={16}/> {t.tabBilling}</div>
          </button>
          <button
            onClick={() => setActiveTab('push')}
            disabled={merchant?.is_active === false}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-all whitespace-nowrap ${merchant?.is_active === false ? 'opacity-50 cursor-not-allowed border-transparent text-white/20' : 'border-transparent text-white/40 hover:text-white/70'}`}
            style={merchant?.is_active !== false ? { borderColor: activeTab === 'push' ? primaryColor : 'transparent', color: activeTab === 'push' ? primaryColor : undefined } : {}}
          >
            {t.tabPush}
          </button>
          <button 
            onClick={() => setActiveTab('qrcodes')}
            disabled={merchant?.is_active === false}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-all whitespace-nowrap ${merchant?.is_active === false ? 'opacity-50 cursor-not-allowed border-transparent text-white/20' : 'border-transparent text-white/40 hover:text-white/70'}`}
            style={merchant?.is_active !== false ? { borderColor: activeTab === 'qrcodes' ? primaryColor : 'transparent', color: activeTab === 'qrcodes' ? primaryColor : undefined } : {}}
          >
            <div className="flex items-center gap-2"><Download size={16}/> {t.tabQr}</div>
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            disabled={merchant?.is_active === false}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-all whitespace-nowrap ${merchant?.is_active === false ? 'opacity-50 cursor-not-allowed border-transparent text-white/20' : 'border-transparent text-white/40 hover:text-white/70'}`}
            style={merchant?.is_active !== false ? { borderColor: activeTab === 'security' ? primaryColor : 'transparent', color: activeTab === 'security' ? primaryColor : undefined } : {}}
          >
            <div className="flex items-center gap-2"><Lock size={16}/> {t.tabSecurity}</div>
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
                  <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20"><Users size={22} className="text-blue-500" /></div>
                  <h2 className="text-white/60 font-medium text-sm">{t.activeCards}</h2>
                </div>
                <p className="text-4xl font-black text-white">{customerCount}</p>
              </div>
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20"><UserPlus size={22} className="text-purple-500" /></div>
                  <h2 className="text-white/60 font-medium text-sm">{t.customersThisMonth}</h2>
                </div>
                <p className="text-4xl font-black text-white">{currentMonthCustomers}</p>
              </div>
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20"><Pizza size={22} className="text-green-500" /></div>
                  <h2 className="text-white/60 font-medium text-sm">{t.stampsCollected}</h2>
                </div>
                <p className="text-4xl font-black text-white">{earnCount}</p>
              </div>
              <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl" style={{ background: `${primaryColor}1A`, border: `1px solid ${primaryColor}33` }}><Gift size={22} style={{ color: primaryColor }} /></div>
                  <h2 className="text-white/60 font-medium text-sm">{t.rewardsGiven}</h2>
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
                    <h2 className="text-lg font-bold text-white">{t.customerCards}</h2>
                    <span className="ml-auto text-xs text-white/40 font-medium">{customerCount} {t.total}</span>
                  </div>
                  {/* Search & Export */}
                  <div className="px-6 py-4 border-b border-white/5 flex gap-3">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={t.searchCustomerIdPlaceholder}
                      className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-all font-mono"
                    />
                    <button
                      onClick={exportToCSV}
                      className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white/80 text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                      <Download size={16} /> {t.exportCsv}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }} className="text-white/50 text-xs uppercase tracking-wider">
                          <th className="p-4 font-medium">{t.customerId}</th>
                          <th className="p-4 font-medium">{t.stamps}</th>
                          <th className="p-4 font-medium">{t.progress}</th>
                          <th className="p-4 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers
                          .filter((c: any) =>
                            !searchQuery || c.wallet_object_id?.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((customer: any) => {
                          const pct = Math.round((customer.points / 9) * 100);
                          return (
                            <tr key={customer.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openCustomer(customer)}>
                              <td className="p-4">
                                <span className="font-mono text-xs text-white/70 bg-white/5 px-2 py-1 rounded-lg">
                                  {customer.wallet_object_id?.substring(0, 14)}...
                                </span>
                              </td>
                              <td className="p-4 text-white font-bold">{customer.points} <span className="text-white/20">/ 9</span></td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden min-w-[60px]">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: primaryColor }} />
                                  </div>
                                  <span className="text-[10px] text-white/30">{pct}%</span>
                                </div>
                              </td>
                              <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
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
                      <h2 className="text-lg font-bold text-white">{t.staffPins}</h2>
                    </div>
                    <button onClick={() => setShowStaffModal(true)} className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all">
                      <UserPlus size={18} />
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {staff.map((s: any, idx: number) => (
                      <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/3 border border-white/5 relative overflow-hidden">
                        {idx === 0 && s.stampsGiven > 0 && <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-yellow-500 to-transparent opacity-20" />}
                        <div className="flex items-center gap-3">
                          {idx === 0 && s.stampsGiven > 0 ? <span className="text-xl">🏆</span> : <span className="text-xl text-white/20">{idx + 1}.</span>}
                          <div>
                            <p className="text-sm font-bold text-white flex items-center gap-2">{s.name}</p>
                            <p className="text-xs font-mono text-white/80 tracking-[0.2em]">{s.pin}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-bold text-white">{s.stampsGiven || 0}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{t.stamps}</p>
                          </div>
                          <button onClick={() => deleteStaff(s.id)} className="text-white/10 hover:text-red-500 transition-colors p-2">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {staff.length === 0 && <p className="text-center py-4 text-white/20 text-sm italic">{t.noStaffCreated}</p>}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="p-6 border-b border-white/5 flex items-center gap-3">
                    <Activity size={20} className="text-white/60" />
                    <h2 className="text-lg font-bold text-white">{t.activity}</h2>
                  </div>
                  <div className="p-4 space-y-4">
                    {recentActivity.map((a: any) => (
                      <div key={a.id} className="flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${a.type === 'earn' ? 'bg-green-500' : a.type === 'correction' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                        <div>
                          <p className="text-xs text-white/70">
                            <span className="font-bold">
                              {a.type === 'earn' 
                                ? `+${a.amount} ${t.stamps}` 
                                : a.type === 'correction' 
                                  ? `${a.amount > 0 ? '+' : ''}${a.amount} ${t.stamps}` 
                                  : t.rewardRedeemedText}
                            </span>
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

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 mb-6">
                <BarChart2 size={20} style={{ color: primaryColor }} />
                <h2 className="text-lg font-bold text-white">{t.stampsByWeekday}</h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weekdayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#111', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '12px' }}
                      itemStyle={{ color: primaryColor }}
                    />
                    <Line type="monotone" dataKey="count" name={t.stampsGiven} stroke={primaryColor} strokeWidth={3} dot={{ r: 4, fill: primaryColor, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 mb-6">
                <Clock size={20} className="text-purple-500" />
                <h2 className="text-lg font-bold text-white">{t.peakHours}</h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#111', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '12px' }}
                      itemStyle={{ color: '#a855f7' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="count" name={t.stamps} fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 mb-6">
                <Activity size={20} className="text-blue-500" />
                <h2 className="text-lg font-bold text-white">{t.totalCustomersPerMonth}</h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cumulativeMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#111', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px' }}
                      itemStyle={{ color: '#3b82f6' }}
                    />
                    <Line type="monotone" dataKey="count" name={t.totalCustomers} stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 mb-6">
                <UserPlus size={20} className="text-orange-500" />
                <h2 className="text-lg font-bold text-white">{t.newCustomersPerMonth}</h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#111', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '12px' }}
                      itemStyle={{ color: '#f97316' }}
                    />
                    <Bar dataKey="count" name={t.newCustomers} fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-3xl lg:col-span-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 mb-6">
                <Users size={20} className="text-green-500" />
                <h2 className="text-lg font-bold text-white">{t.top30Customers}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }} className="text-white/50 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium w-16">{t.rank}</th>
                      <th className="p-4 font-medium">{t.customerId}</th>
                      <th className="p-4 font-medium text-right">{t.lifetimeStampsTitle}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((c: any, idx: number) => (
                      <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openCustomer(c)}>
                        <td className="p-4 text-white/50 font-mono text-xs">{idx + 1}.</td>
                        <td className="p-4">
                          <span className="font-mono text-xs text-white/70 bg-white/5 px-2 py-1 rounded-lg">
                            {c.wallet_object_id?.substring(0, 14)}...
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 font-bold text-sm rounded-lg border border-green-500/20">
                            {c.lifetimeStamps} {t.scans}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {topCustomers.length === 0 && <p className="text-center text-white/40 text-sm py-8">{t.noDataAvailable}</p>}
              </div>
            </div>
          </div>
        )}

        {/* MARKETING TAB */}
        {activeTab === 'marketing' && (
          <div className="space-y-6 max-w-2xl">
            <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 mb-6">
                <Megaphone size={20} style={{ color: primaryColor }} />
                <h2 className="text-lg font-bold text-white">{t.messageToAllCustomers}</h2>
              </div>
              <p className="text-sm text-white/50 mb-6">
                {t.pushNotificationDesc}
              </p>
              
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">{t.messageTitle}</label>
                  <input
                    type="text"
                    value={msgTitle}
                    onChange={e => setMsgTitle(e.target.value)}
                    placeholder={t.messageTitlePlaceholder}
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/50 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">{t.content}</label>
                  <textarea
                    value={msgBody}
                    onChange={e => setMsgBody(e.target.value)}
                    placeholder={t.messageContentPlaceholder}
                    required
                    rows={4}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/50 transition-all text-sm resize-none"
                  />
                </div>
                
                {msgSuccess && (
                  <div className={`p-3 rounded-xl text-sm text-center ${msgSuccess.includes('Fehler') ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                    {msgSuccess}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={sendingMsg}
                  className="w-full mt-2 py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-black disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
                  style={{ backgroundColor: primaryColor }}
                >
                  {sendingMsg ? <RefreshCw className="animate-spin" size={20} /> : <><Send size={20} /> {t.sendMessage}</>}
                </button>
              </form>
            </div>

            {/* Sent Messages History */}
            <div className="p-6 rounded-3xl mt-8" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 mb-6">
                <Clock size={20} className="text-white/60" />
                <h2 className="text-lg font-bold text-white">{t.sentMessages}</h2>
              </div>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-white/40 italic">{t.noMessagesSent}</p>
                ) : (
                  messages.map((msg: any) => (
                    <div key={msg.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-sm">{msg.header}</h3>
                        <span className="text-[10px] text-white/40">{new Date(msg.created_at).toLocaleString('de-DE')}</span>
                      </div>
                      <p className="text-sm text-white/70 whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
          <div className="space-y-6 max-w-2xl">
            <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 mb-6">
                <CreditCard size={20} style={{ color: primaryColor }} />
                <h2 className="text-lg font-bold text-white">{t.billingAndSubscription}</h2>
              </div>
              
              {billingError && (
                <div className="p-3 mb-6 rounded-xl text-sm bg-red-500/10 text-red-500 border border-red-500/20">
                  {billingError}
                </div>
              )}

              {merchant?.is_active === false ? (
                <>
                  <p className="text-sm text-white/70 mb-6">
                    {t.subscriptionWas} <span className="text-red-500 font-bold">{t.lockedOrExpired}</span>{t.updatePaymentMethod}
                  </p>
                  <button 
                    onClick={() => handleStripeReactivate(merchant.package_type || 'silber')}
                    disabled={billingLoading}
                    className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-black disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95 bg-white/10 hover:bg-white/20"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {billingLoading ? <RefreshCw className="animate-spin" size={20} /> : '{t.reactivateSubscriptionStripe}'}
                  </button>
                </>
              ) : merchant?.subscription_status === 'active' || merchant?.subscription_status === 'cancels_at_period_end' ? (
                <>
                  {merchant?.subscription_status === 'cancels_at_period_end' ? (
                    <p className="text-sm text-white/70 mb-6">
                      {t.subscriptionIs} <span className="text-yellow-500 font-bold">{t.cancelled}</span>{t.activeUntil} <span className="font-bold text-white">{merchant.current_period_end ? new Date(merchant.current_period_end).toLocaleDateString('de-DE') : t.endOfBillingPeriod}</span>{t.reactivateAnytime}
                    </p>
                  ) : merchant?.stripe_subscription_id === 'manual_invoice' ? (
                    <p className="text-sm text-white/70 mb-6">
                      {t.subscriptionIs} <span className="text-green-500 font-bold">{t.active}</span> bis zum <span className="font-bold text-white">{merchant.current_period_end ? new Date(merchant.current_period_end).toLocaleDateString('de-DE') : t.endOfBillingPeriod}</span>{t.manualInvoiceBilling}
                    </p>
                  ) : (
                    <p className="text-sm text-white/70 mb-6">
                      {t.subscriptionIs} <span className="text-green-500 font-bold">{t.active}</span>{t.manageInPortal}
                    </p>
                  )}
                  {merchant?.stripe_subscription_id && merchant?.stripe_subscription_id !== 'manual_invoice' ? (
                    <button 
                      onClick={handleStripePortal}
                      disabled={billingLoading}
                      className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-black disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {billingLoading ? <RefreshCw className="animate-spin" size={20} /> : <><ExternalLink size={20} /> {t.openStripePortal}</>}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleStripeReactivate(merchant.package_type || 'silber')}
                      disabled={billingLoading}
                      className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95 bg-white/10 hover:bg-white/20"
                    >
                      {billingLoading ? <RefreshCw className="animate-spin" size={20} /> : t.switchToAutoPayment}
                    </button>
                  )}
                </>
              ) : (
                <>
                  {merchant?.package_type === 'custom' ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-white/70 mb-4">
                        {t.customSubscriptionCurrently} <span className="text-red-500 font-bold">{t.cancelled}</span>.
                      </p>
                      {merchant?.custom_price ? (
                        <button 
                          onClick={() => handleStripeReactivate('custom')}
                          disabled={billingLoading}
                          className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-black disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {billingLoading ? <RefreshCw className="animate-spin" size={20} /> : <><CreditCard size={20} /> {t.reactivateSubscriptionPrefix} {merchant.custom_price}{t.perMonthSuffix}</>}
                        </button>
                      ) : (
                        <a href="mailto:kontakt@marketif.de" className="inline-block w-full py-4 rounded-xl font-bold text-center text-black transition-all hover:scale-[1.02] active:scale-95" style={{ backgroundColor: primaryColor }}>
                          Support kontaktieren
                        </a>
                      )}
                    </div>
                  ) : (!merchant?.package_type) ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-white/70 mb-4">
                        Dein Abonnement ist derzeit <span className="text-red-500 font-bold">{t.cancelled}</span>.
                      </p>
                      <a href="mailto:kontakt@marketif.de" className="inline-block w-full py-4 rounded-xl font-bold text-center text-black transition-all hover:scale-[1.02] active:scale-95" style={{ backgroundColor: primaryColor }}>
                        Support kontaktieren
                      </a>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-white/70 mb-6">
                        Dein Abonnement ist derzeit <span className="text-red-500 font-bold">{t.cancelled}</span>. Wähle ein Paket, um dein Abo zu reaktivieren (keine erneuten Einrichtungskosten).
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleStripeReactivate('silber')}
                          disabled={billingLoading}
                          className="p-4 rounded-xl text-left border transition-all hover:scale-[1.02] active:scale-95"
                          style={{ background: 'rgba(176,176,176,0.1)', borderColor: 'rgba(176,176,176,0.5)' }}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#B0B0B0] mb-1">{t.silver}</p>
                          <p className="text-2xl font-bold text-white mb-2">49€<span className="text-sm text-white/50 font-normal">{t.perMonth}</span></p>
                          <div className="flex items-center gap-2 text-sm text-[#B0B0B0] mt-4 font-bold">
                            {billingLoading ? <RefreshCw className="animate-spin" size={16} /> : <><CreditCard size={16} /> {t.reactivate}</>}
                          </div>
                        </button>
                        <button 
                          onClick={() => handleStripeReactivate('gold')}
                          disabled={billingLoading}
                          className="p-4 rounded-xl text-left border transition-all hover:scale-[1.02] active:scale-95 relative overflow-hidden"
                          style={{ background: 'rgba(212,175,55,0.1)', borderColor: 'rgba(212,175,55,0.5)' }}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1">{t.gold}</p>
                          <p className="text-2xl font-bold text-white mb-2">89€<span className="text-sm text-white/50 font-normal">{t.perMonth}</span></p>
                          <div className="flex items-center gap-2 text-sm text-white/80 mt-4 font-bold">
                            {billingLoading ? <RefreshCw className="animate-spin" size={16} /> : <><CreditCard size={16} /> {t.reactivate}</>}
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Push Settings Tab */}
        {activeTab === 'push' && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-2">{t.customizePushMessages}</h2>
              <p className="text-white/60 text-sm mb-6">{t.pushMessagesDesc}</p>

              <div className="space-y-8">
                {/* Stamp Message */}
                <div className="p-5 bg-black/40 rounded-xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{t.whenStamping}</h3>
                      <p className="text-xs text-white/50">{t.sentWhen1to8Stamps}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1">{t.title}</label>
                      <input 
                        type="text" 
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 outline-none focus:border-white/50"
                        placeholder={`{points}${DICT[(merchant?.language || merchant?.language || 'de') as keyof typeof DICT]?.defaultStampHeader1 || ' von 9 Stempeln '} ${merchant?.stamp_symbol || '✨'}`} 
                        value={pushSettings.stamp_header || ''}
                        onChange={(e) => setPushSettings({...pushSettings, stamp_header: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1">{t.pushMessage}</label>
                      <textarea 
                        value={pushSettings.stamp_body || ''}
                        onChange={(e) => setPushSettings({...pushSettings, stamp_body: e.target.value})}
                        placeholder={t.stampBodyPlaceholder} 
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 outline-none focus:border-white/50 min-h-[80px]" 
                      />
                    </div>
                  </div>
                </div>

                {/* Reward Ready Message */}
                <div className="p-5 bg-black/40 rounded-xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{t.rewardReached}</h3>
                      <p className="text-xs text-white/50">{t.sentWhenCardFull}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1">{t.title}</label>
                      <input 
                        type="text" 
                        value={pushSettings.reward_header || ''}
                        onChange={(e) => setPushSettings({...pushSettings, reward_header: e.target.value})}
                        placeholder="Belohnung bereit! ✨" 
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 outline-none focus:border-white/50" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1">{t.pushMessage}</label>
                      <textarea 
                        value={pushSettings.reward_body || ''}
                        onChange={(e) => setPushSettings({...pushSettings, reward_body: e.target.value})}
                        placeholder={t.rewardBodyPlaceholder} 
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 outline-none focus:border-white/50 min-h-[80px]" 
                      />
                    </div>
                  </div>
                </div>

                {/* Redeem Message */}
                <div className="p-5 bg-black/40 rounded-xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <LogOut className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{t.rewardRedeemed}</h3>
                      <p className="text-xs text-white/50">{t.sentWhenCardReset}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1">{t.title}</label>
                      <input 
                        type="text" 
                        value={pushSettings.redeem_header || ''}
                        onChange={(e) => setPushSettings({...pushSettings, redeem_header: e.target.value})}
                        placeholder={`${DICT[(merchant?.language || merchant?.language || 'de') as keyof typeof DICT]?.redeemHeader || 'Prämie eingelöst! '}`} 
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 outline-none focus:border-white/50" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1">{t.pushMessage}</label>
                      <textarea 
                        value={pushSettings.redeem_body || ''}
                        onChange={(e) => setPushSettings({...pushSettings, redeem_body: e.target.value})}
                        placeholder={t.redeemBodyPlaceholder} 
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 outline-none focus:border-white/50 min-h-[80px]" 
                      />
                    </div>
                  </div>
                </div>

                {/* We Miss You Message */}
                <div className="p-5 bg-black/40 rounded-xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{t.customerReactivation}</h3>
                      <p className="text-xs text-white/50">{t.sentWhenNoStamp30Days}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1">{t.title}</label>
                      <input 
                        type="text" 
                        value={pushSettings.miss_you_header || ''}
                        onChange={(e) => setPushSettings({...pushSettings, miss_you_header: e.target.value})}
                        placeholder={`Wir vermissen dich bei ${merchant?.name || 'uns'}! 👋`}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 outline-none focus:border-white/50" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1">{t.pushMessage}</label>
                      <textarea 
                        value={pushSettings.miss_you_body || ''}
                        onChange={(e) => setPushSettings({...pushSettings, miss_you_body: e.target.value})}
                        placeholder={t.missYouBodyPlaceholder} 
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 outline-none focus:border-white/50 min-h-[80px]" 
                      />
                    </div>
                  </div>
                </div>

                {/* Location Message (Info only) */}
                <div className="p-5 bg-black/40 rounded-xl border border-white/5 space-y-4 opacity-75">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Megaphone className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{t.locationReminder}</h3>
                      <p className="text-xs text-white/50">{t.sentWhenNearStore}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3 text-sm text-white/70">
                    <p>{t.thisNotificationIs} <strong>{t.autoByWallets}</strong> {t.generatedWhenNear}</p>
                    <p className="mt-2 text-xs text-white/50">{t.locationReminderNote}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                <button
                  onClick={savePushSettings}
                  disabled={savingPush}
                  className="px-6 py-2.5 bg-white/20 hover:bg-white/30 text-black font-semibold rounded-lg transition-colors flex items-center gap-2"
                  style={{ backgroundColor: merchant.primary_color || '#D4AF37', color: '#000' }}
                >
                  {savingPush ? (
                    <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {t.saveSettings}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR CODES TAB */}
        {activeTab === 'qrcodes' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 mb-6">
                <Download size={20} style={{ color: primaryColor }} />
                <h2 className="text-lg font-bold text-white">{t.downloadQrCodesTitle}</h2>
              </div>
              <p className="text-white/60 text-sm mb-8">
                {t.qrCodesDesc}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Customer QR */}
                <div className="p-6 rounded-2xl flex flex-col items-center text-center" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 className="text-white font-bold mb-2">{t.qrForCustomers}</h3>
                  <p className="text-white/40 text-xs mb-6">{t.qrCustomerSub}</p>
                  
                  <div className="w-48 h-48 bg-white p-2 rounded-xl mb-6">
                    <img src={`/api/qr-code?text=${encodeURIComponent('https://treue.marketif.de/join/' + slug)}`} alt="Customer QR Code" className="w-full h-full object-contain" />
                  </div>
                  
                  <a href={`/api/qr-code?text=${encodeURIComponent('https://treue.marketif.de/join/' + slug)}`} download={`marketif_treue_karte_${slug}.png`} className="w-full py-3 rounded-xl border border-white/10 text-white/80 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-medium">
                    <Download size={16} /> {t.qrAsPng}
                  </a>
                  <p className="text-xs text-white/30 mt-4 break-all">https://treue.marketif.de/join/{slug}</p>
                </div>

                {/* Staff QR */}
                <div className="p-6 rounded-2xl flex flex-col items-center text-center" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 className="text-white font-bold mb-2">{t.qrForStaff}</h3>
                  <p className="text-white/40 text-xs mb-6">{t.qrStaffSub}</p>
                  
                  <div className="w-48 h-48 bg-white p-2 rounded-xl mb-6">
                    <img src={`/api/qr-code?text=${encodeURIComponent('https://treue.marketif.de/' + slug)}`} alt="Scanner QR Code" className="w-full h-full object-contain" />
                  </div>
                  
                  <a href={`/api/qr-code?text=${encodeURIComponent('https://treue.marketif.de/' + slug)}`} download={`marketif_scanner_${slug}.png`} className="w-full py-3 rounded-xl border border-white/10 text-white/80 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-medium">
                    <Download size={16} /> {t.qrAsPng}
                  </a>
                  <p className="text-xs text-white/30 mt-4 break-all">https://treue.marketif.de/{slug}</p>
                </div>

                {/* Dashboard QR */}
                <div className="p-6 rounded-2xl flex flex-col items-center text-center" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 className="text-white font-bold mb-2">{t.qrForDashboard}</h3>
                  <p className="text-white/40 text-xs mb-6">{t.qrDashboardSub}</p>
                  
                  <div className="w-48 h-48 bg-white p-2 rounded-xl mb-6">
                    <img src={`/api/qr-code?text=${encodeURIComponent('https://treue.marketif.de/dashboard/' + slug)}`} alt="Dashboard QR Code" className="w-full h-full object-contain" />
                  </div>
                  
                  <a href={`/api/qr-code?text=${encodeURIComponent('https://treue.marketif.de/dashboard/' + slug)}`} download={`marketif_dashboard_${slug}.png`} className="w-full py-3 rounded-xl border border-white/10 text-white/80 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-medium">
                    <Download size={16} /> {t.qrAsPng}
                  </a>
                  <p className="text-xs text-white/30 mt-4 break-all">https://treue.marketif.de/dashboard/{slug}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="space-y-6 max-w-2xl">
            <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 mb-6">
                <Lock size={20} style={{ color: merchant?.primary_color || '#D4AF37' }} />
                <h2 className="text-lg font-bold text-white">{t.changeMasterPin}</h2>
              </div>
              <p className="text-sm text-white/50 mb-6">
                {t.changeMasterPinDesc}
              </p>
              <form onSubmit={handlePinChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">{t.currentPin}</label>
                  <div className="relative">
                    <input
                      type={showOldPin ? "text" : "password"}
                      inputMode="numeric"
                      value={oldPin}
                      onChange={(e) => setOldPin(e.target.value)}
                      required
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none transition-all text-sm pr-12"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowOldPin(!showOldPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                    >
                      {showOldPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">{t.newPinRule}</label>
                  <div className="relative">
                    <input
                      type={showNewPin ? "text" : "password"}
                      inputMode="numeric"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      required
                      minLength={4}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none transition-all text-sm pr-12"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNewPin(!showNewPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                    >
                      {showNewPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {pinChangeStatus.error && (
                  <p className="text-red-500 text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20">{pinChangeStatus.error}</p>
                )}
                {pinChangeStatus.success && (
                  <p className="text-green-500 text-xs bg-green-500/10 p-3 rounded-xl border border-green-500/20">{pinChangeStatus.success}</p>
                )}

                <button 
                  type="submit" 
                  disabled={pinChangeStatus.loading}
                  className="w-full py-3 rounded-xl font-bold uppercase tracking-widest text-black transition-all disabled:opacity-50 mt-4" 
                  style={{ background: merchant?.primary_color || '#D4AF37' }}
                >
                  {pinChangeStatus.loading ? <RefreshCw className="animate-spin mx-auto" size={16} /> : t.updatePin}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    )}
  </div>

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowStaffModal(false)}>
          <div className="w-full max-w-sm p-8 rounded-[40px] space-y-6 animate-scale-up" style={{ background: '#111', border: '1px solid rgba(212,175,55,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white">{t.addStaff}</h3>
            <form onSubmit={addStaff} className="space-y-4">
              <input value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-white/50 transition-all" placeholder="Name (z.B. Latif)" />
              <input value={newStaffPin} onChange={e => setNewStaffPin(e.target.value)} maxLength={6} className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-mono tracking-[0.5em] text-center outline-none focus:border-white/50 transition-all" placeholder="PIN" />
              <button 
                type="submit" 
                disabled={isAddingStaff}
                className="w-full py-4 rounded-2xl font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50" 
                style={{ backgroundColor: primaryColor }}
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
              <h3 className="text-white font-bold text-lg">{t.deleteCustomerTitle}</h3>
            </div>
            <p className="text-white/60 text-sm">{t.card} {confirmDelete.wallet_object_id?.substring(0, 8)}{t.deleteIrrevocably}</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting} className="flex-1 py-4 rounded-2xl border border-white/10 text-white/60 hover:bg-white/5 transition-all">{t.cancel}</button>
              <button onClick={() => deleteCustomer(confirmDelete)} disabled={deleting} className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold flex items-center justify-center gap-2">
                {deleting ? <RefreshCw size={16} className="animate-spin" /> : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedCustomer(null)}>
          {/* Backdrop */}
          <div className="flex-1 bg-black/60 backdrop-blur-sm" />
          {/* Drawer */}
          <div
            className="w-full max-w-md h-full overflow-y-auto flex flex-col"
            style={{ background: '#0E0E0E', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0E0E0E] z-10">
              <div>
                <h3 className="text-white font-bold text-lg">{t.customerDetail}</h3>
                <p className="font-mono text-xs text-white/30 mt-0.5">{selectedCustomer.wallet_object_id?.substring(0, 20)}...</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Manual Point Editor */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <Edit3 size={16} style={{ color: primaryColor }} />
                <h4 className="text-sm font-bold text-white">{t.correctStamps}</h4>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditPoints(p => Math.max(0, (p ?? 0) - 1))}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all"
                ><Minus size={18} /></button>
                <div className="flex-1 text-center">
                  <span className="text-4xl font-black text-white">{editPoints}</span>
                  <span className="text-white/20 text-xl"> / 9</span>
                </div>
                <button
                  onClick={() => setEditPoints(p => {
                    if ((p ?? 0) >= 9) return 0;
                    return (p ?? 0) + 1;
                  })}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all"
                ><Plus size={18} /></button>
              </div>
              {editPoints !== selectedCustomer.points && (
                <button
                  onClick={savePoints}
                  disabled={savingPoints}
                  className="w-full mt-4 py-3 rounded-2xl font-bold text-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {savingPoints ? <RefreshCw size={16} className="animate-spin" /> : t.save}
                </button>
              )}
            </div>

            {/* Stamp History */}
            <div className="p-6 flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-white/40" />
                <h4 className="text-sm font-bold text-white">{t.stampHistoryTitle}</h4>
              </div>
              {historyLoading ? (
                <div className="flex justify-center py-8"><RefreshCw size={24} className="animate-spin text-white/20" /></div>
              ) : stampHistory.length === 0 ? (
                <p className="text-center text-white/20 text-sm py-8 italic">{t.noActivityFound}</p>
              ) : (
                <div className="space-y-3">
                  {stampHistory.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${s.type === 'earn' ? 'bg-green-500' : s.type === 'correction' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${s.type === 'earn' ? 'text-green-400' : s.type === 'correction' ? 'text-blue-400' : 'text-yellow-400'}`}>
                          {s.type === 'earn' ? `+${s.amount} Stempel` : s.type === 'correction' ? `${s.amount > 0 ? '+' : ''}${s.amount} Stempel` : t.rewardRedeemedIcon}
                        </p>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[10px] text-white/30">{new Date(s.created_at).toLocaleString('de-DE')}</p>
                          {s.staff_loyality?.name && (
                            <p className="text-[10px] text-white/50 font-medium">👤 {s.staff_loyality.name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
