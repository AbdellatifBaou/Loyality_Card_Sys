import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAuth } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { generateInvoicePdf } from '@/lib/invoice-pdf';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function buildInvoiceEmailHtml({
  invoice,
  company,
  lang,
}: {
  invoice: any;
  company: any;
  lang: 'de' | 'fr';
}) {
  const isFr = lang === 'fr';
  const curr = invoice.currency === 'MAD' ? 'MAD' : '€';
  const isPaid = invoice.paymentStatus === 'paid';

  const paymentMethodLabel = invoice.paymentMethod === 'transfer' 
    ? (isFr ? 'Virement Bancaire' : 'Banküberweisung') 
    : invoice.paymentMethod === 'cash' 
    ? (isFr ? 'Espèces' : 'Barzahlung') 
    : (isFr ? 'Carte Bancaire' : 'Kartenzahlung');

  const formattedInvoiceDate = invoice.invoiceDate 
    ? new Date(invoice.invoiceDate).toLocaleDateString(isFr ? 'fr-FR' : 'de-DE') 
    : '-';
  const formattedDueDate = invoice.dueDate 
    ? new Date(invoice.dueDate).toLocaleDateString(isFr ? 'fr-FR' : 'de-DE') 
    : '-';

  const greeting = invoice.customerContactName 
    ? (isFr ? `Bonjour ${invoice.customerContactName},` : `Hallo ${invoice.customerContactName},`)
    : (invoice.customerName ? (isFr ? `Bonjour ${invoice.customerName},` : `Hallo ${invoice.customerName},`) : (isFr ? 'Bonjour,' : 'Hallo,'));

  const itemsRows = (invoice.items || []).map((it: any) => {
    const qty = Number(it.quantity) || 1;
    const price = Number(it.unitPrice) || 0;
    const lineTotal = (qty * price).toFixed(2);
    return `
      <tr style="border-bottom: 1px solid #2a2a2a;">
        <td style="padding: 12px 14px; font-size: 14px; color: #e5e5e5; vertical-align: top;">
          <strong>${it.description || '-'}</strong>
        </td>
        <td align="center" style="padding: 12px 14px; font-size: 14px; color: #a3a3a3; vertical-align: top;">
          ${qty}
        </td>
        <td align="right" style="padding: 12px 14px; font-size: 14px; color: #a3a3a3; vertical-align: top;">
          ${price.toFixed(2)} ${curr}
        </td>
        <td align="right" style="padding: 12px 14px; font-size: 14px; font-weight: 700; color: #ffffff; vertical-align: top;">
          ${lineTotal} ${curr}
        </td>
      </tr>
    `;
  }).join('');

  const taxRate = Number(invoice.taxRate) || 0;
  const subtotal = Number(invoice.subtotal) || 0;
  const taxAmount = Number(invoice.taxAmount) || 0;
  const total = Number(invoice.total) || 0;

  const taxNoteHtml = invoice.customTaxNote
    ? `<div style="font-size: 12px; color: #888888; margin-top: 6px; font-style: italic;">${invoice.customTaxNote}</div>`
    : (taxRate === 0
      ? `<div style="font-size: 11px; color: #888888; margin-top: 6px; font-style: italic;">${isFr ? 'TVA non applicable' : 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'}</div>`
      : '');

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isFr ? 'Facture' : 'Rechnung'} ${invoice.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e5e5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d0d0d; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #171717; border-radius: 20px; border: 1px solid #2a2a2a; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1f1a0e 0%, #171717 100%); padding: 32px 36px; border-bottom: 1px solid rgba(212,175,55,0.25);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                      MARKETIF <span style="color: #D4AF37;">LOYALTY</span>
                    </span>
                    <div style="margin-top: 4px; font-size: 12px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 1px;">
                      ${isFr ? 'Facture Officielle' : 'Offizielle Rechnung'}
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 6px 14px; background: rgba(212,175,55,0.15); border: 1px solid rgba(212,175,55,0.3); border-radius: 8px; font-size: 13px; font-weight: 700; color: #D4AF37; font-family: monospace;">
                      ${invoice.invoiceNumber}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #ffffff;">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #a3a3a3;">
                ${isPaid
                  ? (isFr 
                      ? `Nous confirmons avec remerciements la bonne réception de votre règlement pour <strong>${invoice.period || 'Marketif Loyalty'}</strong>. Veuillez trouver ci-dessous votre reçu et facture acquittée.`
                      : `wir bestätigen dankend den Zahlungseingang für <strong>${invoice.period || 'Marketif Loyalty'}</strong>. Anbei erhalten Sie Ihre quittierte Rechnung / Zahlungsbestätigung.`)
                  : (isFr 
                      ? `Veuillez trouver ci-dessous le récapitulatif détaillé de votre facture pour <strong>${invoice.period || 'Marketif Loyalty'}</strong>.`
                      : `anbei erhalten Sie die Abrechnung zur Begleichung für <strong>${invoice.period || 'Marketif Loyalty'}</strong>.`)}
              </p>

              <!-- Attached PDF Notice Banner -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background: ${isPaid ? 'rgba(34,197,94,0.08)' : 'rgba(212,175,55,0.08)'}; border: 1px solid ${isPaid ? 'rgba(34,197,94,0.28)' : 'rgba(212,175,55,0.28)'}; border-radius: 12px;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #f5f5f5; line-height: 1.5;">
                    <span style="font-size: 15px; margin-right: 6px;">📎</span>
                    <strong style="color: ${isPaid ? '#4ade80' : '#D4AF37'};">
                      ${isPaid 
                        ? (isFr ? 'Facture acquittée (PDF) en pièce jointe' : 'Quittierte PDF-Rechnung im Anhang')
                        : (isFr ? 'Facture officielle PDF en pièce jointe' : 'Offizielle PDF-Rechnung im Anhang')}:
                    </strong>
                    <span style="color: #cccccc;">
                      ${isPaid
                        ? (isFr 
                            ? `Le document PDF imprimable (Quittance & Reçu) pour votre comptabilité est joint à cet e-mail.`
                            : `Das druckfähige PDF-Dokument (Quittung & Beleg) für Ihre Buchhaltung und Steuerunterlagen ist beigefügt.`)
                        : (isFr 
                            ? `Le document PDF imprimable pour votre déclaration fiscale et comptabilité est joint à cet e-mail.`
                            : `Das druckfähige PDF-Dokument für Ihre Buchhaltung und Steuerunterlagen ist dieser E-Mail als Anhang beigefügt.`)}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Two Column Meta Box (Recipient & Invoice Details) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;">
                <tr>
                  <!-- Recipient -->
                  <td width="50%" style="padding: 18px 20px; vertical-align: top; border-right: 1px solid rgba(255,255,255,0.06);">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #D4AF37; font-weight: 700; margin-bottom: 8px;">
                      ${isFr ? 'Destinataire' : 'Rechnungsempfänger'}
                    </div>
                    <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">
                      ${invoice.customerName || '-'}
                    </div>
                    ${invoice.customerContactName ? `<div style="font-size: 13px; color: #d4d4d4; margin-bottom: 4px;">z.Hd. ${invoice.customerContactName}</div>` : ''}
                    ${invoice.customerAddress ? `<div style="font-size: 12px; color: #a3a3a3; line-height: 1.4; margin-bottom: 4px;">${invoice.customerAddress.replace(/\n/g, '<br/>')}</div>` : ''}
                    ${invoice.customerTaxId ? `<div style="font-size: 11px; color: #888888; margin-top: 4px;">${isFr ? 'ICE / IF :' : 'St-Nr. / USt-IdNr.:'} ${invoice.customerTaxId}</div>` : ''}
                  </td>

                  <!-- Invoice Meta -->
                  <td width="50%" style="padding: 18px 20px; vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #D4AF37; font-weight: 700; margin-bottom: 8px;">
                      ${isFr ? 'Détails de la facture' : 'Rechnungsdaten'}
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 12px;">
                      <tr>
                        <td style="color: #a3a3a3; padding-bottom: 5px;">${isFr ? 'Date :' : 'Datum :'}</td>
                        <td align="right" style="color: #ffffff; font-weight: 600; padding-bottom: 5px;">${formattedInvoiceDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #a3a3a3; padding-bottom: 5px;">${isFr ? 'Échéance :' : 'Fällig bis :'}</td>
                        <td align="right" style="color: #ffffff; font-weight: 600; padding-bottom: 5px;">${formattedDueDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #a3a3a3; padding-bottom: 5px;">${isFr ? 'Période :' : 'Zeitraum :'}</td>
                        <td align="right" style="color: #ffffff; font-weight: 600; padding-bottom: 5px;">${invoice.period || '-'}</td>
                      </tr>
                      <tr>
                        <td style="color: #a3a3a3; padding-bottom: 5px;">${isFr ? 'Paiement :' : 'Zahlungsart :'}</td>
                        <td align="right" style="color: #D4AF37; font-weight: 700; padding-bottom: 5px;">${paymentMethodLabel}</td>
                      </tr>
                      <tr>
                        <td style="color: #a3a3a3;">Status :</td>
                        <td align="right">
                          ${isPaid 
                            ? `<span style="display: inline-block; padding: 2px 8px; background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); border-radius: 6px; font-size: 11px; font-weight: 700; color: #4ade80;">${isFr ? 'Payée' : 'Bezahlt'}</span>`
                            : `<span style="display: inline-block; padding: 2px 8px; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); border-radius: 6px; font-size: 11px; font-weight: 700; color: #fbbf24;">${isFr ? 'En attente' : 'Offen'}</span>`}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Line Items Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 20px; background: rgba(255,255,255,0.015); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">
                <thead>
                  <tr style="background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <th align="left" style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #a3a3a3; font-weight: 700;">
                      ${isFr ? 'Description' : 'Beschreibung / Position'}
                    </th>
                    <th align="center" width="60" style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #a3a3a3; font-weight: 700;">
                      ${isFr ? 'Qté' : 'Menge'}
                    </th>
                    <th align="right" width="110" style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #a3a3a3; font-weight: 700;">
                      ${isFr ? 'Prix Unitaire' : 'Einzelpreis'}
                    </th>
                    <th align="right" width="110" style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #a3a3a3; font-weight: 700;">
                      ${isFr ? 'Total' : 'Gesamt'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>

              <!-- Totals Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="50%" style="vertical-align: top; padding-right: 15px;">
                    ${taxNoteHtml}
                  </td>
                  <td width="50%" style="vertical-align: top;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: rgba(212,175,55,0.06); border: 1px solid rgba(212,175,55,0.25); border-radius: 12px; padding: 14px 18px;">
                      <tr>
                        <td style="font-size: 13px; color: #a3a3a3; padding-bottom: 6px;">
                          ${isFr ? 'Total Net :' : 'Zwischensumme Netto :'}
                        </td>
                        <td align="right" style="font-size: 13px; color: #ffffff; padding-bottom: 6px;">
                          ${subtotal.toFixed(2)} ${curr}
                        </td>
                      </tr>
                      ${taxRate > 0 ? `
                        <tr>
                          <td style="font-size: 13px; color: #a3a3a3; padding-bottom: 6px;">
                            ${isFr ? `TVA (${taxRate}%) :` : `MwSt. (${taxRate}%) :`}
                          </td>
                          <td align="right" style="font-size: 13px; color: #ffffff; padding-bottom: 6px;">
                            ${taxAmount.toFixed(2)} ${curr}
                          </td>
                        </tr>
                      ` : ''}
                      <tr>
                        <td style="font-size: 15px; font-weight: 800; color: #ffffff; border-top: 1px solid rgba(212,175,55,0.3); padding-top: 8px;">
                          ${isFr ? 'MONTANT TOTAL :' : 'GESAMTBETRAG :'}
                        </td>
                        <td align="right" style="font-size: 18px; font-weight: 800; color: #D4AF37; border-top: 1px solid rgba(212,175,55,0.3); padding-top: 8px;">
                          ${total.toFixed(2)} ${curr}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Payment instructions / Receipt confirmation -->
              ${isPaid ? `
                <div style="background: rgba(34,197,94,0.06); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid rgba(34,197,94,0.25);">
                  <div style="font-size: 13px; font-weight: 700; color: #4ade80; margin-bottom: 4px;">
                    ✓ ${isFr ? 'Paiement confirmé / Facture acquittée' : 'Zahlungseingang bestätigt / Quittung'}
                  </div>
                  <div style="font-size: 12px; line-height: 1.6; color: #d4d4d4;">
                    ${isFr 
                      ? `Le montant a été intégralement réglé${invoice.paidAt ? ` le ${new Date(invoice.paidAt).toLocaleDateString('fr-FR')}` : ''}. Ce document ainsi que le PDF joint attestent de votre règlement.`
                      : `Der Betrag wurde vollständig beglichen${invoice.paidAt ? ` am ${new Date(invoice.paidAt).toLocaleDateString('de-DE')}` : ''}. Dieses Dokument und die beigefügte PDF gelten als Zahlungsnachweis.`}
                  </div>
                </div>
              ` : `
                <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.06);">
                  <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">
                    ${isFr ? 'Instructions de règlement :' : 'Zahlungsinformationen :'}
                  </div>
                  <div style="font-size: 12px; line-height: 1.6; color: #a3a3a3;">
                    ${company.rib}
                    <div style="margin-top: 10px; padding: 12px 14px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                      <div style="font-size: 11px; text-transform: uppercase; color: #D4AF37; font-weight: 700; margin-bottom: 3px;">
                        ${isFr ? 'Référence à indiquer :' : 'Verwendungszweck :'}
                      </div>
                      <div style="font-size: 14px; font-weight: 800; color: #ffffff; font-family: monospace;">
                        ${invoice.invoiceNumber}
                      </div>
                      <div style="font-size: 11px; color: #a3a3a3; margin-top: 4px;">
                        ${isFr 
                          ? `Veuillez mentionner la référence "${invoice.invoiceNumber}" lors de votre virement.`
                          : `Bitte geben Sie bei Überweisungen den Verwendungszweck "${invoice.invoiceNumber}" an.`}
                      </div>
                    </div>
                  </div>
                </div>
              `}

              <!-- Footer Sign-off -->
              <div style="border-top: 1px solid #2a2a2a; padding-top: 20px; font-size: 12px; color: #737373; line-height: 1.6;">
                <strong style="color: #ffffff;">${company.name}</strong> ${company.sub ? `· ${company.sub}` : ''}<br/>
                ${company.address}<br/>
                ${company.legal ? `${company.legal}<br/>` : ''}
                E-Mail: <a href="mailto:${company.email}" style="color: #D4AF37; text-decoration: none;">${company.email}</a> · Web: <a href="https://${company.web}" style="color: #D4AF37; text-decoration: none;">${company.web}</a>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { merchantId, invoice, recipientEmail, password } = body;

    const correctPassword = process.env.ADMIN_API_KEY || '2025';
    const isPasswordAuth = password && password === correctPassword;

    if (!isPasswordAuth) {
      const authValidation = await validateAuth(req);
      if (!authValidation.authorized) {
        return NextResponse.json({ error: authValidation.error }, { status: 401 });
      }
    }

    if (!merchantId || !invoice) {
      return NextResponse.json({ error: 'Missing merchantId or invoice data' }, { status: 400 });
    }

    const targetEmail = recipientEmail || invoice.customerEmail;
    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json({ error: 'Bitte gib eine gültige E-Mail-Adresse für den Empfänger an.' }, { status: 400 });
    }

    const lang: 'de' | 'fr' = invoice.invoiceLang === 'fr' ? 'fr' : 'de';

    const company = lang === 'fr'
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

    const subject = lang === 'fr'
      ? `Facture ${invoice.invoiceNumber} de Marketif – ${invoice.period || 'Marketif Loyalty'}`
      : `Rechnung ${invoice.invoiceNumber} von Marketif – ${invoice.period || 'Marketif Loyalty'}`;

    const html = buildInvoiceEmailHtml({ invoice, company, lang });

    // Generate PDF invoice attachment
    let attachments: Array<{ filename: string; content: Buffer }> = [];
    try {
      const pdfBuffer = generateInvoicePdf(invoice, company);
      const safeInvNum = (invoice.invoiceNumber || 'Rechnung').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${lang === 'fr' ? 'Facture' : 'Rechnung'}_${safeInvNum}.pdf`;
      attachments = [{ filename, content: pdfBuffer }];
    } catch (pdfErr) {
      console.error('Error generating invoice PDF attachment:', pdfErr);
    }

    // Send email via Resend with PDF attachment
    const emailResult = await sendEmail({
      to: targetEmail,
      subject,
      html,
      attachments,
    });

    if (!emailResult.success) {
      return NextResponse.json({ error: emailResult.error || 'Failed to send email' }, { status: 500 });
    }

    // Auto-save invoice to merchant's archive in Supabase push_settings.manual_invoices
    const adminSupabase = getAdminSupabase();
    const { data: merchant } = await adminSupabase
      .from('merchants_loyality')
      .select('id, push_settings')
      .eq('id', merchantId)
      .single();

    if (merchant) {
      const currentPush = merchant.push_settings || {};
      const existingInvoices: any[] = Array.isArray(currentPush.manual_invoices) ? currentPush.manual_invoices : [];

      const invoiceToSave = {
        ...invoice,
        id: invoice.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        customerEmail: targetEmail,
        createdAt: invoice.createdAt || new Date().toISOString(),
        lastEmailSentAt: new Date().toISOString(),
      };

      const index = existingInvoices.findIndex((inv: any) => inv.id === invoiceToSave.id || (inv.invoiceNumber && inv.invoiceNumber === invoiceToSave.invoiceNumber));

      let updatedInvoices: any[];
      if (index >= 0) {
        updatedInvoices = [...existingInvoices];
        updatedInvoices[index] = invoiceToSave;
      } else {
        updatedInvoices = [invoiceToSave, ...existingInvoices];
      }

      await adminSupabase
        .from('merchants_loyality')
        .update({
          push_settings: {
            ...currentPush,
            manual_invoices: updatedInvoices,
          },
        })
        .eq('id', merchantId);
    }

    return NextResponse.json({
      success: true,
      message: 'Rechnung erfolgreich per E-Mail gesendet und archiviert.',
      sentTo: targetEmail,
    });
  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
