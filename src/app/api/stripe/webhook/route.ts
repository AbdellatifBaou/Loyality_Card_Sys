import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getStripe = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-04-22.dahlia',
  });

// Service role client — bypasses RLS for webhook writes
const getAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Safe email helper — never throws
async function safeEmail(opts: { to: string; subject: string; html: string }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set — skipping email:', opts.subject);
      return;
    }
    const { sendEmail } = await import('@/lib/email');
    await sendEmail(opts);
  } catch (e) {
    console.error('Email send failed (non-fatal):', e);
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = getAdmin();

  // DEBUG: Log the event to DB
  try {
    await db.from('webhook_logs').insert({
      event_type: event.type,
      payload: event
    });
  } catch (e) {
    console.error('Failed to log webhook', e);
  }

  // Helper: look up our merchant ID from Stripe's customer ID
  const getMerchantId = async (customerId: string): Promise<string | null> => {
    if (!customerId) return null;
    try {
      const { data } = await db
        .from('merchant_billing')
        .select('merchant_id')
        .eq('stripe_customer_id', customerId)
        .single();
      return data?.merchant_id ?? null;
    } catch {
      return null;
    }
  };

  try {
    switch (event.type) {

      // ── Checkout erfolgreich abgeschlossen ──────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string | null;
        let merchantId = await getMerchantId(customerId);

        if (!merchantId && session.metadata?.company) {
          const { company, shortName, plan, name, email, phone, monthlyPrice } =
            session.metadata;

          const slugBase = shortName || company;
          const generatedSlug = slugBase
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          // Does a merchant with this slug already exist?
          const { data: existingMerchant } = await db
            .from('merchants_loyality')
            .select('id')
            .eq('slug', generatedSlug)
            .maybeSingle();

          if (existingMerchant) {
            merchantId = existingMerchant.id;
            await db
              .from('merchants_loyality')
              .update({
                is_active: true,
                subscription_status: 'active',
                package_type: plan,
                custom_price:
                  plan === 'custom' && monthlyPrice
                    ? parseFloat(monthlyPrice)
                    : null,
              })
              .eq('id', merchantId);
          } else {
            const { data: newMerchant, error: insertError } = await db
              .from('merchants_loyality')
              .insert({
                name: company,
                slug: generatedSlug,
                is_active: true,
                subscription_status: 'active',
                package_type: plan,
                custom_price:
                  plan === 'custom' && monthlyPrice
                    ? parseFloat(monthlyPrice)
                    : null,
              })
              .select('id')
              .single();

            if (insertError) {
              console.error('Error creating merchant:', insertError);
              return NextResponse.json(
                { error: 'Failed to create merchant: ' + insertError.message },
                { status: 500 },
              );
            }
            merchantId = newMerchant.id;
          }

          // Billing record
          await db.from('merchant_billing').upsert(
            {
              merchant_id: merchantId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId ?? null,
            },
            { onConflict: 'merchant_id' },
          );

          // Admin email
          await safeEmail({
            to: 'kontakt@marketif.de',
            subject: `🟢 Neuer Händler: ${company} (Paket: ${plan})`,
            html: `<p>Ein neuer Händler hat sich registriert und bezahlt.</p>
                   <ul>
                     <li><strong>Firma:</strong> ${company}</li>
                     <li><strong>Kontaktperson:</strong> ${name}</li>
                     <li><strong>E-Mail:</strong> ${email}</li>
                     <li><strong>Telefon:</strong> ${phone}</li>
                     <li><strong>Paket:</strong> ${plan}</li>
                     <li><strong>Dashboard:</strong> /dashboard/${generatedSlug}</li>
                   </ul>`,
          });

          // Customer welcome email
          if (email) {
            await safeEmail({
              to: email,
              subject: `Willkommen bei Marketif Treue, ${name}!`,
              html: `
                <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#ffffff;background-color:#0a0a0a;border-radius:12px;border:1px solid #333;">
                  <div style="text-align:center;margin-bottom:20px;">
                    <h1 style="color:#8097ff;margin:0;">Marketif <span style="color:#ffffff;">Treue</span></h1>
                  </div>
                  <p style="font-size:16px;line-height:1.5;">Hallo ${name},</p>
                  <p style="font-size:16px;line-height:1.5;">vielen Dank für deine Registrierung! Dein Marketif Treue-System für <strong>${company}</strong> ist nun erfolgreich eingerichtet und aktiv.</p>
                  <p style="font-size:16px;line-height:1.5;">Dein persönliches Händler-Dashboard erreichst du ab sofort unter diesem Link:</p>
                  <div style="text-align:center;margin:30px 0;">
                    <a href="https://treue.marketif.de/dashboard/${generatedSlug}" style="background-color:#8097ff;color:#000000;padding:14px 28px;text-decoration:none;font-weight:bold;border-radius:8px;font-size:16px;display:inline-block;">Zum Dashboard</a>
                  </div>
                  <p style="font-size:16px;line-height:1.5;">Falls du Fragen zur Einrichtung hast oder Unterstützung benötigst, kannst du jederzeit auf diese E-Mail antworten.</p>
                  <hr style="border-color:#333;margin:30px 0;">
                  <p style="font-size:14px;color:#888;text-align:center;">Beste Grüße,<br>Dein Marketif Team</p>
                </div>
              `,
            });
          }
        } else if (merchantId) {
          // Existing merchant — reactivation via checkout
          const updateData: Record<string, unknown> = {
            is_active: true,
            subscription_status: 'active',
          };
          if (session.metadata?.plan) {
            updateData.package_type = session.metadata.plan;
          }
          await db.from('merchants_loyality').update(updateData).eq('id', merchantId);
          await db
            .from('merchant_billing')
            .update({ stripe_subscription_id: subscriptionId ?? null })
            .eq('merchant_id', merchantId);

          await safeEmail({
            to: 'kontakt@marketif.de',
            subject: `🟢 Händler Reaktivierung via Checkout: Merchant ID ${merchantId}`,
            html: `<p>Ein bestehender Händler hat sein Abo reaktiviert.</p><p>Merchant ID: ${merchantId}</p>`,
          });
        }
        break;
      }

      // ── Abo vollständig gekündigt (Periodenende abgelaufen) ─────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const merchantId = await getMerchantId(customerId);

        if (merchantId) {
          await db
            .from('merchants_loyality')
            .update({ is_active: false, subscription_status: 'cancelled' })
            .eq('id', merchantId);

          await safeEmail({
            to: 'kontakt@marketif.de',
            subject: `🔴 Abo abgelaufen/gekündigt: Merchant ID ${merchantId}`,
            html: `<p>Ein Händler-Abo ist vollständig beendet worden.</p><p>Merchant ID: ${merchantId}</p>`,
          });
        }
        break;
      }

      // ── Abo-Status geändert (Kündigung geplant / Reaktivierung) ────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const merchantId = await getMerchantId(customerId);

        // No merchant found — just acknowledge the event
        if (!merchantId) break;

        const prev = (event.data.previous_attributes ?? {}) as Record<string, unknown>;

        // Stripe Customer Portal often sets `cancel_at` (timestamp) instead of `cancel_at_period_end` (boolean).
        const isCanceling = sub.cancel_at_period_end || sub.cancel_at !== null;
        
        // Did it JUST flip from not canceling to canceling?
        const justCanceled = 
          (sub.cancel_at_period_end && prev.cancel_at_period_end === false) ||
          (sub.cancel_at !== null && prev.cancel_at === null);

        // Did it JUST flip from canceling to not canceling (reactivated)?
        const justReactivated = 
          (sub.cancel_at_period_end === false && prev.cancel_at_period_end === true) ||
          (sub.cancel_at === null && prev.cancel_at !== null && prev.cancel_at !== undefined);

        if (isCanceling) {
          const updateObj: any = { subscription_status: 'cancels_at_period_end' };
          const periodEnd = (sub as any).current_period_end || sub.cancel_at;
          if (periodEnd) {
             updateObj.current_period_end = new Date(periodEnd * 1000).toISOString();
          }

          const { error: updateErr } = await db
            .from('merchants_loyality')
            .update(updateObj)
            .eq('id', merchantId);

          if (updateErr) {
            console.error('[WEBHOOK ERROR] Failed to update merchants_loyality for cancel:', updateErr);
          }

          if (justCanceled) {
            // Admin Email
            await safeEmail({
              to: 'kontakt@marketif.de',
              subject: `⚠️ Abo-Kündigung geplant: Merchant ID ${merchantId}`,
              html: `<p>Ein Händler hat sein Abo zum Periodenende gekündigt.</p>
                     <p>Merchant ID: ${merchantId}</p>
                     <p>Service endet am: ${periodEnd ? new Date(periodEnd * 1000).toLocaleDateString('de-DE') : 'Unbekannt'}</p>`,
            });

            // Customer Email
            try {
              const customerInfo = await stripe.customers.retrieve(customerId) as Stripe.Customer;
              if (customerInfo.email) {
                const userName = customerInfo.name || 'Händler';
                await safeEmail({
                  to: customerInfo.email,
                  subject: `Kündigung deines Marketif Treue Abonnements`,
                  html: `
                    <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#ffffff;background-color:#0a0a0a;border-radius:12px;border:1px solid #333;">
                      <div style="text-align:center;margin-bottom:20px;">
                        <h1 style="color:#8097ff;margin:0;">Marketif <span style="color:#ffffff;">Treue</span></h1>
                      </div>
                      <p style="font-size:16px;line-height:1.5;">Hallo ${userName},</p>
                      <p style="font-size:16px;line-height:1.5;">wir bestätigen hiermit den Eingang deiner Kündigung für das Marketif Treue System.</p>
                      <p style="font-size:16px;line-height:1.5;">Dein Zugang und dein Dashboard bleiben noch bis zum Ende der laufenden Abrechnungsperiode (<strong>${periodEnd ? new Date(periodEnd * 1000).toLocaleDateString('de-DE') : 'Vertragsende'}</strong>) vollständig nutzbar. Danach wird das System automatisch deaktiviert.</p>
                      <p style="font-size:16px;line-height:1.5;">Schade, dass du uns verlässt! Wenn du es dir anders überlegst, kannst du dein Abonnement jederzeit vor Ablauf im Stripe-Kundenportal wieder reaktivieren.</p>
                      <hr style="border-color:#333;margin:30px 0;">
                      <p style="font-size:14px;color:#888;text-align:center;">Beste Grüße,<br>Dein Marketif Team</p>
                    </div>
                  `,
                });
              }
            } catch (err) {
              console.error('[WEBHOOK ERROR] Failed to fetch customer for cancel email:', err);
            }
          }
        } else if (sub.status === 'active') {
          const updateObj: any = { is_active: true, subscription_status: 'active' };
          const periodEnd = (sub as any).current_period_end;
          if (periodEnd) {
             updateObj.current_period_end = new Date(periodEnd * 1000).toISOString();
          }

          const { error: updateErr } = await db
            .from('merchants_loyality')
            .update(updateObj)
            .eq('id', merchantId);

          if (updateErr) {
            console.error('[WEBHOOK ERROR] Failed to update merchants_loyality for active:', updateErr);
          }

          if (justReactivated) {
            // Admin Email
            await safeEmail({
              to: 'kontakt@marketif.de',
              subject: `🟢 Abo reaktiviert: Merchant ID ${merchantId}`,
              html: `<p>Ein Händler hat seine Kündigung zurückgezogen. Das Abo läuft normal weiter.</p>
                     <p>Merchant ID: ${merchantId}</p>`,
            });

            // Customer Email
            try {
              const customerInfo = await stripe.customers.retrieve(customerId) as Stripe.Customer;
              if (customerInfo.email) {
                const userName = customerInfo.name || 'Händler';
                await safeEmail({
                  to: customerInfo.email,
                  subject: `Marketif Treue Abonnement reaktiviert!`,
                  html: `
                    <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#ffffff;background-color:#0a0a0a;border-radius:12px;border:1px solid #333;">
                      <div style="text-align:center;margin-bottom:20px;">
                        <h1 style="color:#8097ff;margin:0;">Marketif <span style="color:#ffffff;">Treue</span></h1>
                      </div>
                      <p style="font-size:16px;line-height:1.5;">Hallo ${userName},</p>
                      <p style="font-size:16px;line-height:1.5;">großartige Neuigkeiten: Dein Marketif Treue Abonnement wurde erfolgreich reaktiviert!</p>
                      <p style="font-size:16px;line-height:1.5;">Du kannst dein System wie gewohnt weiter nutzen und musst dir keine Sorgen über eine Unterbrechung machen.</p>
                      <p style="font-size:16px;line-height:1.5;">Wir freuen uns sehr, dass du weiterhin dabei bist.</p>
                      <hr style="border-color:#333;margin:30px 0;">
                      <p style="font-size:14px;color:#888;text-align:center;">Beste Grüße,<br>Dein Marketif Team</p>
                    </div>
                  `,
                });
              }
            } catch (err) {
              console.error('[WEBHOOK ERROR] Failed to fetch customer for reactivation email:', err);
            }
          }
        }
        break;
      }

      // ── Zahlung fehlgeschlagen ───────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const merchantId = await getMerchantId(customerId);
        if (merchantId) {
          await db
            .from('merchants_loyality')
            .update({ subscription_status: 'payment_failed' })
            .eq('id', merchantId);
        }
        break;
      }
    }
  } catch (err: any) {
    console.error('Webhook handler error:', err.message, err.stack);
    return NextResponse.json(
      { error: err.message ?? 'Unknown error', details: err.stack },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
