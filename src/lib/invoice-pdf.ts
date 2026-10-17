import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

let cachedLogoBase64: string | null = null;

function getMarketifLogoBase64(): string | null {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const optPath = path.join(publicDir, 'marketif-logo-pdf.png');
    if (fs.existsSync(optPath)) {
      cachedLogoBase64 = fs.readFileSync(optPath).toString('base64');
      return cachedLogoBase64;
    }
    const symbolPath = path.join(publicDir, 'Marketif_LOGO_Symbol.png');
    if (fs.existsSync(symbolPath)) {
      cachedLogoBase64 = fs.readFileSync(symbolPath).toString('base64');
      return cachedLogoBase64;
    }
  } catch (err) {
    console.error('Error loading logo for invoice PDF:', err);
  }
  return null;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  period: string;
  paymentMethod: string;
  paymentStatus?: 'pending' | 'paid';
  paidAt?: string;
  currency: 'EUR' | 'MAD';
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  customerName: string;
  customerContactName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerTaxId?: string;
  customTaxNote?: string;
  invoiceLang: 'de' | 'fr';
}

export interface CompanyDetails {
  name: string;
  sub: string;
  address: string;
  legal: string;
  phone?: string;
  email: string;
  web: string;
  title: string;
  rib: string;
}

export function generateInvoicePdf(invoice: InvoicePdfData, company: CompanyDetails): Buffer {
  const isFr = invoice.invoiceLang === 'fr';
  const currSymbol = invoice.currency === 'MAD' ? 'MAD' : '€';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - 2 * margin;

  // Primary colors matching the web preview
  const blackColor: [number, number, number] = [17, 24, 39]; // #111827
  const darkGray: [number, number, number] = [55, 65, 81];   // #374151
  const midGray: [number, number, number] = [107, 114, 128]; // #6B7280
  const lightGray: [number, number, number] = [156, 163, 175]; // #9CA3AF
  const borderColor: [number, number, number] = [229, 231, 235]; // #E5E7EB
  const cardBg: [number, number, number] = [249, 250, 251]; // #F9FAFB

  // Format date helper
  const formatDate = (dStr: string) => {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString(isFr ? 'fr-FR' : 'de-DE');
    } catch {
      return dStr;
    }
  };

  // --- 1. TOP HEADER (CLEAN WHITE PREVIEW MATCH) ---
  let leftY = 18;

  // Company Logo & Name
  const logoBase64 = getMarketifLogoBase64();
  const logoWidth = 11;
  const logoHeight = logoWidth * (2131 / 3630); // ~6.45mm

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, leftY - 5.8, logoWidth, logoHeight, undefined, 'FAST');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...blackColor);
      doc.text(company.name, margin + logoWidth + 2.5, leftY);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...blackColor);
      doc.text(company.name, margin, leftY);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...blackColor);
    doc.text(company.name, margin, leftY);
  }
  leftY += 5.5;

  // Subtitle / Legal type
  if (company.sub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...midGray);
    doc.text(company.sub, margin, leftY);
    leftY += 4.5;
  }

  // Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkGray);
  doc.text(company.address, margin, leftY);
  leftY += 4.5;

  // Legal Line (Inhaber...)
  if (company.legal) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...midGray);
    doc.text(company.legal, margin, leftY);
    leftY += 4.5;
  }

  // Contact info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkGray);
  const contactText = company.phone
    ? `Email: ${company.email}  ·  ${isFr ? 'Tél:' : 'Tel:'} ${company.phone}  ·  Web: ${company.web}`
    : `Email: ${company.email}  ·  Web: ${company.web}`;
  doc.text(contactText, margin, leftY);
  leftY += 6;

  // Header Right side: Badge & Meta
  let rightY = 15;
  const badgeWidth = 36;
  const badgeHeight = 7.5;
  const badgeX = pageWidth - margin - badgeWidth;

  // Pill badge
  doc.setFillColor(...blackColor);
  doc.roundedRect(badgeX, rightY, badgeWidth, badgeHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(company.title, badgeX + badgeWidth / 2, rightY + 5.2, { align: 'center' });

  rightY += badgeHeight + 5;

  const metaRows: [string, string][] = [
    [isFr ? 'N° Facture:' : 'Rechnungs-Nr:', invoice.invoiceNumber],
    [isFr ? 'Date:' : 'Datum:', formatDate(invoice.invoiceDate)],
    ...(invoice.dueDate ? [[isFr ? 'Échéance:' : 'Fällig bis:', formatDate(invoice.dueDate)] as [string, string]] : []),
    ...(invoice.period ? [[isFr ? 'Période:' : 'Leistungszeitraum:', invoice.period] as [string, string]] : []),
  ];

  metaRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...blackColor);
    doc.text(label, pageWidth - margin - 45, rightY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text(val, pageWidth - margin, rightY, { align: 'right' });
    rightY += 4.8;
  });

  // Top divider line
  const dividerY = Math.max(leftY, rightY) + 3;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  // --- 2. TWO CLEAN CARDS (EMPFÄNGER & ZAHLUNGSMODALITÄT) ---
  const cardsY = dividerY + 6;
  const cardGap = 6;
  const cardWidth = (contentWidth - cardGap) / 2;
  const cardHeight = 48;

  // Left Card: EMPFÄNGER
  doc.setFillColor(...cardBg);
  doc.roundedRect(margin, cardsY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, cardsY, cardWidth, cardHeight, 3, 3, 'S');

  let recY = cardsY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...lightGray);
  doc.text(isFr ? 'FACTURÉ À (CLIENT)' : 'EMPFÄNGER', margin + 5, recY);
  recY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...blackColor);
  doc.text(invoice.customerName || (isFr ? 'Nom du Client' : 'Kundenname'), margin + 5, recY);
  recY += 4.5;

  if (invoice.customerContactName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);
    doc.text(`${isFr ? 'Attn:' : 'z.Hd.:'} ${invoice.customerContactName}`, margin + 5, recY);
    recY += 4;
  }

  if (invoice.customerAddress) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...midGray);
    const addressLines = invoice.customerAddress.split('\n');
    addressLines.slice(0, 3).forEach((line) => {
      doc.text(line.trim(), margin + 5, recY);
      recY += 3.8;
    });
  }

  if (invoice.customerPhone || invoice.customerEmail) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...midGray);
    const contactLine = [
      invoice.customerPhone ? `${isFr ? 'Tél:' : 'Tel:'} ${invoice.customerPhone}` : null,
      invoice.customerEmail ? `Email: ${invoice.customerEmail}` : null,
    ].filter(Boolean).join('  ·  ');
    doc.text(contactLine, margin + 5, recY);
    recY += 3.8;
  }

  if (invoice.customerTaxId) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...midGray);
    doc.text(`${isFr ? 'ICE / ID:' : 'USt-IdNr:'} ${invoice.customerTaxId}`, margin + 5, recY);
  }

  // Right Card: ZAHLUNGSMODALITÄT
  const rightCardX = margin + cardWidth + cardGap;
  doc.setFillColor(...cardBg);
  doc.roundedRect(rightCardX, cardsY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(...borderColor);
  doc.roundedRect(rightCardX, cardsY, cardWidth, cardHeight, 3, 3, 'S');

  let payY = cardsY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...lightGray);
  doc.text(isFr ? 'MODE DE PAIEMENT' : 'ZAHLUNGSMODALITÄT', rightCardX + 5, payY);
  payY += 5;

  const paymentLabel = invoice.paymentMethod === 'transfer'
    ? (isFr ? 'Virement Bancaire' : 'Banküberweisung')
    : invoice.paymentMethod === 'cash'
    ? (isFr ? 'Espèces / En mains propres' : 'Barzahlung')
    : (isFr ? 'Carte Bancaire' : 'Kartenzahlung');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...blackColor);
  doc.text(paymentLabel, rightCardX + 5, payY);
  payY += 4.5;

  const isCash = invoice.paymentMethod === 'cash';
  const isCard = invoice.paymentMethod === 'card';
  const isTransfer = invoice.paymentMethod === 'transfer';

  const methodSubtitle = isCash
    ? (isFr ? 'Reglement en especes / Recu de caisse' : 'Barzahlung / Quittung ueber Barbetrag')
    : isCard
    ? (isFr ? 'Transaction par carte bancaire' : 'Kartenzahlung / Elektronisch')
    : company.rib;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkGray);
  doc.text(methodSubtitle, rightCardX + 5, payY);
  payY += 5;

  const isPaid = invoice.paymentStatus === 'paid';

  if (isPaid) {
    // Payment confirmed box
    const vzBoxWidth = cardWidth - 10;
    const vzBoxHeight = 15;
    doc.setFillColor(240, 253, 244); // #F0FDF4
    doc.roundedRect(rightCardX + 5, payY, vzBoxWidth, vzBoxHeight, 2, 2, 'F');
    doc.setDrawColor(187, 247, 208); // #BBF7D0
    doc.roundedRect(rightCardX + 5, payY, vzBoxWidth, vzBoxHeight, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52); // #166534
    const boxTitle = isCash
      ? (isFr ? 'Especes recues avec remerciements' : 'Barzahlung dankend erhalten')
      : (isFr ? 'Paiement confirme' : 'Zahlungseingang bestaetigt');
    doc.text(boxTitle, rightCardX + 8, payY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...blackColor);
    const boxSubtitle = isCash
      ? (isFr ? 'Recu officiel de paiement' : 'Offizielle Barquittung')
      : (isFr ? 'Facture acquittee' : 'Betrag vollstaendig erhalten');
    doc.text(boxSubtitle, rightCardX + 8, payY + 8.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(22, 101, 52);
    const paidMsg = isCash
      ? (isFr
          ? `Reglement de ${Number(invoice.total || 0).toFixed(2)} ${currSymbol} en especes${invoice.paidAt ? ` le ${formatDate(invoice.paidAt)}` : ''}. Justificatif.`
          : `Betrag von ${Number(invoice.total || 0).toFixed(2)} ${currSymbol} bar beglichen${invoice.paidAt ? ` am ${formatDate(invoice.paidAt)}` : ''}. Offizielle Quittung.`)
      : (isFr
          ? `Reglement effectue${invoice.paidAt ? ` le ${formatDate(invoice.paidAt)}` : ''}. Quittance / Justificatif.`
          : `Zahlung verbucht${invoice.paidAt ? ` am ${formatDate(invoice.paidAt)}` : ''}. Dieser Beleg gilt als Quittung.`);
    doc.text(paidMsg, rightCardX + 8, payY + 12.8);
  } else if (isCash) {
    // Pending cash box
    const vzBoxWidth = cardWidth - 10;
    const vzBoxHeight = 15;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(rightCardX + 5, payY, vzBoxWidth, vzBoxHeight, 2, 2, 'F');
    doc.setDrawColor(...borderColor);
    doc.roundedRect(rightCardX + 5, payY, vzBoxWidth, vzBoxHeight, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...darkGray);
    doc.text(isFr ? 'Modalite :' : 'Zahlungshinweis :', rightCardX + 8, payY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...blackColor);
    doc.text(isFr ? 'Montant a regler en mains propres' : 'Betrag bar faellig bei Uebergabe', rightCardX + 8, payY + 8.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...midGray);
    const pendingCashNote = isFr
      ? `A regler en especes avant le ${formatDate(invoice.dueDate)}.`
      : `Bitte bis spaetestens ${formatDate(invoice.dueDate)} bar bereithalten.`;
    doc.text(pendingCashNote, rightCardX + 8, payY + 12.8);
  } else {
    // Verwendungszweck Box for pending transfer
    const vzBoxWidth = cardWidth - 10;
    const vzBoxHeight = 15;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(rightCardX + 5, payY, vzBoxWidth, vzBoxHeight, 2, 2, 'F');
    doc.setDrawColor(...borderColor);
    doc.roundedRect(rightCardX + 5, payY, vzBoxWidth, vzBoxHeight, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...darkGray);
    doc.text(isFr ? 'Reference a indiquer :' : 'Verwendungszweck :', rightCardX + 8, payY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...blackColor);
    doc.text(invoice.invoiceNumber, rightCardX + 8, payY + 8.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...midGray);
    const vzNote = isFr
      ? `Veuillez indiquer "${invoice.invoiceNumber}" lors de votre virement.`
      : `Bitte bei Ueberweisung angeben (Zeitraum: ${invoice.period || '-'}).`;
    doc.text(vzNote, rightCardX + 8, payY + 12.8);
  }

  // Status Badge at bottom of Right Card
  const statusBadgeY = cardsY + cardHeight - 8.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...midGray);
  doc.text('Status:', rightCardX + 5, statusBadgeY + 4);

  if (isPaid) {
    // Green badge: Bezahlt
    doc.setFillColor(220, 252, 231); // #DCFCE7
    doc.roundedRect(rightCardX + 18, statusBadgeY, 26, 5.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(22, 101, 52); // #166534
    doc.text(isFr ? 'Payee' : 'Bezahlt', rightCardX + 31, statusBadgeY + 3.8, { align: 'center' });
  } else {
    // Amber badge: Offen
    doc.setFillColor(254, 243, 199); // #FEF3C7
    doc.roundedRect(rightCardX + 18, statusBadgeY, 26, 5.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(146, 64, 14); // #92400E
    doc.text(isFr ? 'En attente' : 'Offen', rightCardX + 31, statusBadgeY + 3.8, { align: 'center' });
  }

  // --- 3. ITEMS TABLE ---
  let tableY = cardsY + cardHeight + 8;

  const colX = {
    desc: margin + 3,
    qty: margin + 115,
    unit: margin + 142,
    total: pageWidth - margin - 3,
  };

  // Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...blackColor);
  doc.text(isFr ? 'DÉSIGNATION / SERVICE' : 'BESCHREIBUNG / POSITION', colX.desc, tableY + 4);
  doc.text(isFr ? 'QTÉ' : 'MENGE', colX.qty, tableY + 4, { align: 'center' });
  doc.text(isFr ? 'PRIX UNIT.' : 'EINZELPREIS', colX.unit, tableY + 4, { align: 'right' });
  doc.text(isFr ? 'TOTAL' : 'GESAMT', colX.total, tableY + 4, { align: 'right' });

  doc.setDrawColor(...blackColor);
  doc.setLineWidth(0.5);
  doc.line(margin, tableY + 6.5, pageWidth - margin, tableY + 6.5);

  tableY += 8;

  // Table Rows
  (invoice.items || []).forEach((item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const lineTotal = (qty * price).toFixed(2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...blackColor);

    const descLines = doc.splitTextToSize(item.description || '-', 98);
    doc.text(descLines, colX.desc, tableY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text(String(qty), colX.qty, tableY + 4, { align: 'center' });
    doc.text(`${price.toFixed(2)} ${currSymbol}`, colX.unit, tableY + 4, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...blackColor);
    doc.text(`${lineTotal} ${currSymbol}`, colX.total, tableY + 4, { align: 'right' });

    const rowH = Math.max(7, descLines.length * 4.2 + 2);
    tableY += rowH;

    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.2);
    doc.line(margin, tableY, pageWidth - margin, tableY);
  });

  tableY += 6;

  // --- 4. TOTALS SECTION ---
  const subtotal = Number(invoice.subtotal) || 0;
  const taxRate = Number(invoice.taxRate) || 0;
  const taxAmount = Number(invoice.taxAmount) || 0;
  const total = Number(invoice.total) || 0;

  // Tax Note (Left side)
  const taxNote = invoice.customTaxNote
    ? invoice.customTaxNote
    : (taxRate === 0
      ? (isFr ? 'Exonéré de TVA / TVA non applicable' : 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.')
      : '');

  if (taxNote) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...midGray);
    const taxNoteLines = doc.splitTextToSize(taxNote, 95);
    doc.text(taxNoteLines, margin, tableY + 4);
  }

  // Totals Breakdown (Right side)
  const totalsLabelX = pageWidth - margin - 65;
  const totalsValX = pageWidth - margin;
  let totY = tableY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkGray);
  doc.text(isFr ? 'Total HT / Net:' : 'Zwischensumme Netto:', totalsLabelX, totY + 3.5);
  doc.text(`${subtotal.toFixed(2)} ${currSymbol}`, totalsValX, totY + 3.5, { align: 'right' });
  totY += 5.5;

  if (taxRate > 0) {
    doc.text(isFr ? `TVA (${taxRate}%):` : `MwSt. (${taxRate}%):`, totalsLabelX, totY + 3.5);
    doc.text(`${taxAmount.toFixed(2)} ${currSymbol}`, totalsValX, totY + 3.5, { align: 'right' });
    totY += 5.5;
  }

  // Total Border
  doc.setDrawColor(...blackColor);
  doc.setLineWidth(0.6);
  doc.line(totalsLabelX, totY + 1, totalsValX, totY + 1);

  // Total Line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...blackColor);
  doc.text(isFr ? 'TOTAL À PAYER:' : 'GESAMTBETRAG:', totalsLabelX, totY + 7);

  doc.setFontSize(12);
  doc.text(`${total.toFixed(2)} ${currSymbol}`, totalsValX, totY + 7, { align: 'right' });

  // --- 5. CLEAN FOOTER (MATCHING WEB PREVIEW) ---
  const footerY = pageHeight - 20;

  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...darkGray);
  const thanksMsg = isFr
    ? 'Merci de votre confiance ! Pour toute question, veuillez nous contacter par email.'
    : 'Vielen Dank für dein Vertrauen und die gute Zusammenarbeit!';
  doc.text(thanksMsg, pageWidth / 2, footerY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...midGray);
  const footerDetails = `${company.name} · ${company.address} · ${company.email} · ${company.web}`;
  doc.text(footerDetails, pageWidth / 2, footerY + 9.5, { align: 'center' });

  if (company.legal) {
    doc.setFontSize(6.8);
    doc.setTextColor(...lightGray);
    doc.text(company.legal, pageWidth / 2, footerY + 13.5, { align: 'center' });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
