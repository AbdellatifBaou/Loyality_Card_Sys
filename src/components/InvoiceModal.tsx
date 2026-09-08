'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, Plus, Trash2, Globe, Building2, Check, FileText } from 'lucide-react';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceModalProps {
  merchant: any;
  onClose: () => void;
  adminLang?: string;
}

export default function InvoiceModal({ merchant, onClose }: InvoiceModalProps) {
  const initialLang = merchant?.language === 'fr' ? 'fr' : 'de';
  const [invoiceLang, setInvoiceLang] = useState<'de' | 'fr'>(initialLang);

  // Generate default invoice number: RE-YYYYMM-XXXX or FAC-YYYYMM-XXXX
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dueDateObj = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const dueDateStr = dueDateObj.toISOString().split('T')[0];

  const monthNamesDe = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const monthNamesFr = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const currentMonthName = invoiceLang === 'fr' ? monthNamesFr[today.getMonth()] : monthNamesDe[today.getMonth()];
  const currentYear = today.getFullYear();

  const [invoiceNumber, setInvoiceNumber] = useState(
    `${invoiceLang === 'fr' ? 'FAC' : 'RE'}-${currentYear}${String(today.getMonth() + 1).padStart(2, '0')}-${merchant?.slug?.toUpperCase()?.slice(0, 4) || '001'}`
  );
  const [invoiceDate, setInvoiceDate] = useState(dateStr);
  const [dueDate, setDueDate] = useState(dueDateStr);
  const [period, setPeriod] = useState(`${currentMonthName} ${currentYear}`);
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash' | 'card'>('transfer');
  const [currency, setCurrency] = useState<'EUR' | 'MAD'>('EUR');

  // Customer info
  const [customerName, setCustomerName] = useState(merchant?.name || '');
  const [customerAddress, setCustomerAddress] = useState(merchant?.address || '');
  const [customerTaxId, setCustomerTaxId] = useState('');

  // Tax Rate
  const [taxRate, setTaxRate] = useState<number>(0);
  const [customTaxNote, setCustomTaxNote] = useState('');

  // Default Items based on package
  const getPackagePrice = () => {
    if (merchant?.package_type === 'gold') return 89;
    if (merchant?.package_type === 'custom') return merchant?.custom_price || 199;
    return 49; // silber
  };

  const getPackageTitle = (lang: 'de' | 'fr') => {
    const pkgName = merchant?.package_type ? merchant.package_type.toUpperCase() : 'SILBER';
    if (lang === 'fr') {
      return `Marketif Loyalty - Abonnement Mensuel (Forfait ${pkgName})`;
    }
    return `Marketif Loyalty - Monatliche Softwarelizenz (Paket ${pkgName})`;
  };

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: getPackageTitle(initialLang),
      quantity: 1,
      unitPrice: getPackagePrice(),
    },
  ]);

  // When language changes, update default labels
  useEffect(() => {
    setInvoiceNumber((prev) => {
      if (prev.startsWith('FAC-') && invoiceLang === 'de') return prev.replace('FAC-', 'RE-');
      if (prev.startsWith('RE-') && invoiceLang === 'fr') return prev.replace('RE-', 'FAC-');
      return prev;
    });

    setPeriod(`${invoiceLang === 'fr' ? monthNamesFr[today.getMonth()] : monthNamesDe[today.getMonth()]} ${currentYear}`);

    // Update item description if it's the default one
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx === 0) {
          return { ...it, description: getPackageTitle(invoiceLang) };
        }
        return it;
      })
    );
  }, [invoiceLang]);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  // Add line item
  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        description: invoiceLang === 'fr' ? 'Prestation de service / Frais de configuration' : 'Zusätzliche Dienstleistung / Einrichtungsgebühr',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Company Details
  const company = invoiceLang === 'fr'
    ? {
        name: 'STE MARKETIF SARL AU',
        sub: '',
        address: 'MAGASIN N°03 N°61 LOT YASSMINA OUISLANE, MEKNÈS',
        legal: 'IF: 73120576 · ICE: 003986173000067 · RC: 68347/MEKNES',
        phone: '+212666979312',
        email: 'contact@marketif.net',
        web: 'marketif.net',
        title: 'FACTURE',
        rib: 'RIB / Compte Bancaire: Disponible sur demande',
      }
    : {
        name: 'Marketif',
        sub: 'Einzelunternehmen',
        address: 'Weinligstraße 24, 21073 Hamburg',
        legal: 'Inhaber: Abdellatif Baoud · Deutschland',
        phone: '+49 176 00000000',
        email: 'Kontakt@marketif.de',
        web: 'marketif.de',
        title: 'RECHNUNG',
        rib: 'Bankverbindung: Überweisung gemäß Vereinbarung',
      };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      {/* Container with print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice-container, #printable-invoice-container * {
            visibility: visible;
          }
          #printable-invoice-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-[#121212] border border-white/10 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl my-auto text-white">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 no-print bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl border border-[#D4AF37]/20">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {invoiceLang === 'fr' ? 'Générateur de Facture' : 'Rechnungs-Generator'}
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-[#D4AF37] font-semibold">
                  {merchant?.name}
                </span>
              </h2>
              <p className="text-xs text-white/50">
                {invoiceLang === 'fr' ? 'Créez et imprimez une facture pour paiement manuel' : 'Erstelle und drucke Rechnungen für Barzahler / Überweisungen'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-black/60 border border-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setInvoiceLang('fr')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  invoiceLang === 'fr' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <span>🇲🇦</span> Français
              </button>
              <button
                type="button"
                onClick={() => setInvoiceLang('de')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  invoiceLang === 'de' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <span>🇩🇪</span> Deutsch
              </button>
            </div>

            {/* Print / PDF Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#b5952f] text-black font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-[#D4AF37]/20"
            >
              <Printer size={16} />
              {invoiceLang === 'fr' ? 'Imprimer / PDF' : 'Drucken / PDF'}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2.5 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body: Two Columns (Form Controls & Live Printable Invoice Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
          {/* Controls Column (Hidden in Print) */}
          <div className="lg:col-span-4 space-y-5 no-print bg-white/[0.02] p-4 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-2">
              <Building2 size={16} />
              {invoiceLang === 'fr' ? 'Paramètres Facture' : 'Rechnungsdaten'}
            </h3>

            {/* Invoice Meta */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-white/50 mb-1">{invoiceLang === 'fr' ? 'Numéro de facture' : 'Rechnungsnummer'}</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-white/50 mb-1">{invoiceLang === 'fr' ? 'Date de facture' : 'Rechnungsdatum'}</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">{invoiceLang === 'fr' ? "Date d'échéance" : 'Fälligkeitsdatum'}</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/50 mb-1">{invoiceLang === 'fr' ? 'Période de facturation' : 'Leistungszeitraum'}</label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="z.B. März 2026"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-white/50 mb-1">{invoiceLang === 'fr' ? 'Mode de paiement' : 'Zahlungsart'}</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                  >
                    <option className="bg-[#111111] text-white" value="transfer">{invoiceLang === 'fr' ? 'Virement bancaire' : 'Überweisung'}</option>
                    <option className="bg-[#111111] text-white" value="cash">{invoiceLang === 'fr' ? 'Espèces' : 'Barzahlung'}</option>
                    <option className="bg-[#111111] text-white" value="card">{invoiceLang === 'fr' ? 'Carte Bancaire' : 'Kartenzahlung'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 mb-1">{invoiceLang === 'fr' ? 'Devise' : 'Währung'}</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="w-full bg-[#111111] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                  >
                    <option className="bg-[#111111] text-white" value="EUR">EUR (€)</option>
                    <option className="bg-[#111111] text-white" value="MAD">MAD (Dirham)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="pt-2 border-t border-white/10 space-y-3 text-xs">
              <label className="block font-bold text-white/80">{invoiceLang === 'fr' ? 'Données du Client' : 'Empfänger-Daten'}</label>
              <div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={invoiceLang === 'fr' ? 'Nom du client / commerce' : 'Kundenname / Firma'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <textarea
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder={invoiceLang === 'fr' ? 'Adresse complète du client' : 'Kundenadresse'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={customerTaxId}
                  onChange={(e) => setCustomerTaxId(e.target.value)}
                  placeholder={invoiceLang === 'fr' ? 'ICE / Identifiant fiscal (optionnel)' : 'USt-IdNr. / Steuernummer (optional)'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* Items Editor */}
            <div className="pt-2 border-t border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-white/80">{invoiceLang === 'fr' ? 'Postes de la facture' : 'Rechnungspositionen'}</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 text-[#D4AF37] hover:underline font-bold"
                >
                  <Plus size={14} /> {invoiceLang === 'fr' ? 'Ajouter' : 'Position hinzufügen'}
                </button>
              </div>

              {items.map((item, index) => (
                <div key={item.id} className="p-2.5 bg-black/40 border border-white/5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-white/40 font-mono">#{index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-400/60 hover:text-red-400 p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Beschreibung"
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-white/40">{invoiceLang === 'fr' ? 'Quantité' : 'Menge'}</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-white outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40">{invoiceLang === 'fr' ? 'Prix unitaire' : 'Einzelpreis'}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-white outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tax Settings */}
            <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
              <label className="block font-bold text-white/80">{invoiceLang === 'fr' ? 'TVA / Taxes' : 'Mehrwertsteuer (MwSt.)'}</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 19, 20].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setTaxRate(rate)}
                    className={`py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      taxRate === rate
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                        : 'bg-black/30 border-white/10 text-white/50 hover:text-white'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
              <div>
                <input
                  type="text"
                  value={customTaxNote}
                  onChange={(e) => setCustomTaxNote(e.target.value)}
                  placeholder={
                    invoiceLang === 'fr'
                      ? 'Note / Exonération (optionnel)'
                      : 'Steuerhinweis (z.B. § 19 UStG)'
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          </div>

          {/* Printable Invoice Preview Column */}
          <div className="lg:col-span-8">
            <div
              id="printable-invoice-container"
              className="bg-white text-black p-8 sm:p-12 rounded-2xl shadow-xl min-h-[750px] flex flex-col justify-between"
              style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            >
              {/* Top Header */}
              <div>
                <div className="flex justify-between items-start border-b border-gray-200 pb-8 gap-6">
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-1">
                      {company.name}
                    </h1>
                    {company.sub && <p className="text-xs text-gray-500 font-medium mb-1">{company.sub}</p>}
                    <p className="text-xs text-gray-600 max-w-sm leading-relaxed">{company.address}</p>
                    {company.legal && <p className="text-[11px] font-mono text-gray-500 mt-1.5">{company.legal}</p>}
                    <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                      <p>Email: <span className="font-medium text-gray-800">{company.email}</span></p>
                      {company.phone && <p>Tél: <span className="font-medium text-gray-800">{company.phone}</span></p>}
                      <p>Web: <span className="font-medium text-gray-800">{company.web}</span></p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-block bg-black text-white px-4 py-1.5 rounded-lg text-sm font-bold tracking-widest uppercase mb-3">
                      {company.title}
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>
                        <span className="font-bold text-gray-900">{invoiceLang === 'fr' ? 'N° Facture:' : 'Rechnungs-Nr:'}</span> {invoiceNumber}
                      </p>
                      <p>
                        <span className="font-bold text-gray-900">{invoiceLang === 'fr' ? 'Date:' : 'Datum:'}</span> {new Date(invoiceDate).toLocaleDateString(invoiceLang === 'fr' ? 'fr-FR' : 'de-DE')}
                      </p>
                      <p>
                        <span className="font-bold text-gray-900">{invoiceLang === 'fr' ? 'Échéance:' : 'Fälligkeit:'}</span> {new Date(dueDate).toLocaleDateString(invoiceLang === 'fr' ? 'fr-FR' : 'de-DE')}
                      </p>
                      {period && (
                        <p>
                          <span className="font-bold text-gray-900">{invoiceLang === 'fr' ? 'Période:' : 'Leistungszeitraum:'}</span> {period}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bill To & Payment Info */}
                <div className="grid grid-cols-2 gap-8 my-8">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 block mb-2">
                      {invoiceLang === 'fr' ? 'FACTURÉ À (CLIENT)' : 'EMPFÄNGER'}
                    </span>
                    <h3 className="font-bold text-gray-900 text-base">{customerName || 'Nom du Client'}</h3>
                    <p className="text-xs text-gray-600 whitespace-pre-line mt-1">{customerAddress || (invoiceLang === 'fr' ? 'Adresse non renseignée' : 'Adresse nicht angegeben')}</p>
                    {customerTaxId && (
                      <p className="text-[11px] font-mono text-gray-500 mt-2">
                        {invoiceLang === 'fr' ? 'ICE/ID:' : 'USt-IdNr:'} {customerTaxId}
                      </p>
                    )}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 block mb-2">
                        {invoiceLang === 'fr' ? 'MODE DE PAIEMENT' : 'ZAHLUNGSMODALITÄT'}
                      </span>
                      <p className="text-xs font-bold text-gray-900">
                        {paymentMethod === 'transfer'
                          ? invoiceLang === 'fr' ? 'Virement Bancaire' : 'Banküberweisung'
                          : paymentMethod === 'cash'
                          ? invoiceLang === 'fr' ? 'Espèces / En mains propres' : 'Barzahlung'
                          : invoiceLang === 'fr' ? 'Carte Bancaire / En ligne' : 'Kartenzahlung'}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">{company.rib}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-600">
                      <span>Status:</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                        {invoiceLang === 'fr' ? 'Paiement Manuel' : 'Manuelle Zahlung'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto my-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-900 text-gray-900 text-xs uppercase font-bold tracking-wider">
                        <th className="py-3 px-2">{invoiceLang === 'fr' ? 'Désignation / Service' : 'Beschreibung / Position'}</th>
                        <th className="py-3 px-2 text-center w-16">{invoiceLang === 'fr' ? 'Qté' : 'Menge'}</th>
                        <th className="py-3 px-2 text-right w-28">{invoiceLang === 'fr' ? 'Prix Unit.' : 'Einzelpreis'}</th>
                        <th className="py-3 px-2 text-right w-28">{invoiceLang === 'fr' ? 'Total' : 'Gesamt'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {items.map((item, idx) => (
                        <tr key={item.id} className="text-gray-800">
                          <td className="py-3 px-2 font-medium">
                            <p className="font-semibold text-gray-900">{item.description}</p>
                          </td>
                          <td className="py-3 px-2 text-center">{item.quantity}</td>
                          <td className="py-3 px-2 text-right">
                            {Number(item.unitPrice).toFixed(2)} {currency === 'EUR' ? '€' : 'MAD'}
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-gray-900">
                            {(item.quantity * item.unitPrice).toFixed(2)} {currency === 'EUR' ? '€' : 'MAD'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end my-6">
                  <div className="w-64 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>{invoiceLang === 'fr' ? 'Total HT / Net:' : 'Zwischensumme Netto:'}</span>
                      <span className="font-semibold">{subtotal.toFixed(2)} {currency === 'EUR' ? '€' : 'MAD'}</span>
                    </div>

                    {taxRate > 0 ? (
                      <div className="flex justify-between text-gray-600">
                        <span>{invoiceLang === 'fr' ? `TVA (${taxRate}%):` : `MwSt. (${taxRate}%):`}</span>
                        <span className="font-semibold">{taxAmount.toFixed(2)} {currency === 'EUR' ? '€' : 'MAD'}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-400 italic">
                        {customTaxNote ||
                          (invoiceLang === 'fr'
                            ? 'Exonéré de TVA / TVA non applicable'
                            : 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.')}
                      </div>
                    )}

                    <div className="border-t-2 border-gray-900 pt-2 flex justify-between text-sm font-extrabold text-gray-900">
                      <span>{invoiceLang === 'fr' ? 'TOTAL À PAYER:' : 'GESAMTBETRAG:'}</span>
                      <span className="text-base text-black">{total.toFixed(2)} {currency === 'EUR' ? '€' : 'MAD'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Footer */}
              <div className="border-t border-gray-200 pt-6 mt-12 text-[10px] text-gray-500 text-center space-y-1">
                <p className="font-semibold text-gray-700">
                  {invoiceLang === 'fr'
                    ? 'Merci de votre confiance ! Pour toute question, veuillez nous contacter par email.'
                    : 'Vielen Dank für dein Vertrauen und die gute Zusammenarbeit!'}
                </p>
                <p>{company.name} · {company.address} · {company.email} · {company.web}</p>
                {company.legal && <p className="font-mono text-gray-400">{company.legal}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
