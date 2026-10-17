import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { generateInvoicePdf } from '@/lib/invoice-pdf';

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { invoice, password } = body;

    const correctPassword = process.env.ADMIN_API_KEY || '2025';
    const isPasswordAuth = password && password === correctPassword;

    if (!isPasswordAuth) {
      const authValidation = await validateAuth(req);
      if (!authValidation.authorized) {
        return NextResponse.json({ error: authValidation.error }, { status: 401 });
      }
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Missing invoice data' }, { status: 400 });
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

    const pdfBuffer = generateInvoicePdf(invoice, company);
    const safeInvNum = (invoice.invoiceNumber || 'Rechnung').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${lang === 'fr' ? 'Facture' : 'Rechnung'}_${safeInvNum}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
