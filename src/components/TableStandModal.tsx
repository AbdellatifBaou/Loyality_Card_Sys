'use client';

import React, { useState } from 'react';
import { 
  X, Printer, Download, Sparkles, Smartphone, Award, 
  Store, CheckCircle2, ChevronRight, MessageCircle, Layers, Palette, Hash
} from 'lucide-react';

interface TableStandModalProps {
  merchant: any;
  onClose: () => void;
  lang?: 'de' | 'fr';
}

export default function TableStandModal({ merchant, onClose, lang: defaultLang = 'de' }: TableStandModalProps) {
  const [lang, setLang] = useState<'de' | 'fr'>(merchant?.language === 'fr' ? 'fr' : (defaultLang === 'fr' ? 'fr' : 'de'));
  
  // Customization state
  const [format, setFormat] = useState<'a6' | 'a5' | 'tent'>('tent'); // tent = A4 folded into 2-sided table tent
  const [theme, setTheme] = useState<'white' | 'dark' | 'brand'>('white');
  const [showTableNumber, setShowTableNumber] = useState<boolean>(false);
  const [tableNumber, setTableNumber] = useState<string>('1');
  const [customHeadline, setCustomHeadline] = useState<string>('');
  const [customSubheadline, setCustomSubheadline] = useState<string>('');

  const primaryColor = merchant?.primary_color || '#D4AF37';
  const slug = merchant?.slug || '';
  const joinUrl = `https://treue.marketif.de/join/${slug}`;
  const qrUrl = `/api/qr-code?text=${encodeURIComponent(joinUrl)}`;

  const welcomeBonus = merchant?.push_settings?.welcome_bonus || 0;
  const stampGoal = merchant?.stamp_goal || 9;
  const rewardDesc = merchant?.reward_description || (lang === 'fr' ? 'Une belle surprise offerte !' : 'Eine tolle Überraschung!');

  const defaultHeadlineDe = 'Jetzt Treuekarte sichern!';
  const defaultHeadlineFr = 'Rejoignez notre Club Fidélité !';

  const defaultSubheadlineDe = 'Sammle bei jedem Besuch Stempel und erhalte exklusive Prämien.';
  const defaultSubheadlineFr = 'Cumulez des tampons à chaque visite et profitez de récompenses exclusives.';

  const headline = customHeadline || (lang === 'fr' ? defaultHeadlineFr : defaultHeadlineDe);
  const subheadline = customSubheadline || (lang === 'fr' ? defaultSubheadlineFr : defaultSubheadlineDe);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = lang === 'fr'
      ? `Bonjour ! Voici le lien de la carte de fidélité digitale pour *${merchant?.name}* : ${joinUrl}`
      : `Hallo! Hier ist der Link zur digitalen Treuekarte für *${merchant?.name}* : ${joinUrl}`;
    
    let phone = (merchant?.contact_phone || merchant?.push_settings?.contact_phone || '').replace(/[^0-9+]/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Card Content Component to render on one or both sides (for tent fold)
  const TableStandCard = ({ isBackSide = false }: { isBackSide?: boolean }) => {
    const isDark = theme === 'dark';
    const isBrand = theme === 'brand';

    const bgClass = isBrand
      ? 'bg-gradient-to-br from-[#1a1a1a] via-[#111111] to-[#0a0a0a] text-white border-white/20'
      : isDark
      ? 'bg-[#111111] text-white border-white/10'
      : 'bg-white text-gray-900 border-gray-200 shadow-sm';

    const innerCardBg = isBrand
      ? 'bg-white/5 border-white/10'
      : isDark
      ? 'bg-white/5 border-white/10'
      : 'bg-gray-50 border-gray-200';

    return (
      <div 
        className={`w-full h-full flex flex-col justify-between p-6 sm:p-8 rounded-3xl border ${bgClass} relative overflow-hidden transition-all`}
        style={isBrand ? { borderColor: `${primaryColor}66` } : {}}
      >
        {/* Subtle accent corner glow */}
        <div 
          className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-2xl opacity-20 pointer-events-none"
          style={{ backgroundColor: primaryColor }}
        />

        {/* Top Header: Merchant Logo / Name & Optional Table Number */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              {merchant?.logo_url ? (
                <img 
                  src={merchant.logo_url} 
                  alt={merchant.name} 
                  className="w-12 h-12 object-contain rounded-xl bg-white/10 p-1 border border-black/10"
                />
              ) : (
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg text-black shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Store size={22} />
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-lg sm:text-xl tracking-tight leading-tight">
                  {merchant?.name}
                </h3>
                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-60">
                  {lang === 'fr' ? 'Programme de Fidélité' : 'Offizielle Treuekarte'}
                </p>
              </div>
            </div>

            {showTableNumber && tableNumber && (
              <div 
                className="px-3 py-1 rounded-xl border text-xs font-black tracking-wider flex items-center gap-1 shadow-sm"
                style={{ 
                  backgroundColor: isDark || isBrand ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderColor: primaryColor,
                  color: isDark || isBrand ? primaryColor : '#111827'
                }}
              >
                <Hash size={12} style={{ color: primaryColor }} />
                <span>{lang === 'fr' ? `Table ${tableNumber}` : `Tisch ${tableNumber}`}</span>
              </div>
            )}
          </div>

          {/* Headline & Subtitle */}
          <div className="text-center my-3">
            <h2 
              className="text-xl sm:text-2xl font-black leading-tight tracking-tight mb-1.5"
              style={{ color: isDark || isBrand ? '#ffffff' : '#111827' }}
            >
              {headline}
            </h2>
            <p className="text-xs sm:text-sm font-medium opacity-75 max-w-sm mx-auto leading-relaxed">
              {subheadline}
            </p>
          </div>
        </div>

        {/* Center: High-Res QR Code */}
        <div className="flex flex-col items-center justify-center my-3">
          <div className="p-3.5 bg-white rounded-3xl shadow-xl border border-black/5 relative group">
            <img 
              src={qrUrl} 
              alt="Treuekarte QR Code" 
              className="w-40 h-40 sm:w-48 sm:h-48 object-contain rounded-xl"
            />
            {/* Center Logo/Icon on QR code */}
            <div 
              className="absolute inset-0 m-auto w-10 h-10 rounded-xl bg-white shadow-md border border-black/10 flex items-center justify-center pointer-events-none"
            >
              <Sparkles size={18} style={{ color: primaryColor }} />
            </div>
          </div>
          <p className="text-[11px] font-bold mt-2.5 tracking-wide flex items-center gap-1.5 opacity-80">
            <Smartphone size={13} style={{ color: primaryColor }} />
            <span>{lang === 'fr' ? 'Scannez simplement avec votre appareil photo' : 'Einfach mit der Smartphone-Kamera scannen'}</span>
          </p>
        </div>

        {/* Highlights: Reward Goal & Welcome Bonus */}
        <div className="space-y-2 mb-2">
          {welcomeBonus > 0 && (
            <div 
              className="px-3.5 py-2 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold shadow-sm"
              style={{ 
                backgroundColor: `${primaryColor}22`, 
                color: isDark || isBrand ? primaryColor : '#000000',
                border: `1px solid ${primaryColor}44`
              }}
            >
              <Sparkles size={14} />
              <span>
                {lang === 'fr' 
                  ? `Cadeau de bienvenue : +${welcomeBonus} tampon(s) offert(s) dès l'inscription !` 
                  : `Willkommens-Geschenk: +${welcomeBonus} Stempel direkt beim Start geschenkt!`}
              </span>
            </div>
          )}

          <div className={`p-3 rounded-2xl border ${innerCardBg} flex items-center justify-between gap-3 text-xs`}>
            <div className="flex items-center gap-2.5">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-black shrink-0 shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <Award size={16} />
              </div>
              <div>
                <p className="font-extrabold leading-tight">
                  {lang === 'fr' ? `${stampGoal} Tampons = Récompense` : `${stampGoal} Stempel = Prämie`}
                </p>
                <p className="text-[11px] opacity-70 truncate max-w-[200px] sm:max-w-[240px]">
                  {rewardDesc}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
                {lang === 'fr' ? '100% Gratuit' : '100% Gratis'}
              </span>
            </div>
          </div>
        </div>

        {/* 3-Step Guide & Wallet Compatibility Badge */}
        <div className="pt-2 border-t border-black/5 dark:border-white/10">
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold opacity-80 mb-2.5">
            <div className="flex flex-col items-center">
              <span className="font-black text-xs" style={{ color: primaryColor }}>1.</span>
              <span>{lang === 'fr' ? 'Scannez le QR' : 'QR scannen'}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-black text-xs" style={{ color: primaryColor }}>2.</span>
              <span>{lang === 'fr' ? 'Enregistrer' : 'Wallet sichern'}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-black text-xs" style={{ color: primaryColor }}>3.</span>
              <span>{lang === 'fr' ? 'Profiter' : 'Belohnung holen'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] opacity-50 font-medium">
            <span>Apple Wallet & Google Wallet</span>
            <span>treue.marketif.de</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="table-stand-overlay" className="fixed inset-0 z-[100] flex items-start justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible">
      {/* Container with print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${format === 'tent' ? 'A4 landscape' : format === 'a5' ? 'A5 portrait' : 'A6 portrait'};
            margin: 6mm;
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
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #table-stand-overlay {
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
            display: flex !important;
            flex-direction: column !important;
          }
          #table-stand-dialog {
            position: static !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            max-width: 100% !important;
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
            visibility: visible !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            flex: 1 1 100% !important;
          }
          #printable-table-stand {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            visibility: visible !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            flex: 1 1 100% !important;
          }
          #printable-table-stand * {
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

      <div id="table-stand-dialog" className="bg-[#121212] border border-white/10 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl my-auto text-white print:bg-white print:border-none print:shadow-none print:rounded-none">
        
        {/* HEADER CONTROLS (NO PRINT) */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 no-print bg-[#181818]">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-2xl border shadow-md font-bold text-black"
              style={{ backgroundColor: `${primaryColor}22`, borderColor: `${primaryColor}44`, color: primaryColor }}
            >
              <Store size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {lang === 'fr' ? 'Chevalet de Table & Présentoir QR' : 'Tischaufsteller & Theken-Display'}
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white font-semibold">
                  {merchant?.name}
                </span>
              </h2>
              <p className="text-xs text-white/50">
                {lang === 'fr' 
                  ? 'Générez et imprimez des présentoirs QR professionnels pour vos tables et comptoir' 
                  : 'Druckfertige Vorlagen für Tische & Theke – Kunden scannen und treten sofort dem Treueprogramm bei'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
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

            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#8097ff] hover:bg-[#6c85ff] text-black rounded-xl text-xs font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
              title="Drucken / Als PDF speichern"
            >
              <Printer size={16} />
              <span>{lang === 'fr' ? 'Imprimer / PDF' : 'Drucken / Als PDF'}</span>
            </button>

            {/* WhatsApp Share */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
              title="Per WhatsApp senden"
            >
              <MessageCircle size={15} />
              <span className="hidden sm:inline">WhatsApp</span>
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

        {/* CUSTOMIZATION CONTROLS TOOLBAR (NO PRINT) */}
        <div className="p-4 bg-[#141414] border-b border-white/5 flex flex-wrap items-center justify-between gap-4 no-print text-xs">
          {/* Format selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-white/50 font-medium flex items-center gap-1">
              <Layers size={14} /> {lang === 'fr' ? 'Format :' : 'Format :'}
            </span>
            <button
              type="button"
              onClick={() => setFormat('tent')}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${format === 'tent' ? 'bg-white/20 text-white border-white/40' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
              title="Zweiseitiger Klappaufsteller (A4 Falten) – Ideal zum Hinstellen ohne Halter"
            >
              {lang === 'fr' ? 'Chevalet 2 Faces (Pliable A4)' : 'Klapp-Aufsteller (A4 Zelt)'}
            </button>
            <button
              type="button"
              onClick={() => setFormat('a6')}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${format === 'a6' ? 'bg-white/20 text-white border-white/40' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
              title="A6 Hochformat – Passend für klassische Acryl-Tischständer"
            >
              A6 (Acryl-Halter)
            </button>
            <button
              type="button"
              onClick={() => setFormat('a5')}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${format === 'a5' ? 'bg-white/20 text-white border-white/40' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
              title="A5 Großformat – Perfekt für Theke und Kasse"
            >
              A5 (Theken-Display)
            </button>
          </div>

          {/* Theme selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-white/50 font-medium flex items-center gap-1">
              <Palette size={14} /> {lang === 'fr' ? 'Style :' : 'Design :'}
            </span>
            <button
              type="button"
              onClick={() => setTheme('white')}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${theme === 'white' ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
            >
              {lang === 'fr' ? 'Blanc Pro (Éco)' : 'Clean Weiß (Druck)'}
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${theme === 'dark' ? 'bg-white/20 text-white border-white/40' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
            >
              {lang === 'fr' ? 'Noir Luxe' : 'Dark Luxury'}
            </button>
            <button
              type="button"
              onClick={() => setTheme('brand')}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${theme === 'brand' ? 'bg-white/20 text-white border-white/40' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
              style={theme === 'brand' ? { color: primaryColor, borderColor: primaryColor } : {}}
            >
              {lang === 'fr' ? 'Couleur Magasin' : 'Branding'}
            </button>
          </div>

          {/* Table Number Toggle */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer select-none text-white/80">
              <input 
                type="checkbox" 
                checked={showTableNumber} 
                onChange={(e) => setShowTableNumber(e.target.checked)}
                className="rounded border-white/30 text-[#8097ff] focus:ring-0"
              />
              <span>{lang === 'fr' ? 'Numéro de Table :' : 'Tischnummer :'}</span>
            </label>
            {showTableNumber && (
              <input 
                type="text" 
                value={tableNumber} 
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="1"
                className="w-14 bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-center text-white font-bold outline-none focus:border-[#8097ff]"
              />
            )}
          </div>
        </div>

        {/* ── PRINTABLE / PREVIEW CONTAINER ────────────────────────────────────────────── */}
        <div 
          id="printable-table-stand" 
          className="p-4 sm:p-8 bg-[#0a0a0a] flex items-center justify-center min-h-[560px] print:p-0 print:bg-white print:min-h-0"
        >
          {format === 'tent' ? (
            /* DUAL-FACED FOLDABLE TABLE TENT (A4 LANDSCAPE: LEFT & RIGHT SIDES) */
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:w-full print:max-w-none print:h-[98vh]">
              {/* Side 1 (Front Face) */}
              <div className="flex flex-col h-full">
                <TableStandCard />
                <p className="text-[10px] text-center text-white/30 print:text-gray-400 mt-2 font-mono">
                  {lang === 'fr' ? '▲ Face Avant · Plier au milieu' : '▲ Vorderseite · In der Mitte falten'}
                </p>
              </div>

              {/* Side 2 (Back Face) */}
              <div className="flex flex-col h-full">
                <TableStandCard isBackSide={true} />
                <p className="text-[10px] text-center text-white/30 print:text-gray-400 mt-2 font-mono">
                  {lang === 'fr' ? '▲ Face Arrière · Plier au milieu' : '▲ Rückseite · In der Mitte falten'}
                </p>
              </div>
            </div>
          ) : (
            /* SINGLE STAND (A6 or A5 PORTRAIT) */
            <div className={`w-full ${format === 'a6' ? 'max-w-sm' : 'max-w-md'} print:w-full print:max-w-none print:h-[98vh]`}>
              <TableStandCard />
            </div>
          )}
        </div>

        {/* BOTTOM HELPER FOOTER (NO PRINT) */}
        <div className="p-4 bg-[#141414] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 no-print text-xs text-white/60">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>
              {lang === 'fr' 
                ? 'Conseil d’impression : Choisissez "Ajuster à la page" ou échelle 100% dans la boîte de dialogue d’impression.' 
                : 'Druck-Tipp: Wähle im Druckdialog "An Seite anpassen" oder 100% Skalierung für perfekte Passform.'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="font-bold text-[#8097ff] hover:underline flex items-center gap-1"
            >
              <Printer size={14} />
              <span>{lang === 'fr' ? 'Lancer l’impression maintenant' : 'Jetzt drucken'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
