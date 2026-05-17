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
    switch (event.type) {

      // ── Checkout erfolgreich abgeschlossen ───────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        if (customerId) {
          await db.from('merchants_loyality').update({
            is_active: true,
            subscription_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId ?? null,
          }).eq('stripe_customer_id', customerId);
        }
        break;
      }

      // ── Abo gekündigt (sofort oder nach Ablauf) ──────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        if (customerId) {
          await db.from('merchants_loyality').update({
            is_active: false,
            subscription_status: 'cancelled',
          }).eq('stripe_customer_id', customerId);
          console.log(`Merchant deactivated — Stripe customer: ${customerId}`);
        }
        break;
      }

      // ── Abo-Status geändert (z. B. Kündigung zum Periodenende geplant) ───────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        if (!customerId) break;

        if (sub.cancel_at_period_end) {
          // Kündigung ist angesetzt — Händler bleibt aktiv bis Periodenende
          await db.from('merchants_loyality').update({
            subscription_status: 'cancels_at_period_end',
          }).eq('stripe_customer_id', customerId);
        } else if (sub.status === 'active') {
          await db.from('merchants_loyality').update({
            is_active: true,
            subscription_status: 'active',
          }).eq('stripe_customer_id', customerId);
        }
        break;
      }

      // ── Zahlung fehlgeschlagen ───────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          await db.from('merchants_loyality').update({
            subscription_status: 'payment_failed',
          }).eq('stripe_customer_id', customerId);
          // is_active bleibt true — Stripe versucht automatisch mehrfach erneut.
          // Nach allen Versuchen kommt customer.subscription.deleted → dann deaktivieren.
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
