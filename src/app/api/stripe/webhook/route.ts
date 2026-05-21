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

        if (sub.cancel_at_period_end) {
          const updateObj: any = { subscription_status: 'cancels_at_period_end' };
          const periodEnd = (sub as any).current_period_end;
          if (periodEnd) {
             updateObj.current_period_end = new Date(periodEnd * 1000).toISOString();
          }

          await db
            .from('merchants_loyality')
            .update(updateObj)
            .eq('id', merchantId);

          // Only email when cancel_at_period_end just flipped to true
          if (prev.cancel_at_period_end === false) {
            await safeEmail({
              to: 'kontakt@marketif.de',
              subject: `⚠️ Abo-Kündigung geplant: Merchant ID ${merchantId}`,
              html: `<p>Ein Händler hat sein Abo zum Periodenende gekündigt.</p>
                     <p>Merchant ID: ${merchantId}</p>
                     <p>Service endet am: ${periodEnd ? new Date(periodEnd * 1000).toLocaleDateString('de-DE') : 'Unbekannt'}</p>`,
            });
          }
        } else if (sub.status === 'active') {
          const updateObj: any = { is_active: true, subscription_status: 'active' };
          const periodEnd = (sub as any).current_period_end;
          if (periodEnd) {
             updateObj.current_period_end = new Date(periodEnd * 1000).toISOString();
          }

          await db
            .from('merchants_loyality')
            .update(updateObj)
            .eq('id', merchantId);

          // Only email when cancel_at_period_end just flipped back to false (reactivation)
          if (prev.cancel_at_period_end === true) {
            await safeEmail({
              to: 'kontakt@marketif.de',
              subject: `🟢 Abo reaktiviert: Merchant ID ${merchantId}`,
              html: `<p>Ein Händler hat seine Kündigung zurückgezogen. Das Abo läuft normal weiter.</p>
                     <p>Merchant ID: ${merchantId}</p>`,
            });
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
