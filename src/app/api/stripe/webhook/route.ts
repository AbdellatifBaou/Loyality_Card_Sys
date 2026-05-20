import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia',
});

// Service role client — bypasses RLS for webhook writes
const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

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

  try {
    // Helper function to find merchant_id by customerId
    const getMerchantId = async (customerId: string) => {
      if (!customerId) return null;
      const { data } = await db.from('merchant_billing').select('merchant_id').eq('stripe_customer_id', customerId).single();
      return data?.merchant_id;
    };

    switch (event.type) {

      // ── Checkout erfolgreich abgeschlossen ───────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        let merchantId = await getMerchantId(customerId);
        
        // Neu-Registrierung: Wenn kein Merchant in merchant_billing gefunden wurde
        if (!merchantId && session.metadata?.company) {
          const { company, plan, name, email, phone, monthlyPrice } = session.metadata;
          const generatedSlug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          
          // Neuen Händler anlegen
          const { data: newMerchant, error: insertError } = await db.from('merchants_loyality').insert({
            name: company,
            slug: generatedSlug,
            is_active: true,
            subscription_status: 'active',
            package_type: plan, // 'custom', 'silber' oder 'gold'
            custom_price: plan === 'custom' && monthlyPrice ? parseFloat(monthlyPrice) : null,
          }).select('id').single();

          if (insertError) {
            console.error('Fehler beim Anlegen des Händlers:', insertError);
            break;
          }

          merchantId = newMerchant.id;

          // Billing Record anlegen
          await db.from('merchant_billing').insert({
            merchant_id: merchantId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId ?? null,
          });

          // E-Mail senden
          const { sendEmail } = await import('@/lib/email');
          await sendEmail({
            to: 'kontakt@marketif.de',
            subject: `🟢 Neuer Händler: ${company} (Paket: ${plan})`,
            html: `<p>Ein neuer Händler hat sich registriert und bezahlt.</p>
                   <ul>
                     <li><strong>Firma:</strong> ${company}</li>
                     <li><strong>Kontaktperson:</strong> ${name}</li>
                     <li><strong>E-Mail:</strong> ${email}</li>
                     <li><strong>Telefon:</strong> ${phone}</li>
                     <li><strong>Paket:</strong> ${plan}</li>
                     <li><strong>Dashboard Slug:</strong> ${generatedSlug}</li>
                   </ul>`,
          });
        } else if (merchantId) {
          // Bestehender Händler: Reaktivierung
          const updateData: any = {
            is_active: true,
            subscription_status: 'active',
          };
          
          if (session.metadata?.plan) {
            updateData.package_type = session.metadata.plan;
          }

          await db.from('merchants_loyality').update(updateData).eq('id', merchantId);
          
          await db.from('merchant_billing').update({
            stripe_subscription_id: subscriptionId ?? null,
          }).eq('merchant_id', merchantId);

          const { sendEmail } = await import('@/lib/email');
          await sendEmail({
            to: 'kontakt@marketif.de',
            subject: `🟢 Händler Reaktivierung: Merchant ID ${merchantId}`,
            html: `<p>Ein bestehender Händler hat sein Abo reaktiviert.</p><p>Merchant ID: ${merchantId}</p><p>Neues Paket: ${session.metadata?.plan || 'Unverändert'}</p>`,
          });
        }
        break;
      }

      // ── Abo gekündigt (sofort oder nach Ablauf) ──────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const merchantId = await getMerchantId(customerId);
        
        if (merchantId) {
          await db.from('merchants_loyality').update({
            is_active: false,
            subscription_status: 'cancelled',
          }).eq('id', merchantId);
          console.log(`Merchant deactivated — Stripe customer: ${customerId}`);
          
          const { sendEmail } = await import('@/lib/email');
          await sendEmail({
            to: 'kontakt@marketif.de',
            subject: `🔴 Abo gekündigt: Merchant ID ${merchantId}`,
            html: `<p>Ein Händler hat sein Abo gekündigt (oder es ist ausgelaufen).</p><p>Merchant ID: ${merchantId}</p>`,
          });
        }
        break;
      }

      // ── Abo-Status geändert (z. B. Kündigung zum Periodenende geplant) ───────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const merchantId = await getMerchantId(customerId);
        if (!merchantId) break;

        if (sub.cancel_at_period_end) {
          // Kündigung ist angesetzt — Händler bleibt aktiv bis Periodenende
          await db.from('merchants_loyality').update({
            subscription_status: 'cancels_at_period_end',
            current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
          }).eq('id', merchantId);
        } else if (sub.status === 'active') {
          await db.from('merchants_loyality').update({
            is_active: true,
            subscription_status: 'active',
            current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
          }).eq('id', merchantId);
        }
        break;
      }

      // ── Zahlung fehlgeschlagen ───────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const merchantId = await getMerchantId(customerId);
        if (merchantId) {
          await db.from('merchants_loyality').update({
            subscription_status: 'payment_failed',
          }).eq('id', merchantId);
        }
        break;
      }
    }
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
