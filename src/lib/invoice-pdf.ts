import { jsPDF } from 'jspdf';

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  period: string;
  paymentMethod: string;
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
  phone: string;
  email: string;
  web: string;
  title: string;
  rib: string;
}

export function generateInvoicePdf(invoice: InvoicePdfData, company: CompanyDetails): Buffer {
  const isFr = invoice.invoiceLang === 'fr';
  const curr = invoice.currency === 'MAD' ? 'MAD' : 'EUR';
  const currSymbol = invoice.currency === 'MAD' ? 'MAD' : '€';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Colors
  const goldColor: [number, number, number] = [212, 175, 55]; // #D4AF37
  const darkColor: [number, number, number] = [25, 25, 25];
  const grayColor: [number, number, number] = [100, 100, 100];
  const lightBg: [number, number, number] = [245, 245, 245];

  // Header Banner
  doc.setFillColor(...darkColor);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('MARKETIF', margin, 14);

  doc.setTextColor(...goldColor);
  doc.text('LOYALTY', margin + 35, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(190, 190, 190);
  doc.text(isFr ? 'Solution digitale de fidelite client' : 'Digitale Kundenkarten & Treuesystem', margin, 21);

  // Document Title & Number in Header Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(isFr ? 'FACTURE' : 'RECHNUNG', pageWidth - margin, 13, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(...goldColor);
  doc.text(invoice.invoiceNumber, pageWidth - margin, 20, { align: 'right' });

  let y = 38;

  // Small sender address line (DIN 5008 style)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...grayColor);
  const senderLine = isFr
    ? `${company.name} - ${company.address}`
    : `${company.name} - Weinligstrasse 24 - 21073 Hamburg`;
  doc.text(senderLine, margin, y);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y + 1.5, margin + 85, y + 1.5);

  y += 7;

  // Recipient Box (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text(invoice.customerName || (isFr ? 'Client' : 'Kunde'), margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);

  if (invoice.customerContactName) {
    doc.text(`${isFr ? 'A l\'att.' : 'z.Hd.'} ${invoice.customerContactName}`, margin, y);
    y += 4.5;
  }

  if (invoice.customerAddress) {
    const addressLines = invoice.customerAddress.split('\n');
    addressLines.forEach((line) => {
      doc.text(line.trim(), margin, y);
      y += 4.5;
    });
  }

  if (invoice.customerTaxId) {
    doc.setFontSize(8.5);
    doc.setTextColor(...grayColor);
    doc.text(`${isFr ? 'ICE / IF:' : 'St.-Nr. / USt-IdNr.:'} ${invoice.customerTaxId}`, margin, y);
    y += 5;
  }

  // Meta Box (Right Column)
  const metaX = 125;
  let metaY = 44;
  const metaLabelWidth = 35;

  const formatDate = (dStr: string) => {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString(isFr ? 'fr-FR' : 'de-DE');
    } catch {
      return dStr;
    }
  };

  const paymentLabel = invoice.paymentMethod === 'transfer'
    ? (isFr ? 'Virement bancaire' : 'Bankueberweisung')
    : invoice.paymentMethod === 'cash'
    ? (isFr ? 'Especes' : 'Barzahlung')
    : (isFr ? 'Carte bancaire' : 'Kartenzahlung');

  const metaRows: [string, string][] = [
    [isFr ? 'N° Facture :' : 'Rechnungs-Nr.:', invoice.invoiceNumber],
    [isFr ? 'Date :' : 'Rechnungsdatum:', formatDate(invoice.invoiceDate)],
    [isFr ? 'Echeance :' : 'Faellig am:', formatDate(invoice.dueDate)],
    [isFr ? 'Periode :' : 'Leistungszeitraum:', invoice.period || '-'],
    [isFr ? 'Paiement :' : 'Zahlungsart:', paymentLabel],
  ];

  doc.setFillColor(...lightBg);
  doc.roundedRect(metaX - 3, metaY - 4, pageWidth - metaX - margin + 3, metaRows.length * 5.5 + 4, 2, 2, 'F');

  metaRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text(label, metaX, metaY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text(val, pageWidth - margin, metaY, { align: 'right' });
    metaY += 5.5;
  });

  // Position cursor for items table
  y = Math.max(y + 8, metaY + 8);

  // Table Header
  const colX = {
    pos: margin + 3,
    desc: margin + 14,
    qty: margin + 115,
    unit: margin + 140,
    total: pageWidth - margin - 3,
  };

  doc.setFillColor(...darkColor);
  doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(isFr ? 'Pos' : 'Pos', colX.pos, y + 5.5);
  doc.text(isFr ? 'Description' : 'Beschreibung / Position', colX.desc, y + 5.5);
  doc.text(isFr ? 'Qte' : 'Menge', colX.qty, y + 5.5, { align: 'center' });
  doc.text(isFr ? 'Prix Unitaire' : 'Einzelpreis', colX.unit, y + 5.5, { align: 'right' });
  doc.text(isFr ? 'Total' : 'Gesamtbetrag', colX.total, y + 5.5, { align: 'right' });

  y += 9;

  // Table Body Rows
  (invoice.items || []).forEach((item, idx) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const lineTotal = (qty * price).toFixed(2);

    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, contentWidth, 7.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...darkColor);

    doc.text(String(idx + 1), colX.pos, y + 5);
    
    // Split long description text if needed
    const descLines = doc.splitTextToSize(item.description || '-', 95);
    doc.text(descLines, colX.desc, y + 5);

    doc.text(String(qty), colX.qty, y + 5, { align: 'center' });
    doc.text(`${price.toFixed(2)} ${currSymbol}`, colX.unit, y + 5, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${lineTotal} ${currSymbol}`, colX.total, y + 5, { align: 'right' });

    const rowHeight = Math.max(7.5, descLines.length * 4.5 + 2);
    y += rowHeight;

    doc.setDrawColor(235, 235, 235);
    doc.line(margin, y, pageWidth - margin, y);
  });

  y += 6;

  // Totals Box (Right) & Tax Note (Left)
  const totalsBoxWidth = 75;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  const subtotal = Number(invoice.subtotal) || 0;
  const taxRate = Number(invoice.taxRate) || 0;
  const taxAmount = Number(invoice.taxAmount) || 0;
  const total = Number(invoice.total) || 0;

  // Left Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  const taxNote = invoice.customTaxNote
    ? invoice.customTaxNote
    : (taxRate === 0
      ? (isFr ? 'TVA non applicable' : 'Gemaess § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).')
      : '');
  if (taxNote) {
    const noteLines = doc.splitTextToSize(taxNote, 90);
    doc.text(noteLines, margin, y + 4);
  }

  // Totals calculations
  let totY = y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  doc.text(isFr ? 'Total Net :' : 'Nettobetrag :', totalsBoxX, totY);
  doc.text(`${subtotal.toFixed(2)} ${currSymbol}`, pageWidth - margin, totY, { align: 'right' });
  totY += 5.5;

  if (taxRate > 0) {
    doc.text(`${isFr ? 'TVA' : 'MwSt.'} (${taxRate}%) :`, totalsBoxX, totY);
    doc.text(`${taxAmount.toFixed(2)} ${currSymbol}`, pageWidth - margin, totY, { align: 'right' });
    totY += 5.5;
  }

  // Grand Total Highlight
  doc.setFillColor(...darkColor);
  doc.roundedRect(totalsBoxX - 2, totY - 1, totalsBoxWidth + 2, 9, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(isFr ? 'MONTANT TOTAL :' : 'GESAMTBETRAG :', totalsBoxX + 2, totY + 5.5);

  doc.setTextColor(...goldColor);
  doc.text(`${total.toFixed(2)} ${currSymbol}`, pageWidth - margin - 2, totY + 5.5, { align: 'right' });

  totY += 16;

  // Payment Instructions Box
  y = Math.max(totY, y + 25);
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkColor);
  doc.text(isFr ? 'Modalites de paiement :' : 'Zahlungshinweise & Bankverbindung :', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(company.rib, margin + 4, y + 10.5);

  const referenceNotice = isFr
    ? `Veuillez indiquer la reference "${invoice.invoiceNumber}" lors de votre virement.`
    : `Bitte geben Sie bei Ueberweisung den Verwendungszweck "${invoice.invoiceNumber}" an.`;
  doc.text(referenceNotice, margin + 4, y + 15);

  // Footer on bottom of page
  const footerY = pageHeight - 16;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...grayColor);

  const footerCol1 = `${company.name} ${company.sub ? `(${company.sub})` : ''}\n${company.address}`;
  const footerCol2 = `${company.legal}\nWeb: ${company.web}`;
  const footerCol3 = `E-Mail: ${company.email}\nTel: ${company.phone}`;

  doc.text(footerCol1, margin, footerY + 4);
  doc.text(footerCol2, margin + 65, footerY + 4);
  doc.text(footerCol3, pageWidth - margin, footerY + 4, { align: 'right' });

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
