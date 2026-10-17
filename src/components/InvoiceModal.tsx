'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, Plus, Trash2, Globe, Building2, Check, FileText, MessageCircle, Mail, Download } from 'lucide-react';

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
  initialInvoice?: any;
  onInvoiceSaved?: () => void;
}

export default function InvoiceModal({ merchant, onClose, adminLang, initialInvoice, onInvoiceSaved }: InvoiceModalProps) {
  const initialLang = initialInvoice?.invoiceLang || (merchant?.language === 'fr' ? 'fr' : (merchant?.language === 'de' ? 'de' : (adminLang === 'fr' ? 'fr' : 'de')));
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
    initialInvoice?.invoiceNumber || `${invoiceLang === 'fr' ? 'FAC' : 'RE'}-${currentYear}${String(today.getMonth() + 1).padStart(2, '0')}-${merchant?.slug?.toUpperCase()?.slice(0, 4) || '001'}`
  );
  const [invoiceDate, setInvoiceDate] = useState(initialInvoice?.invoiceDate || dateStr);
  const [dueDate, setDueDate] = useState(initialInvoice?.dueDate || dueDateStr);
  const [period, setPeriod] = useState(initialInvoice?.period || `${currentMonthName} ${currentYear}`);
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash' | 'card'>(initialInvoice?.paymentMethod || 'transfer');
  const [currency, setCurrency] = useState<'EUR' | 'MAD'>(initialInvoice?.currency || 'EUR');

  // Customer info
  const [customerName, setCustomerName] = useState(initialInvoice?.customerName || merchant?.name || '');
  const [customerContactName, setCustomerContactName] = useState(initialInvoice?.customerContactName || merchant?.contact_name || '');
  const [customerPhone, setCustomerPhone] = useState(initialInvoice?.customerPhone || merchant?.contact_phone || '');
  const [customerEmail, setCustomerEmail] = useState(initialInvoice?.customerEmail || merchant?.contact_email || '');
  const [customerAddress, setCustomerAddress] = useState(initialInvoice?.customerAddress || merchant?.address || '');
  const [customerTaxId, setCustomerTaxId] = useState(initialInvoice?.customerTaxId || '');

  // Tax Rate
  const [taxRate, setTaxRate] = useState<number>(initialInvoice?.taxRate ?? 0);
  const [customTaxNote, setCustomTaxNote] = useState(initialInvoice?.customTaxNote || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Default Items based on package
  const getPackagePrice = () => {
    if (merchant?.package_type === 'gold') return 89;
    if (merchant?.package_type === 'custom') {
      return merchant?.custom_price !== null && merchant?.custom_price !== undefined && !isNaN(Number(merchant.custom_price))
        ? Number(merchant.custom_price)
        : 199;
    }
    return 49; // silber
  };

  const getPackageTitle = (lang: 'de' | 'fr') => {
    const pkgType = merchant?.package_type?.toLowerCase();
    if (!pkgType || pkgType === 'custom') {
      return lang === 'fr' 
        ? 'Marketif Loyalty - Abonnement Mensuel' 
        : 'Marketif Loyalty - Monatliche Softwarelizenz';
    }
    const pkgName = merchant.package_type.toUpperCase();
    if (lang === 'fr') {
      return `Marketif Loyalty - Abonnement Mensuel (Forfait ${pkgName})`;
    }
    return `Marketif Loyalty - Monatliche Softwarelizenz (Paket ${pkgName})`;
  };

  const [items, setItems] = useState<InvoiceItem[]>(
    initialInvoice?.items && initialInvoice.items.length > 0
      ? initialInvoice.items
      : [
          {
            id: '1',
            description: getPackageTitle(initialLang),
            quantity: 1,
            unitPrice: getPackagePrice(),
          },
        ]
  );

  // When language changes, update default labels
  useEffect(() => {
    if (!initialInvoice) {
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
    }
  }, [invoiceLang, initialInvoice]);

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
        legal: 'Inhaber: Abdellatif Baouddi · Deutschland',
        email: 'Kontakt@marketif.de',
        web: 'marketif.de',
        title: 'RECHNUNG',
        rib: 'Bankverbindung: Überweisung gemäß Vereinbarung',
      };

  const handleSaveInvoice = async (silent = false) => {
    if (!merchant?.id) {
      if (!silent) alert(invoiceLang === 'fr' ? 'Erreur : Aucun commerçant sélectionné' : 'Fehler: Kein Händler ausgewählt');
      return;
    }
    setIsSaving(true);
    try {
      const invoicePayload = {
        id: initialInvoice?.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        invoiceNumber,
        invoiceDate,
        dueDate,
        period,
        paymentMethod,
        currency,
        items,
        subtotal,
        taxRate,
        taxAmount,
        total,
        customerName,
        customerContactName,
        customerPhone,
        customerEmail,
        customerAddress,
        customerTaxId,
        customTaxNote,
        invoiceLang,
        createdAt: initialInvoice?.createdAt || new Date().toISOString(),
      };

      const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_auth') || '2025') : '2025';
      const res = await fetch('/api/admin/manual-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          merchantId: merchant.id,
          invoice: invoicePayload,
          password: '2025',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        if (onInvoiceSaved) onInvoiceSaved();
      } else {
        if (!silent) {
          alert(data.error || (invoiceLang === 'fr' ? 'Erreur lors de l\'enregistrement' : 'Fehler beim Speichern der Rechnung'));
        }
      }
    } catch (err: any) {
      console.error('Failed to auto-archive invoice:', err);
      if (!silent) {
        alert(err?.message || (invoiceLang === 'fr' ? 'Erreur de connexion' : 'Verbindungsfehler beim Speichern'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!customerEmail || !customerEmail.includes('@')) {
      alert(invoiceLang === 'fr' 
        ? 'Veuillez saisir une adresse e-mail valide pour le destinataire dans le formulaire à gauche.' 
        : 'Bitte gib eine gültige E-Mail-Adresse für den Empfänger im Formular auf der linken Seite ein.');
      return;
    }
    if (!merchant?.id) {
      alert(invoiceLang === 'fr' ? 'Erreur: Commerçant introuvable' : 'Fehler: Kein Händler ausgewählt');
      return;
    }

    setIsSendingEmail(true);
    try {
      const invoicePayload = {
        id: initialInvoice?.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        invoiceNumber,
        invoiceDate,
        dueDate,
        period,
        paymentMethod,
        currency,
        items,
        subtotal,
        taxRate,
        taxAmount,
        total,
        customerName,
        customerContactName,
        customerPhone,
        customerEmail,
        customerAddress,
        customerTaxId,
        customTaxNote,
        invoiceLang,
        createdAt: initialInvoice?.createdAt || new Date().toISOString(),
      };

      const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_auth') || '2025') : '2025';
      const res = await fetch('/api/admin/send-invoice-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          merchantId: merchant.id,
          invoice: invoicePayload,
          recipientEmail: customerEmail,
          password: '2025',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailSentSuccess(true);
        setTimeout(() => setEmailSentSuccess(false), 4000);
        if (onInvoiceSaved) onInvoiceSaved();
      } else {
        alert(data.error || (invoiceLang === 'fr' ? 'Erreur lors de l\'envoi de l\'e-mail' : 'Fehler beim Senden der E-Mail'));
      }
    } catch (err: any) {
      console.error('Failed to send invoice email:', err);
      alert(err?.message || (invoiceLang === 'fr' ? 'Erreur lors de l\'envoi' : 'Fehler beim Senden'));
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePrint = () => {
    handleSaveInvoice(true);
    window.print();
  };

  const handleDownloadPdf = async () => {
    handleSaveInvoice(true);
    setIsDownloadingPdf(true);
    try {
      const invoicePayload = {
        invoiceNumber,
        invoiceDate,
        dueDate,
        period,
        paymentMethod,
        currency,
        items,
        subtotal,
        taxRate,
        taxAmount,
        total,
        customerName,
        customerContactName,
        customerPhone,
        customerEmail,
        customerAddress,
        customerTaxId,
        customTaxNote,
        invoiceLang,
      };

      const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_auth') || '2025') : '2025';
      const res = await fetch('/api/admin/invoice-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoice: invoicePayload,
          password: '2025',
        }),
      });

      if (!res.ok) throw new Error('PDF Generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeInvNum = (invoiceNumber || 'Rechnung').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${invoiceLang === 'fr' ? 'Facture' : 'Rechnung'}_${safeInvNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      console.error('Download PDF error:', e);
      alert(invoiceLang === 'fr' ? 'Erreur lors du téléchargement du PDF' : 'Fehler beim Herunterladen des PDFs');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendWhatsApp = () => {
    let phone = (customerPhone || '').replace(/[^0-9+]/g, '');
    if (phone.startsWith('+')) {
      phone = phone.substring(1);
    } else if (phone.startsWith('00')) {
      phone = phone.substring(2);
    } else if (phone.startsWith('0')) {
      const defaultPrefix = invoiceLang === 'fr' ? '212' : '49';
      phone = defaultPrefix + phone.substring(1);
    }

    const greeting = customerContactName 
      ? (invoiceLang === 'fr' ? `Bonjour ${customerContactName}` : `Hallo ${customerContactName}`) 
      : (customerName ? (invoiceLang === 'fr' ? `Bonjour ${customerName}` : `Hallo ${customerName}`) : (invoiceLang === 'fr' ? 'Bonjour' : 'Hallo'));
    
    const paymentMethodLabel = paymentMethod === 'transfer' 
      ? (invoiceLang === 'fr' ? 'Virement Bancaire' : 'Banküberweisung') 
      : paymentMethod === 'cash' 
      ? (invoiceLang === 'fr' ? 'Espèces' : 'Barzahlung') 
      : (invoiceLang === 'fr' ? 'Carte Bancaire' : 'Kartenzahlung');

    const curr = currency === 'EUR' ? '€' : 'MAD';
    const formattedDate = new Date(invoiceDate).toLocaleDateString(invoiceLang === 'fr' ? 'fr-FR' : 'de-DE');
    const formattedDueDate = new Date(dueDate).toLocaleDateString(invoiceLang === 'fr' ? 'fr-FR' : 'de-DE');

    const text = invoiceLang === 'fr' 
      ? `${greeting},\n\nVoici le récapitulatif de votre facture pour ${period} de la part de Marketif :\n\n📄 *N° Facture :* ${invoiceNumber}\n💰 *Montant Total :* ${total.toFixed(2)} ${curr}\n📅 *Date :* ${formattedDate}\n💳 *Mode de paiement :* ${paymentMethodLabel}\n\nMerci pour votre confiance !\n_Marketif Support_`
      : `${greeting},\n\nhier ist die Abrechnung für ${period} von Marketif:\n\n📄 *Rechnungs-Nr.:* ${invoiceNumber}\n💰 *Gesamtbetrag:* ${total.toFixed(2)} ${curr}\n📅 *Rechnungsdatum:* ${formattedDate}\n💳 *Zahlungsart:* ${paymentMethodLabel}\n\nVielen Dank für die partnerschaftliche Zusammenarbeit!\n_Marketif Support_`;

    if (!phone) {
      alert(invoiceLang === 'fr' ? 'Veuillez saisir un numéro de téléphone' : 'Bitte gib eine Telefonnummer ein');
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div id="invoice-modal-overlay" className="fixed inset-0 z-[100] flex items-start justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible">
      {/* Container with print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 10mm;
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
          #invoice-modal-overlay {
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
          #invoice-modal-dialog {
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
          #printable-invoice-container {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: black !important;
            visibility: visible !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            break-before: avoid !important;
            break-after: avoid !important;
          }
          #printable-invoice-container * {
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

      <div id="invoice-modal-dialog" className="bg-[#121212] border border-white/10 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl my-auto text-white print:bg-white print:border-none print:shadow-none print:rounded-none">
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

            {/* WhatsApp Send Button */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-[#25D366]/20"
              title={invoiceLang === 'fr' ? 'Envoyer le récapitulatif par WhatsApp' : 'Rechnungsübersicht per WhatsApp senden'}
            >
              <MessageCircle size={16} />
              <span>WhatsApp</span>
            </button>

            {/* E-Mail Send Button */}
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-[#2563eb]/20 disabled:opacity-50"
              title={invoiceLang === 'fr' ? 'Envoyer la facture officielle par E-Mail' : 'Offizielle Rechnung per E-Mail senden'}
            >
              {emailSentSuccess ? (
                <>
                  <Check size={16} className="text-white" />
                  <span>{invoiceLang === 'fr' ? 'Envoyé !' : 'Gesendet!'}</span>
                </>
              ) : (
                <>
                  <Mail size={16} className={isSendingEmail ? 'animate-pulse' : ''} />
                  <span>{isSendingEmail ? (invoiceLang === 'fr' ? 'Envoi...' : 'Sendet...') : 'E-Mail'}</span>
                </>
              )}
            </button>

            {/* Save to Archive Button */}
            <button
              type="button"
              onClick={() => handleSaveInvoice(false)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl transition-all border border-white/10"
              title={invoiceLang === 'fr' ? 'Enregistrer dans les archives' : 'Im Archiv speichern'}
            >
              {saveSuccess ? (
                <>
                  <Check size={16} className="text-emerald-400" />
                  <span className="text-emerald-400">{invoiceLang === 'fr' ? 'Enregistré !' : 'Gespeichert!'}</span>
                </>
              ) : (
                <>
                  <FileText size={16} className="text-[#D4AF37]" />
                  <span>{isSaving ? (invoiceLang === 'fr' ? 'Enregistrement...' : 'Speichert...') : (invoiceLang === 'fr' ? 'Archiver' : 'Archivieren')}</span>
                </>
              )}
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-emerald-600/20 disabled:opacity-50"
              title={invoiceLang === 'fr' ? 'Télécharger la facture PDF officielle' : 'Offizielle PDF-Rechnung herunterladen'}
            >
              <Download size={16} className={isDownloadingPdf ? 'animate-bounce' : ''} />
              <span>{isDownloadingPdf ? (invoiceLang === 'fr' ? 'Génération...' : 'Generiere...') : 'PDF'}</span>
            </button>

            {/* Print / PDF Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#b5952f] text-black font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-[#D4AF37]/20"
            >
              <Printer size={16} />
              {invoiceLang === 'fr' ? 'Imprimer' : 'Drucken'}
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
                  placeholder={invoiceLang === 'fr' ? 'Nom du commerce / entreprise' : 'Kundenname / Firma'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={customerContactName}
                  onChange={(e) => setCustomerContactName(e.target.value)}
                  placeholder={invoiceLang === 'fr' ? 'Responsable / Gérant (Attn:)' : 'Ansprechpartner / Inhaber (z.Hd.)'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={invoiceLang === 'fr' ? 'Téléphone' : 'Telefon'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder={invoiceLang === 'fr' ? 'Email' : 'E-Mail'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
              <div>
                <textarea
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder={invoiceLang === 'fr' ? 'Adresse complète du commerce' : 'Anschrift des Ladens'}
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

              {/* WhatsApp Quick Action Box */}
              <div className="p-3 bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl flex items-center justify-between gap-2 mt-2">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-[#25D366] shrink-0" />
                    {invoiceLang === 'fr' ? 'Envoi WhatsApp' : 'WhatsApp Versand'}
                  </span>
                  <p className="text-[11px] text-white/50 truncate mt-0.5">
                    {customerPhone ? customerPhone : (invoiceLang === 'fr' ? 'Numéro manquant' : 'Keine Nummer angegeben')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-lg transition-all shadow-md flex items-center gap-1 shrink-0"
                >
                  {invoiceLang === 'fr' ? 'Envoyer' : 'Senden'}
                </button>
              </div>

              {/* E-Mail Quick Action Box */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between gap-2 mt-2">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Mail size={14} className="text-blue-400 shrink-0" />
                    {invoiceLang === 'fr' ? 'Envoi Facture par E-Mail' : 'Rechnung per E-Mail senden'}
                  </span>
                  <p className="text-[11px] text-white/50 truncate mt-0.5">
                    {customerEmail ? customerEmail : (invoiceLang === 'fr' ? 'E-mail manquant' : 'Keine E-Mail angegeben')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !customerEmail}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-all shadow-md flex items-center gap-1 shrink-0 disabled:opacity-40"
                >
                  {emailSentSuccess ? (invoiceLang === 'fr' ? 'Envoyé !' : 'Gesendet!') : (isSendingEmail ? (invoiceLang === 'fr' ? 'Envoi...' : 'Sendet...') : (invoiceLang === 'fr' ? 'Envoyer' : 'Senden'))}
                </button>
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
                      {company.phone && <p>{invoiceLang === 'fr' ? 'Tél:' : 'Tel:'} <span className="font-medium text-gray-800">{company.phone}</span></p>}
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
                      {dueDate && (
                        <p>
                          <span className="font-bold text-gray-900">{invoiceLang === 'fr' ? 'Échéance:' : 'Fällig bis:'}</span> {new Date(dueDate).toLocaleDateString(invoiceLang === 'fr' ? 'fr-FR' : 'de-DE')}
                        </p>
                      )}
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
                    {customerContactName && (
                      <p className="text-xs font-semibold text-gray-700 mt-0.5">
                        {invoiceLang === 'fr' ? 'Attn: ' : 'z.Hd.: '} {customerContactName}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 whitespace-pre-line mt-1.5">{customerAddress || (invoiceLang === 'fr' ? 'Adresse non renseignée' : 'Adresse nicht angegeben')}</p>
                    {(customerPhone || customerEmail) && (
                      <div className="mt-2 text-[11px] text-gray-500 space-y-0.5 border-t border-gray-200/60 pt-1.5">
                        {customerPhone && <p><span className="text-gray-400">{invoiceLang === 'fr' ? 'Tél:' : 'Tel:'}</span> <span className="text-gray-700 font-medium">{customerPhone}</span></p>}
                        {customerEmail && <p><span className="text-gray-400">Email:</span> <span className="text-gray-700 font-medium">{customerEmail}</span></p>}
                      </div>
                    )}
                    {customerTaxId && (
                      <p className="text-[11px] font-mono text-gray-500 mt-2 border-t border-gray-200/60 pt-1">
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

                      {paymentMethod === 'transfer' && (
                        <div className="mt-2.5 p-2.5 bg-white rounded-lg border border-gray-200 text-xs">
                          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                            {invoiceLang === 'fr' ? 'Référence à indiquer :' : 'Verwendungszweck :'}
                          </p>
                          <p className="font-mono font-bold text-gray-900 text-xs mt-0.5 select-all">
                            {invoiceNumber}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                            {invoiceLang === 'fr'
                              ? `Veuillez mentionner la référence "${invoiceNumber}" lors de votre virement.`
                              : `Bitte geben Sie bei Überweisung den Verwendungszweck "${invoiceNumber}" an.`}
                          </p>
                        </div>
                      )}
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
