'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Printer, MessageCircle, Mail, Globe, Calendar, 
  TrendingUp, Users, Award, Gift, Clock, Sparkles, 
  RefreshCw, CheckCircle2, ChevronRight, BarChart3, Store, Smartphone
} from 'lucide-react';

interface ReportModalProps {
  merchant: any;
  onClose: () => void;
  adminLang?: string;
  isMerchantView?: boolean;
}

export default function ReportModal({ merchant, onClose, adminLang, isMerchantView = false }: ReportModalProps) {
  const initialLang = merchant?.language === 'fr' ? 'fr' : (merchant?.language === 'de' ? 'de' : (adminLang === 'fr' ? 'fr' : 'de'));
  const [lang, setLang] = useState<'de' | 'fr'>(initialLang);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const [timeframe, setTimeframe] = useState<'month' | 'year' | 'all'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [emailSuccess, setEmailSuccess] = useState<boolean>(false);

  const monthNamesDe = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const monthNamesFr = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const fetchReport = async (action?: 'send_email') => {
    if (!merchant?.id) return;
    if (action === 'send_email') {
      setSendingEmail(true);
      setEmailSuccess(false);
    } else {
      setLoading(true);
      setError('');
    }

    try {
      const authKey = isMerchantView 
        ? localStorage.getItem(`auth_${merchant.slug}`) 
        : localStorage.getItem('admin_auth');

      const res = await fetch('/api/admin/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authKey || '2025'}`
        },
        body: JSON.stringify({
          merchantId: merchant.id,
          timeframe,
          year: selectedYear,
          month: selectedMonth,
          lang,
          action,
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setReportData(json.data);
        if (action === 'send_email') {
          setEmailSuccess(true);
          setTimeout(() => setEmailSuccess(false), 5000);
        }
      } else {
        setError(json.error || 'Fehler beim Laden des Berichts');
      }
    } catch (e: any) {
      setError(e.message || 'Verbindungsfehler');
    } finally {
      setLoading(false);
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeframe, selectedYear, selectedMonth, lang]);

  // Quick Timeframe Selectors
  const setThisMonth = () => {
    setTimeframe('month');
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  const setLastMonth = () => {
    setTimeframe('month');
    if (currentMonth === 1) {
      setSelectedYear(currentYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedYear(currentYear);
      setSelectedMonth(currentMonth - 1);
    }
  };

  const setThisYear = () => {
    setTimeframe('year');
    setSelectedYear(currentYear);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!reportData) return;
    let phone = (merchant?.contact_phone || '').replace(/[^0-9+]/g, '');
    if (phone.startsWith('+')) {
      phone = phone.substring(1);
    } else if (phone.startsWith('00')) {
      phone = phone.substring(2);
    } else if (phone.startsWith('0')) {
      const defaultPrefix = lang === 'fr' ? '212' : '49';
      phone = defaultPrefix + phone.substring(1);
    }

    const greeting = merchant?.contact_name
      ? (lang === 'fr' ? `Bonjour ${merchant.contact_name}` : `Hallo ${merchant.contact_name}`)
      : (lang === 'fr' ? `Bonjour ${merchant.name}` : `Hallo ${merchant.name}`);

    const summary = reportData.summary;
    const growthText = summary.stampsGrowthPercent !== null
      ? (summary.stampsGrowthPercent >= 0 ? ` (+${summary.stampsGrowthPercent}% 📈)` : ` (${summary.stampsGrowthPercent}% 📉)`)
      : '';

    const text = lang === 'fr'
      ? `${greeting},

Voici votre *Rapport de Performance Marketif Treue* pour la période :
📅 *${reportData.periodTitle}*

📊 *Vos Résultats Clés :*
⭐ *Tampons Distribués :* ${summary.stampsGiven}${growthText}
👥 *Nouveaux Clients Fidélisés :* +${summary.newCustomersInPeriod} (Total: ${summary.totalCustomersToDate})
🎁 *Cadeaux & Récompenses Récupérés :* ${summary.rewardsRedeemed}
🔄 *Visites Magasin Générées :* ~${summary.estimatedStoreVisits}

💡 *Impact :* Votre programme de fidélité renforce chaque jour la fidélité de vos clients dans votre magasin !

_Marketif Support · https://treue.marketif.de/dashboard/${merchant.slug}_`
      : `${greeting},

hier ist dein offizieller *Marketif Treue Leistungsbericht* für den Zeitraum:
📅 *${reportData.periodTitle}*

📊 *Deine Erfolgs-Zahlen :*
⭐ *Vergebene Stempel :* ${summary.stampsGiven}${growthText}
👥 *Neue Stammkunden :* +${summary.newCustomersInPeriod} (Gesamt: ${summary.totalCustomersToDate})
🎁 *Eingelöste Prämien :* ${summary.rewardsRedeemed}
🔄 *Generierte Ladenbesuche :* ~${summary.estimatedStoreVisits}

💡 *Fazit :* Dein digitales Treuesystem sorgt für stetig wiederkehrende Kunden in deinem Geschäft!

_Marketif Support · https://treue.marketif.de/dashboard/${merchant.slug}_`;

    if (!phone) {
      alert(lang === 'fr' ? 'Aucun numéro de téléphone enregistré pour ce commerçant.' : 'Keine Telefonnummer für diesen Händler hinterlegt.');
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const maxWeekdayCount = Math.max(...(reportData?.weekdayDistribution?.map((d: any) => d.count) || [1]), 1);
  const maxHourlyCount = Math.max(...(reportData?.hourlyDistribution?.map((d: any) => d.count) || [1]), 1);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      {/* Container with print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-container, #printable-report-container * {
            visibility: visible;
          }
          #printable-report-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px !important;
            background: white !important;
            color: #111827 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-[#121212] border border-white/10 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl my-auto text-white">
        
        {/* MODAL HEADER CONTROLS (NO PRINT) */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 no-print bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#8097ff]/10 text-[#8097ff] rounded-2xl border border-[#8097ff]/20">
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {lang === 'fr' ? 'Rapport de Performance' : 'Leistungsbericht (Rapport)'}
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-[#8097ff] font-semibold">
                  {merchant?.name}
                </span>
              </h2>
              <p className="text-xs text-white/50">
                {lang === 'fr' ? 'Statistiques mensuelles et annuelles pour le commerçant' : 'Monats- & Jahres-Statistiken für den Händler mit PDF-, WhatsApp- & Mail-Versand'}
              </p>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-black/60 border border-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLang('de')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${lang === 'de' ? 'bg-[#8097ff] text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                DE
              </button>
              <button
                type="button"
                onClick={() => setLang('fr')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${lang === 'fr' ? 'bg-[#8097ff] text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                FR
              </button>
            </div>

            {/* Print / PDF */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              title="Drucken / Als PDF speichern"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">{lang === 'fr' ? 'PDF / Imprimer' : 'Drucken / PDF'}</span>
            </button>

            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              title="Per WhatsApp senden"
            >
              <MessageCircle size={15} />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Email */}
            <button
              type="button"
              onClick={() => fetchReport('send_email')}
              disabled={loading || sendingEmail}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#8097ff]/20 hover:bg-[#8097ff]/30 text-[#8097ff] border border-[#8097ff]/30 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              title="Per E-Mail an Händler senden"
            >
              {sendingEmail ? <RefreshCw size={15} className="animate-spin" /> : emailSuccess ? <CheckCircle2 size={15} className="text-emerald-400" /> : <Mail size={15} />}
              <span className="hidden sm:inline">{emailSuccess ? (lang === 'fr' ? 'Envoyé !' : 'Gesendet !') : (lang === 'fr' ? 'Envoyer E-Mail' : 'Per E-Mail')}</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* TIMEFRAME SELECTOR TOOLBAR (NO PRINT) */}
        <div className="p-4 bg-[#151515] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={setThisMonth}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${timeframe === 'month' && selectedMonth === currentMonth && selectedYear === currentYear ? 'bg-[#8097ff]/20 text-[#8097ff] border-[#8097ff]/40 font-bold' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}
            >
              {lang === 'fr' ? 'Ce mois-ci' : 'Diesen Monat'}
            </button>
            <button
              type="button"
              onClick={setLastMonth}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${timeframe === 'month' && (selectedMonth === (currentMonth === 1 ? 12 : currentMonth - 1)) ? 'bg-[#8097ff]/20 text-[#8097ff] border-[#8097ff]/40 font-bold' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}
            >
              {lang === 'fr' ? 'Mois dernier' : 'Letzten Monat'}
            </button>
            <button
              type="button"
              onClick={setThisYear}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${timeframe === 'year' && selectedYear === currentYear ? 'bg-[#8097ff]/20 text-[#8097ff] border-[#8097ff]/40 font-bold' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}
            >
              {lang === 'fr' ? `Année ${currentYear}` : `Ganzes Jahr ${currentYear}`}
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${timeframe === 'all' ? 'bg-[#8097ff]/20 text-[#8097ff] border-[#8097ff]/40 font-bold' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}
            >
              {lang === 'fr' ? 'Total' : 'Gesamt'}
            </button>
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-2">
            {timeframe === 'month' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#8097ff]"
              >
                {(lang === 'fr' ? monthNamesFr : monthNamesDe).map((m, idx) => (
                  <option key={idx} value={idx + 1} className="bg-[#1a1a1a] text-white">{m}</option>
                ))}
              </select>
            )}

            {timeframe !== 'all' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#8097ff]"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <option key={y} value={y} className="bg-[#1a1a1a] text-white">{y}</option>
                ))}
              </select>
            )}

            {loading && (
              <RefreshCw size={16} className="animate-spin text-[#8097ff] ml-1" />
            )}
          </div>
        </div>

        {/* NOTIFICATION / ERROR BARS */}
        {emailSuccess && (
          <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center gap-2 no-print">
            <CheckCircle2 size={16} />
            {lang === 'fr' 
              ? `Rapport envoyé avec succès à ${merchant?.contact_email || 'le commerçant'} !` 
              : `Leistungsbericht erfolgreich an ${merchant?.contact_email || 'die E-Mail des Händlers'} gesendet!`}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs text-center no-print">
            {error}
          </div>
        )}

        {/* ── PRINTABLE & VIEWABLE REPORT CONTENT ───────────────────────────── */}
        <div id="printable-report-container" className="p-6 sm:p-10 bg-gradient-to-b from-[#161616] to-[#0f0f0f] text-white print:bg-white print:text-black">
          
          {loading && !reportData ? (
            <div className="py-24 text-center">
              <RefreshCw size={36} className="animate-spin text-[#8097ff] mx-auto mb-4" />
              <p className="text-white/60 text-sm">
                {lang === 'fr' ? 'Génération du rapport en cours...' : 'Erstelle Leistungsbericht...'}
              </p>
            </div>
          ) : reportData ? (
            <div className="space-y-8">
              
              {/* HEADER SECTION */}
              <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-white/10 print:border-gray-200">
                <div className="flex items-center gap-4">
                  {merchant?.logo_url ? (
                    <img 
                      src={merchant.logo_url} 
                      alt={merchant.name} 
                      className="w-16 h-16 rounded-2xl object-cover border border-white/10 print:border-gray-300 shadow-md" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#8097ff]/20 text-[#8097ff] flex items-center justify-center font-bold text-2xl border border-[#8097ff]/30">
                      {merchant?.name?.charAt(0) || 'M'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#8097ff]/20 text-[#8097ff] border border-[#8097ff]/30 print:bg-gray-100 print:text-black print:border-gray-300">
                        {lang === 'fr' ? 'Rapport de Fidélité' : 'Offizieller Leistungsbericht'}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white print:text-black mt-1">
                      {merchant?.name}
                    </h1>
                    <p className="text-xs text-white/50 print:text-gray-500 mt-0.5">
                      {merchant?.address || (lang === 'fr' ? 'Partenaire Marketif Treue' : 'Marketif Treue Partner')}
                      {merchant?.contact_name && ` · ${merchant.contact_name}`}
                    </p>
                  </div>
                </div>

                {/* Report Metadata */}
                <div className="text-right sm:min-w-[200px]">
                  <div className="text-xs font-bold text-white/40 print:text-gray-400 uppercase tracking-wider">
                    {lang === 'fr' ? "Période d'analyse" : 'Berichtszeitraum'}
                  </div>
                  <div className="text-xl font-extrabold text-[#8097ff] print:text-blue-600 mt-0.5">
                    {reportData.periodTitle}
                  </div>
                  <div className="text-[11px] text-white/40 print:text-gray-400 mt-1">
                    {lang === 'fr' ? 'Émis le :' : 'Erstellt am:'} {new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'de-DE')}
                  </div>
                </div>
              </div>

              {/* TOP 4 EXECUTIVE KPI CARDS */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 print:text-gray-500 mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-[#8097ff]" />
                  {lang === 'fr' ? 'Indicateurs Clés de Performance (KPIs)' : 'Kern-Leistungsdaten (Executive Summary)'}
                </h3>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  
                  {/* KPI 1: Vergebene Stempel */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 print:bg-gray-50 print:border-gray-200">
                    <div className="flex items-center justify-between text-white/50 print:text-gray-500 mb-2">
                      <span className="text-xs font-medium">{lang === 'fr' ? 'Tampons Distribués' : 'Vergebene Stempel'}</span>
                      <Award size={16} className="text-[#8097ff]" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white print:text-black">
                      {reportData.summary.stampsGiven}
                    </div>
                    <div className="mt-2 text-[11px] flex items-center gap-1">
                      {reportData.summary.stampsGrowthPercent !== null ? (
                        reportData.summary.stampsGrowthPercent >= 0 ? (
                          <span className="text-emerald-400 font-bold flex items-center">
                            <TrendingUp size={12} className="mr-0.5" /> +{reportData.summary.stampsGrowthPercent}%
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold flex items-center">
                            {reportData.summary.stampsGrowthPercent}%
                          </span>
                        )
                      ) : (
                        <span className="text-white/40 print:text-gray-400 font-medium">
                          {lang === 'fr' ? 'Période active' : 'Aktive Periode'}
                        </span>
                      )}
                      <span className="text-white/40 print:text-gray-400 ml-1">
                        {lang === 'fr' ? 'vs précédent' : 'vs. Vormonat'}
                      </span>
                    </div>
                  </div>

                  {/* KPI 2: Neue Kunden */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 print:bg-gray-50 print:border-gray-200">
                    <div className="flex items-center justify-between text-white/50 print:text-gray-500 mb-2">
                      <span className="text-xs font-medium">{lang === 'fr' ? 'Nouveaux Clients' : 'Neue Stammkunden'}</span>
                      <Users size={16} className="text-emerald-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 print:text-emerald-600">
                      +{reportData.summary.newCustomersInPeriod}
                    </div>
                    <div className="mt-2 text-[11px] text-white/50 print:text-gray-500">
                      {lang === 'fr' ? 'Total :' : 'Gesamt:'} <span className="font-bold text-white print:text-black">{reportData.summary.totalCustomersToDate}</span> {lang === 'fr' ? 'porteurs' : 'Karten'}
                    </div>
                  </div>

                  {/* KPI 3: Prämien eingelöst */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 print:bg-gray-50 print:border-gray-200">
                    <div className="flex items-center justify-between text-white/50 print:text-gray-500 mb-2">
                      <span className="text-xs font-medium">{lang === 'fr' ? 'Cadeaux Récupérés' : 'Prämien Eingelöst'}</span>
                      <Gift size={16} className="text-amber-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-400 print:text-amber-600">
                      {reportData.summary.rewardsRedeemed}
                    </div>
                    <div className="mt-2 text-[11px] text-white/50 print:text-gray-500">
                      {lang === 'fr' ? 'Objectif :' : 'Ziel:'} {merchant?.stamp_goal || 10} {lang === 'fr' ? 'tampons' : 'Stempel'}
                    </div>
                  </div>

                  {/* KPI 4: Kundenkontakte / ROI */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 print:bg-gray-50 print:border-gray-200">
                    <div className="flex items-center justify-between text-white/50 print:text-gray-500 mb-2">
                      <span className="text-xs font-medium">{lang === 'fr' ? 'Visites Générées' : 'Ladenbesuche (ROI)'}</span>
                      <Store size={16} className="text-purple-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-purple-400 print:text-purple-600">
                      ~{reportData.summary.estimatedStoreVisits}
                    </div>
                    <div className="mt-2 text-[11px] text-white/50 print:text-gray-500">
                      {lang === 'fr' ? 'Visites physiques réelles' : 'Nachweisbare Kundenbesuche'}
                    </div>
                  </div>

                </div>
              </div>

              {/* DETAILED VISUAL BREAKDOWN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Wochentage Verteilung */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 print:bg-gray-50 print:border-gray-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 print:text-gray-600 mb-4 flex items-center gap-2">
                    <Calendar size={14} className="text-[#8097ff]" />
                    {lang === 'fr' ? 'Activité par Jour de la Semaine' : 'Aktivität nach Wochentag'}
                  </h4>

                  <div className="space-y-2.5">
                    {reportData.weekdayDistribution.map((item: any, idx: number) => {
                      const pct = maxWeekdayCount > 0 ? (item.count / maxWeekdayCount) * 100 : 0;
                      return (
                        <div key={idx} className="flex items-center gap-3 text-xs">
                          <span className="w-8 font-bold text-white/70 print:text-gray-700">{item.day}</span>
                          <div className="flex-1 h-3 bg-white/5 print:bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#8097ff] to-blue-500 print:bg-blue-600 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max(pct, item.count > 0 ? 8 : 0)}%` }}
                            />
                          </div>
                          <span className="w-8 text-right font-extrabold text-white print:text-black">
                            {item.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tageszeiten (Peak Hours) */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 print:bg-gray-50 print:border-gray-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 print:text-gray-600 mb-4 flex items-center gap-2">
                    <Clock size={14} className="text-amber-400" />
                    {lang === 'fr' ? 'Moments Forts (Peak Hours)' : 'Beliebteste Tageszeiten (Peak Hours)'}
                  </h4>

                  <div className="space-y-3">
                    {reportData.hourlyDistribution.map((item: any, idx: number) => {
                      const pct = maxHourlyCount > 0 ? (item.count / maxHourlyCount) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/70 print:text-gray-700 font-medium">{item.label}</span>
                            <span className="font-extrabold text-white print:text-black">{item.count} {lang === 'fr' ? 'tampons' : 'Stempel'}</span>
                          </div>
                          <div className="h-2.5 bg-white/5 print:bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 print:bg-amber-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(pct, item.count > 0 ? 8 : 0)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* STAFF LEADERBOARD */}
              {reportData.staffPerformance && reportData.staffPerformance.length > 0 && (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 print:bg-gray-50 print:border-gray-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 print:text-gray-600 mb-4 flex items-center gap-2">
                    <Users size={14} className="text-emerald-400" />
                    {lang === 'fr' ? "Performance de l'Équipe" : 'Team- & Mitarbeiter-Leistung'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {reportData.staffPerformance.map((staff: any, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white/[0.03] print:bg-white border border-white/5 print:border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white print:text-black">{staff.name}</div>
                            <div className="text-[10px] text-white/40 print:text-gray-500">
                              {staff.redeems} {lang === 'fr' ? 'cadeaux validés' : 'Prämien ausgegeben'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-[#8097ff] print:text-blue-600">
                            {staff.stamps}
                          </div>
                          <div className="text-[10px] text-white/40 print:text-gray-400">
                            {lang === 'fr' ? 'tampons' : 'Stempel'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* INSIGHTS & MARKETING RECOMMENDATION */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#8097ff]/10 via-purple-500/10 to-transparent border border-[#8097ff]/20 print:bg-blue-50 print:border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#8097ff]/20 text-[#8097ff] shrink-0 mt-0.5">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white print:text-black">
                      {lang === 'fr' ? 'Bilan & Conseils Marketif' : 'Marketif Treue Erfolgs-Fazit & Tipp'}
                    </h4>
                    <p className="text-xs text-white/70 print:text-gray-700 mt-1 leading-relaxed">
                      {lang === 'fr' ? (
                        <>
                          Votre programme a permis de fidéliser <strong>{reportData.summary.totalCustomersToDate} clients</strong>. 
                          Avec <strong>{reportData.summary.stampsGiven} tampons</strong> et <strong>{reportData.summary.rewardsRedeemed} récompenses</strong> ce mois-ci, 
                          vos clients reviennent plus régulièrement. <em>Astuce : Envoyez une notification push sur les jours à plus faible affluence pour booster votre chiffre d'affaires !</em>
                        </>
                      ) : (
                        <>
                          Dein Treuesystem umfasst bereits <strong>{reportData.summary.totalCustomersToDate} registrierte Stammkunden</strong>. 
                          Mit <strong>{reportData.summary.stampsGiven} vergebenen Stempeln</strong> und <strong>{reportData.summary.rewardsRedeemed} eingelösten Prämien</strong> hast du 
                          deine Kundenbindung spürbar gestärkt. <em>Tipp: Nutze Push-Nachrichten an schwächeren Wochentagen, um zusätzliche Spontanbesuche zu generieren!</em>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* FOOTER & SEAL */}
              <div className="pt-6 border-t border-white/10 print:border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs text-white/40 print:text-gray-500">
                <div>
                  <div className="font-bold text-white/70 print:text-gray-800">Marketif Treue System</div>
                  <div>{lang === 'fr' ? 'Plateforme digitale de fidélisation client' : 'Digitale Kundenkarten & Kundenbindung'} · marketif.de</div>
                </div>
                <div className="text-right">
                  <div>{lang === 'fr' ? 'Rapport généré automatiquement' : 'Automatisch generierter Leistungsbericht'}</div>
                  <div>ID: {merchant?.slug?.toUpperCase()}-{reportData.timeframe.toUpperCase()}-{selectedYear}</div>
                </div>
              </div>

            </div>
          ) : null}

        </div>

      </div>
    </div>
  );
}
