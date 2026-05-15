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

    // Hole den Händler aus der Datenbank
    const { data: merchant, error: mError } = await supabase
      .from('merchants_loyality')
      .select('*')
      .eq('id', merchantId)
      .single();

    if (mError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    let customerId = merchant.stripe_customer_id;

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
      await supabase
        .from('merchants_loyality')
        .update({ stripe_customer_id: customerId })
        .eq('id', merchantId);
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
