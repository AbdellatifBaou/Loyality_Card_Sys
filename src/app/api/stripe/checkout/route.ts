import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// Initialisiere Stripe mit dem Secret Key (muss in .env.local gesetzt werden)
// Initialisiere Stripe lazily
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia',
});

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { merchantId, priceId } = await req.json();

    if (!merchantId || !priceId) {
      return NextResponse.json({ error: 'Missing merchantId or priceId' }, { status: 400 });
    }

    // Hole den Händler aus der Datenbank (mit Admin Rechten)
    const { createClient } = require('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: merchant, error: mError } = await adminSupabase
      .from('merchants_loyality')
      .select('*, merchant_billing(*)')
      .eq('id', merchantId)
      .single();

    if (mError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Billing data is an array if multiple, but it should be 1-to-1, or object if joined via single relationship
    // Supabase returns an array of joined tables by default unless configured otherwise.
    const billingData = Array.isArray(merchant.merchant_billing) ? merchant.merchant_billing[0] : merchant.merchant_billing;
    let customerId = billingData?.stripe_customer_id;

    // Wenn der Händler noch keinen Stripe-Kunden hat, lege einen an
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: merchant.name,
        metadata: {
          merchant_id: merchant.id,
        },
      });
      customerId = customer.id;

      // Speichere die Stripe Customer ID in Supabase
      const { error: updateError } = await adminSupabase
        .from('merchant_billing')
        .upsert({ merchant_id: merchantId, stripe_customer_id: customerId });

      if (updateError) {
        console.error('Failed to update stripe_customer_id:', updateError);
        return NextResponse.json({ error: 'Failed to update merchant billing' }, { status: 500 });
      }
    }

    // Erstelle die Checkout Session
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId, // Die Preis-ID aus dem Stripe Dashboard (z.B. price_12345...)
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard/${merchant.slug}?checkout=success`,
      cancel_url: `${appUrl}/dashboard/${merchant.slug}?checkout=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
