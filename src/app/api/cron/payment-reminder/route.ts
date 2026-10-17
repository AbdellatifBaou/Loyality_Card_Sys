import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPackagePrice(merchant: any): number {
  if (merchant?.package_type === 'gold') return 89;
  if (merchant?.package_type === 'custom') {
    return merchant?.custom_price !== null && merchant?.custom_price !== undefined && !isNaN(Number(merchant.custom_price))
      ? Number(merchant.custom_price)
      : 199;
  }
  return 49;
}

function buildReminderEmailHtml({
  merchantName,
  contactName,
  daysLeft,
  periodEndDateFormatted,
  priceFormatted,
  lang,
}: {
  merchantName: string;
  contactName?: string;
  daysLeft: number;
  periodEndDateFormatted: string;
  priceFormatted: string;
  lang: 'de' | 'fr';
}) {
  const isFr = lang === 'fr';
  const isDue = daysLeft <= 0;

  const greeting = contactName
    ? (isFr ? `Bonjour ${contactName},` : `Hallo ${contactName},`)
    : (isFr ? `Bonjour l'équipe ${merchantName},` : `Hallo Team ${merchantName},`);

  const headline = isFr
    ? (isDue ? `Renouvellement de votre abonnement Marketif Loyalty` : `Rappel : Renouvellement de votre abonnement Marketif Loyalty`)
    : (isDue ? `Verlängerung Ihrer Marketif Loyalty Lizenz fällig` : `Erinnerung: Verlängerung Ihrer Marketif Loyalty Lizenz`);

  const intro = isFr
    ? (isDue
      ? `Nous espérons que Marketif Loyalty continue d'apporter entière satisfaction à votre établissement. Votre période d'abonnement est arrivée à échéance le <strong>${periodEndDateFormatted}</strong>.`
      : `Nous vous remercions pour votre confiance continue. Votre période d'abonnement actuelle pour Marketif Loyalty arrive à échéance le <strong>${periodEndDateFormatted}</strong> (dans 3 jours).`)
    : (isDue
      ? `wir hoffen, Marketif Loyalty begeistert Ihre Kunden weiterhin jeden Tag. Ihre aktuelle Lizenzperiode ist am <strong>${periodEndDateFormatted}</strong> abgelaufen.`
      : `vielen Dank für Ihre partnerschaftliche Zusammenarbeit. Ihre aktuelle Lizenzperiode für Marketif Loyalty läuft in 3 Tagen am <strong>${periodEndDateFormatted}</strong> ab.`);

  const actionText = isFr
    ? `Afin de garantir un accès ininterrompu à votre terminal de fidélité et vos cartes digitales pour vos clients, nous vous invitons à régler le renouvellement mensuel de <strong>${priceFormatted}</strong>.`
    : `Um einen unterbrechungsfreien Betrieb Ihres Treue-Terminals und der digitalen Kundenkarten zu gewährleisten, bitten wir um die Begleichung der monatlichen Gebühr von <strong>${priceFormatted}</strong>.`;

  const paymentDetailsTitle = isFr ? 'Modalités de paiement :' : 'Zahlungsinformationen :';
  const paymentDetails = isFr
    ? `• <strong>Virement bancaire</strong> ou <strong>Espèces</strong> selon votre accord avec votre conseiller Marketif.<br/>• Si vous avez déjà effectué le règlement dans les dernières 24h, vous pouvez ignorer cet e-mail en toute tranquillité.`
    : `• <strong>Banküberweisung</strong> oder <strong>Barzahlung</strong> gemäß Vereinbarung.<br/>• Falls die Zahlung bereits in den letzten 24 Stunden erfolgt ist, betrachten Sie diesen Hinweis bitte als gegenstandslos.`;

  const footerText = isFr
    ? `Une question ? Notre équipe d'assistance reste à votre entière disposition par e-mail ou WhatsApp.`
    : `Haben Sie Fragen? Unser Support-Team steht Ihnen jederzeit gerne per E-Mail oder WhatsApp zur Seite.`;

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e5e5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d0d0d; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #171717; border-radius: 20px; border: 1px solid #2a2a2a; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1f1a0e 0%, #171717 100%); padding: 32px 36px; border-bottom: 1px solid rgba(212,175,55,0.2); text-align: left;">
              <span style="display: inline-block; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                MARKETIF <span style="color: #D4AF37;">LOYALTY</span>
              </span>
              <div style="margin-top: 6px; font-size: 12px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 1px;">
                ${isFr ? 'Notification de facturation' : 'Lizenz- & Abrechnungsservice'}
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px;">
              <h1 style="margin: 0 0 18px 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                ${headline}
              </h1>

              <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.6; color: #d4d4d4;">
                ${greeting}
              </p>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #a3a3a3;">
                ${intro}
              </p>

              <!-- Info Highlight Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: rgba(212,175,55,0.06); border: 1px solid rgba(212,175,55,0.25); border-radius: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 13px; color: #a3a3a3; padding-bottom: 6px;">
                          ${isFr ? 'Partenaire :' : 'Partner :'}
                        </td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: #ffffff; padding-bottom: 6px;">
                          ${merchantName}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #a3a3a3; padding-bottom: 6px;">
                          ${isFr ? 'Date d\'échéance :' : 'Fälligkeitsdatum :'}
                        </td>
                        <td align="right" style="font-size: 13px; font-weight: 700; color: ${isDue ? '#f87171' : '#D4AF37'}; padding-bottom: 6px;">
                          ${periodEndDateFormatted}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #a3a3a3;">
                          ${isFr ? 'Montant à renouveler :' : 'Verlängerungsbetrag :'}
                        </td>
                        <td align="right" style="font-size: 16px; font-weight: 800; color: #D4AF37;">
                          ${priceFormatted}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #d4d4d4;">
                ${actionText}
              </p>

              <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">
                  ${paymentDetailsTitle}
                </div>
                <div style="font-size: 13px; line-height: 1.6; color: #a3a3a3;">
                  ${paymentDetails}
                </div>
              </div>

              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.5; color: #737373;">
                ${footerText}
              </p>

              <!-- Signature -->
              <div style="border-top: 1px solid #2a2a2a; padding-top: 20px; font-size: 13px; color: #737373;">
                <strong style="color: #ffffff;">Marketif Loyalty Team</strong><br/>
                E-Mail: <a href="mailto:info@marketif.de" style="color: #D4AF37; text-decoration: none;">info@marketif.de</a><br/>
                Web: <a href="https://marketif.de" style="color: #D4AF37; text-decoration: none;">marketif.de</a>
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

async function processPaymentReminders(req: Request, forceMerchantId?: string) {
  const db = getAdminSupabase();

  let query = db
    .from('merchants_loyality')
    .select('id, name, slug, language, package_type, custom_price, contact_name, contact_phone, contact_email, current_period_end, stripe_subscription_id, push_settings')
    .eq('is_active', true)
    .not('current_period_end', 'is', null);

  if (forceMerchantId) {
    query = query.eq('id', forceMerchantId);
  }

  const { data: merchants, error } = await query;

  if (error) {
    console.error('Payment reminder cron DB error:', error);
    return { success: false, error: error.message };
  }

  if (!merchants || merchants.length === 0) {
    return { success: true, processedCount: 0, sentCount: 0, message: 'No active merchants found' };
  }

  const now = new Date();
  const results: any[] = [];
  let sentCount = 0;

  for (const m of merchants) {
    const periodEnd = new Date(m.current_period_end);
    const diffMs = periodEnd.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Determine eligibility:
    // Case 1: 3 days before expiry (daysLeft === 3)
    // Case 2: Due today or within 2 days overdue (daysLeft <= 0 && daysLeft >= -2)
    const isEligible = forceMerchantId ? true : (daysLeft === 3 || (daysLeft <= 0 && daysLeft >= -2));

    if (!isEligible) {
      results.push({ id: m.id, name: m.name, daysLeft, status: 'skipped_not_in_window' });
      continue;
    }

    const push = m.push_settings || {};
    const remindersSent = push.reminders_sent || {};
    const periodKey = periodEnd.toISOString().split('T')[0];
    const reminderType = daysLeft === 3 ? '3days' : 'due';
    const reminderKey = `${periodKey}_${reminderType}`;

    if (!forceMerchantId && remindersSent[reminderKey]) {
      results.push({ id: m.id, name: m.name, daysLeft, status: 'already_sent_for_period', reminderKey });
      continue;
    }

    const recipientEmail = m.contact_email || push.contact_email;
    if (!recipientEmail || !recipientEmail.includes('@')) {
      results.push({ id: m.id, name: m.name, daysLeft, status: 'skipped_no_email' });
      continue;
    }

    const lang: 'de' | 'fr' = m.language === 'fr' ? 'fr' : 'de';
    const price = getPackagePrice(m);
    const curr = lang === 'fr' && m.country === 'MA' ? 'MAD' : '€';
    const priceFormatted = `${price.toFixed(2)} ${curr}`;
    const periodEndDateFormatted = periodEnd.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = lang === 'fr'
      ? (daysLeft <= 0
        ? `Échéance : Renouvellement de votre abonnement Marketif Loyalty – ${m.name}`
        : `Rappel : Renouvellement de votre abonnement Marketif Loyalty dans 3 jours – ${m.name}`)
      : (daysLeft <= 0
        ? `Fälligkeit: Verlängerung Ihrer Marketif Loyalty Lizenz – ${m.name}`
        : `Erinnerung: Verlängerung Ihrer Marketif Loyalty Lizenz in 3 Tagen – ${m.name}`);

    const html = buildReminderEmailHtml({
      merchantName: m.name,
      contactName: m.contact_name || push.contact_name,
      daysLeft,
      periodEndDateFormatted,
      priceFormatted,
      lang,
    });

    try {
      const emailRes = await sendEmail({
        to: recipientEmail,
        subject,
        html,
      });

      if (emailRes.success) {
        remindersSent[reminderKey] = new Date().toISOString();
        await db.from('merchants_loyality').update({
          push_settings: {
            ...push,
            reminders_sent: remindersSent,
            last_reminder_email_sent_at: new Date().toISOString(),
            last_reminder_type: reminderType,
          },
        }).eq('id', m.id);

        sentCount++;
        results.push({
          id: m.id,
          name: m.name,
          email: recipientEmail,
          daysLeft,
          status: 'sent',
          reminderKey,
        });
      } else {
        results.push({
          id: m.id,
          name: m.name,
          daysLeft,
          status: 'error_sending',
          error: emailRes.error,
        });
      }
    } catch (err: any) {
      console.error(`Failed to send reminder email to ${m.name}:`, err);
      results.push({
        id: m.id,
        name: m.name,
        daysLeft,
        status: 'exception',
        error: err?.message,
      });
    }
  }

  return {
    success: true,
    processedCount: merchants.length,
    sentCount,
    details: results,
  };
}

// GET: Standard cron execution (e.g. from Vercel Cron or uptime robot)
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const result = await processPaymentReminders(req);
  return NextResponse.json(result);
}

// POST: Admin manual execution or forced single merchant test
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const isCronAuthorized = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // Also allow admin auth header / cookie if called from admin dashboard
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body
    }

    if (!isCronAuthorized) {
      const { validateAuth } = require('@/lib/auth');
      const authValidation = await validateAuth(req);
      if (!authValidation.authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await processPaymentReminders(req, body.merchantId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in payment-reminder POST route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
