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
    <div id="report-modal-overlay" className="fixed inset-0 z-[100] flex items-start justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible">
      {/* Container with print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          *, *::before, *::after {
            box-shadow: none !important;
            text-shadow: none !important;
          }
          html, body {
            background: #ffffff !important;
            color: #111827 !important;
            height: 100% !important;
            max-height: 100vh !important;
            min-height: 0 !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #report-modal-overlay {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
            z-index: 9999999 !important;
            visibility: visible !important;
            display: block !important;
          }
          #report-modal-dialog {
            position: static !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
            visibility: visible !important;
            overflow: hidden !important;
          }
          #printable-report-container {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            visibility: visible !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            break-before: avoid !important;
            break-after: avoid !important;
          }
          #printable-report-container * {
            visibility: visible !important;
          }
          .no-print {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div id="report-modal-dialog" className="bg-[#121212] border border-white/10 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl my-auto text-white print:bg-white print:border-none print:shadow-none print:rounded-none">
        
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

        {/* ── PRINTABLE & VIEWABLE REPORT CONTENT (BEAUTIFULLY BALANCED FULL A4) ──────────── */}
        <div id="printable-report-container" className="p-6 sm:p-10 bg-gradient-to-b from-[#161616] to-[#0f0f0f] text-white print:bg-white print:text-black print:p-0">
          
          {loading && !reportData ? (
            <div className="py-28 text-center">
              <RefreshCw size={40} className="animate-spin text-[#8097ff] mx-auto mb-4" />
              <p className="text-white/60 text-sm">
                {lang === 'fr' ? 'Génération du rapport en cours...' : 'Erstelle Leistungsbericht...'}
              </p>
            </div>
          ) : reportData ? (
            <div className="space-y-6 print:space-y-4">
              
              {/* HEADER SECTION */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10 print:border-gray-200">
                <div className="flex items-center gap-3.5">
                  {merchant?.logo_url ? (
                    <img 
                      src={merchant.logo_url} 
                      alt={merchant.name} 
                      className="w-14 h-14 sm:w-16 sm:h-16 print:w-14 print:h-14 rounded-2xl object-cover border border-white/10 print:border-gray-300 shadow-sm shrink-0" 
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 print:w-14 print:h-14 rounded-2xl bg-[#8097ff]/20 text-[#8097ff] flex items-center justify-center font-black text-2xl border border-[#8097ff]/30 shrink-0">
                      {merchant?.name?.charAt(0) || 'M'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] print:text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#8097ff]/20 text-[#8097ff] border border-[#8097ff]/30 print:bg-blue-50 print:text-blue-700 print:border-blue-200">
                        {lang === 'fr' ? 'Rapport Officiel de Fidélité' : 'Offizieller Leistungsbericht'}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl print:text-2xl font-black tracking-tight text-white print:text-black mt-1">
                      {merchant?.name}
                    </h1>
                    <p className="text-xs print:text-[11px] text-white/50 print:text-gray-500 mt-0.5">
                      {merchant?.address || (lang === 'fr' ? 'Partenaire Marketif Treue' : 'Marketif Treue Partner')}
                      {merchant?.contact_name && ` · ${merchant.contact_name}`}
                    </p>
                  </div>
                </div>

                {/* Report Metadata */}
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold text-white/40 print:text-gray-400 uppercase tracking-wider">
                    {lang === 'fr' ? "Période d'analyse" : 'Berichtszeitraum'}
                  </div>
                  <div className="text-xl sm:text-2xl print:text-xl font-black text-[#8097ff] print:text-blue-600 mt-0.5">
                    {reportData.periodTitle}
                  </div>
                  <div className="text-[10px] text-white/40 print:text-gray-400 mt-0.5">
                    {lang === 'fr' ? 'Émis le :' : 'Erstellt am:'} {new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'de-DE')}
                  </div>
                </div>
              </div>

              {/* TOP 4 EXECUTIVE KPI CARDS */}
              <div>
                <h3 className="text-xs print:text-[11px] font-bold uppercase tracking-wider text-white/40 print:text-gray-500 mb-2.5 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#8097ff]" />
                  {lang === 'fr' ? 'Indicateurs Clés de Performance (KPIs)' : 'Kern-Leistungsdaten (Executive Summary)'}
                </h3>

                <div className="grid grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-3 print:gap-2.5">
                  
                  {/* KPI 1: Vergebene Stempel */}
                  <div className="p-3.5 print:p-3 rounded-2xl bg-white/[0.03] border border-white/10 print:bg-gray-50 print:border-gray-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-white/60 print:text-gray-500 mb-1">
                        <span className="text-xs print:text-[11px] font-semibold">{lang === 'fr' ? 'Tampons Distribués' : 'Vergebene Stempel'}</span>
                        <Award size={16} className="text-[#8097ff]" />
                      </div>
                      <div className="text-2xl sm:text-3xl print:text-2xl font-black text-white print:text-black tracking-tight">
                        {reportData.summary.stampsGiven}
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] print:text-[10px] flex items-center gap-1">
                      {reportData.summary.stampsGrowthPercent !== null ? (
                        reportData.summary.stampsGrowthPercent >= 0 ? (
                          <span className="text-emerald-400 print:text-emerald-600 font-bold flex items-center">
                            <TrendingUp size={12} className="mr-0.5" /> +{reportData.summary.stampsGrowthPercent}%
                          </span>
                        ) : (
                          <span className="text-rose-400 print:text-rose-600 font-bold flex items-center">
                            {reportData.summary.stampsGrowthPercent}%
                          </span>
                        )
                      ) : (
                        <span className="text-white/40 print:text-gray-400 font-medium">
                          {lang === 'fr' ? 'Période active' : 'Aktive Periode'}
                        </span>
                      )}
                      <span className="text-white/40 print:text-gray-400">
                        {lang === 'fr' ? 'vs précédent' : 'vs. Vormonat'}
                      </span>
                    </div>
                  </div>

                  {/* KPI 2: Neue Kunden */}
                  <div className="p-3.5 print:p-3 rounded-2xl bg-white/[0.03] border border-white/10 print:bg-gray-50 print:border-gray-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-white/60 print:text-gray-500 mb-1">
                        <span className="text-xs print:text-[11px] font-semibold">{lang === 'fr' ? 'Nouveaux Clients' : 'Neue Stammkunden'}</span>
                        <Users size={16} className="text-emerald-400" />
                      </div>
                      <div className="text-2xl sm:text-3xl print:text-2xl font-black text-emerald-400 print:text-emerald-600 tracking-tight">
                        +{reportData.summary.newCustomersInPeriod}
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] print:text-[10px] text-white/60 print:text-gray-600">
                      {lang === 'fr' ? 'Total :' : 'Gesamt:'} <span className="font-bold text-white print:text-black">{reportData.summary.totalCustomersToDate}</span> {lang === 'fr' ? 'porteurs' : 'Karten'}
                    </div>
                  </div>

                  {/* KPI 3: Prämien eingelöst */}
                  <div className="p-3.5 print:p-3 rounded-2xl bg-white/[0.03] border border-white/10 print:bg-gray-50 print:border-gray-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-white/60 print:text-gray-500 mb-1">
                        <span className="text-xs print:text-[11px] font-semibold">{lang === 'fr' ? 'Cadeaux Récupérés' : 'Prämien Eingelöst'}</span>
                        <Gift size={16} className="text-amber-400" />
                      </div>
                      <div className="text-2xl sm:text-3xl print:text-2xl font-black text-amber-400 print:text-amber-600 tracking-tight">
                        {reportData.summary.rewardsRedeemed}
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] print:text-[10px] text-white/60 print:text-gray-600">
                      {lang === 'fr' ? 'Objectif :' : 'Ziel:'} {merchant?.stamp_goal || 10} {lang === 'fr' ? 'tampons' : 'Stempel'}
                    </div>
                  </div>

                  {/* KPI 4: Kundenkontakte / ROI */}
                  <div className="p-3.5 print:p-3 rounded-2xl bg-white/[0.03] border border-white/10 print:bg-gray-50 print:border-gray-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-white/60 print:text-gray-500 mb-1">
                        <span className="text-xs print:text-[11px] font-semibold">{lang === 'fr' ? 'Visites Générées' : 'Ladenbesuche (ROI)'}</span>
                        <Store size={16} className="text-purple-400" />
                      </div>
                      <div className="text-2xl sm:text-3xl print:text-2xl font-black text-purple-400 print:text-purple-600 tracking-tight">
                        ~{reportData.summary.estimatedStoreVisits}
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] print:text-[10px] text-white/60 print:text-gray-600">
                      {lang === 'fr' ? 'Visites réelles' : 'Nachweisbare Besuche'}
                    </div>
                  </div>

                </div>
              </div>

              {/* DETAILED VISUAL BREAKDOWN */}
              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 print:gap-3">
                
                {/* Wochentage Verteilung */}
                <div className="p-4 print:p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 print:bg-gray-50 print:border-gray-200">
                  <h4 className="text-xs print:text-[11px] font-bold uppercase tracking-wider text-white/60 print:text-gray-700 mb-2 flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#8097ff]" />
                    {lang === 'fr' ? 'Activité par Jour de la Semaine' : 'Aktivität nach Wochentag'}
                  </h4>

                  <div className="space-y-1">
                    {reportData.weekdayDistribution.map((item: any, idx: number) => {
                      const pct = maxWeekdayCount > 0 ? (item.count / maxWeekdayCount) * 100 : 0;
                      return (
                        <div key={idx} className="flex items-center gap-2.5 text-xs print:text-[10px]">
                          <span className="w-6 font-bold text-white/70 print:text-gray-700">{item.day}</span>
                          <div className="flex-1 h-2 bg-white/5 print:bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#8097ff] to-blue-500 print:bg-blue-600 rounded-full" 
                              style={{ width: `${Math.max(pct, item.count > 0 ? 8 : 0)}%` }}
                            />
                          </div>
                          <span className="w-6 text-right font-extrabold text-white print:text-black">
                            {item.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tageszeiten (Peak Hours) */}
                <div className="p-4 print:p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 print:bg-gray-50 print:border-gray-200 flex flex-col justify-between">
                  <h4 className="text-xs print:text-[11px] font-bold uppercase tracking-wider text-white/60 print:text-gray-700 mb-2 flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-400" />
                    {lang === 'fr' ? 'Moments Forts (Peak Hours)' : 'Beliebteste Tageszeiten (Peak Hours)'}
                  </h4>

                  <div className="space-y-1.5 flex-1 flex flex-col justify-around">
                    {reportData.hourlyDistribution.map((item: any, idx: number) => {
                      const pct = maxHourlyCount > 0 ? (item.count / maxHourlyCount) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs print:text-[10px]">
                            <span className="text-white/70 print:text-gray-700 font-medium">{item.label}</span>
                            <span className="font-extrabold text-white print:text-black">{item.count} {lang === 'fr' ? 'tampons' : 'Stempel'}</span>
                          </div>
                          <div className="h-2 bg-white/5 print:bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 print:bg-amber-500 rounded-full"
                              style={{ width: `${Math.max(pct, item.count > 0 ? 8 : 0)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* STAFF LEADERBOARD OR PROGRAM HEALTH HIGHLIGHTS */}
              {reportData.staffPerformance && reportData.staffPerformance.length > 0 ? (
                <div className="p-4 print:p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 print:bg-gray-50 print:border-gray-200">
                  <h4 className="text-xs print:text-[11px] font-bold uppercase tracking-wider text-white/60 print:text-gray-700 mb-2 flex items-center gap-1.5">
                    <Users size={13} className="text-emerald-400" />
                    {lang === 'fr' ? "Performance de l'Équipe" : 'Team- & Mitarbeiter-Leistung'}
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-3 gap-2.5 print:gap-2">
                    {reportData.staffPerformance.slice(0, 6).map((staff: any, idx: number) => (
                      <div key={idx} className="p-2.5 print:p-2 rounded-xl bg-white/[0.03] print:bg-white border border-white/5 print:border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-[11px] print:text-[10px] font-bold text-white print:text-black truncate max-w-[80px]">{staff.name}</div>
                            <div className="text-[9px] text-white/40 print:text-gray-500">
                              {staff.redeems} {lang === 'fr' ? 'cadeaux' : 'Prämien'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm print:text-xs font-black text-[#8097ff] print:text-blue-600">
                            {staff.stamps}
                          </div>
                          <div className="text-[8px] text-white/40 print:text-gray-400">
                            {lang === 'fr' ? 'tampons' : 'Stempel'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* FALLBACK: PROGRAM HIGHLIGHTS (When staff data is empty, fills page with actionable metrics) */
                <div className="p-4 print:p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 print:bg-gray-50 print:border-gray-200">
                  <h4 className="text-xs print:text-[11px] font-bold uppercase tracking-wider text-white/60 print:text-gray-700 mb-2 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-emerald-400" />
                    {lang === 'fr' ? 'Configuration & Fonctionnalités Actives' : 'Treueprogramm-Status & Bindungspotenzial'}
                  </h4>

                  <div className="grid grid-cols-3 gap-2.5 print:gap-2 text-left">
                    <div className="p-2.5 print:p-2 rounded-xl bg-white/[0.03] print:bg-white border border-white/5 print:border-gray-200">
                      <div className="flex items-center gap-1.5 text-[11px] print:text-[10px] font-bold text-white print:text-black">
                        <Smartphone size={13} className="text-[#8097ff]" />
                        <span>{lang === 'fr' ? 'Wallet Digital' : 'Digital Wallet'}</span>
                      </div>
                      <p className="text-[9px] text-white/50 print:text-gray-500 mt-1">
                        {lang === 'fr' ? 'Pass Apple & Google Wallet actifs 24/7' : 'Apple & Google Wallet Karten aktiv'}
                      </p>
                    </div>

                    <div className="p-2.5 print:p-2 rounded-xl bg-white/[0.03] print:bg-white border border-white/5 print:border-gray-200">
                      <div className="flex items-center gap-1.5 text-[11px] print:text-[10px] font-bold text-white print:text-black">
                        <Gift size={13} className="text-amber-400" />
                        <span>{merchant?.stamp_goal || 10} {lang === 'fr' ? 'Tampons' : 'Stempel-Ziel'}</span>
                      </div>
                      <p className="text-[9px] text-white/50 print:text-gray-500 mt-1">
                        {lang === 'fr' ? 'Prämie bei Erreichen freigeschaltet' : 'Prämie bei Erreichen der Karte'}
                      </p>
                    </div>

                    <div className="p-2.5 print:p-2 rounded-xl bg-white/[0.03] print:bg-white border border-white/5 print:border-gray-200">
                      <div className="flex items-center gap-1.5 text-[11px] print:text-[10px] font-bold text-white print:text-black">
                        <Users size={13} className="text-emerald-400" />
                        <span>{lang === 'fr' ? 'Scanner Caisse' : 'Mitarbeiter-Scan'}</span>
                      </div>
                      <p className="text-[9px] text-white/50 print:text-gray-500 mt-1">
                        {lang === 'fr' ? 'Scan en 1 seconde sans installation' : 'Schneller Scan per Kamera / PIN'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* INSIGHTS & MARKETING RECOMMENDATION */}
              <div className="p-4 print:p-3.5 rounded-2xl bg-gradient-to-r from-[#8097ff]/10 via-purple-500/10 to-transparent border border-[#8097ff]/20 print:bg-blue-50/70 print:border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-xl bg-[#8097ff]/20 text-[#8097ff] shrink-0 mt-0.5">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs print:text-[11px] font-bold text-white print:text-black">
                      {lang === 'fr' ? 'Bilan & Conseils Marketif' : 'Marketif Treue Erfolgs-Fazit & Praxistipp'}
                    </h4>
                    <p className="text-xs print:text-[10px] text-white/70 print:text-gray-700 mt-1 leading-relaxed">
                      {lang === 'fr' ? (
                        <>
                          Votre programme compte <strong>{reportData.summary.totalCustomersToDate} clients enregistrés</strong>. 
                          Avec <strong>{reportData.summary.stampsGiven} tampons</strong> et <strong>{reportData.summary.rewardsRedeemed} récompenses</strong> ce mois-ci, 
                          la fidélité de vos clients est en progression constante. <em>Astuce : Envoyez une notification push ciblée sur les créneaux plus calmes pour booster immédiatement votre fréquentation !</em>
                        </>
                      ) : (
                        <>
                          Dein Treuesystem zählt bereits <strong>{reportData.summary.totalCustomersToDate} registrierte Stammkunden</strong>. 
                          Mit <strong>{reportData.summary.stampsGiven} vergebenen Stempeln</strong> und <strong>{reportData.summary.rewardsRedeemed} eingelösten Prämien</strong> hast du 
                          deine Kundenbindung spürbar gestärkt. <em>Tipp: Nutze Push-Nachrichten an schwächeren Wochentagen, um zusätzliche Spontanbesuche und Wiederkäufe zu generieren!</em>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* FOOTER & SEAL */}
              <div className="pt-3 border-t border-white/10 print:border-gray-200 flex items-center justify-between gap-4 text-[10px] print:text-[9px] text-white/40 print:text-gray-500">
                <div>
                  <div className="font-bold text-white/70 print:text-gray-800">Marketif Treue System</div>
                  <div>{lang === 'fr' ? 'Plateforme digitale de fidélisation client' : 'Digitale Kundenkarten & Kundenbindung'} · marketif.de</div>
                </div>
                <div className="text-right">
                  <div>{lang === 'fr' ? 'Rapport officiel certifié' : 'Offizieller Leistungsbericht'}</div>
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
