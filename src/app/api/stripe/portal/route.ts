import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia',
});

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { merchantId } = await req.json();

    if (!merchantId) {
      return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 });
    }

    const adminSupabase = getAdmin();

    const { data: billing, error } = await adminSupabase
      .from('merchant_billing')
      .select('stripe_customer_id')
      .eq('merchant_id', merchantId)
      .single();

    if (error || !billing || !billing.stripe_customer_id) {
      return NextResponse.json({ error: 'Billing details not found or no active customer' }, { status: 404 });
    }

    const { data: merchant } = await adminSupabase
      .from('merchants_loyality')
      .select('slug')
      .eq('id', merchantId)
      .single();

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: billing.stripe_customer_id,
        return_url: `${appUrl}/dashboard/${merchant?.slug}`,
      });
      return NextResponse.json({ url: session.url });
    } catch (portalErr: any) {
      if (portalErr.code === 'resource_missing' || portalErr.message?.includes('No such customer')) {
        await adminSupabase.from('merchant_billing').update({ stripe_customer_id: null, stripe_subscription_id: null }).eq('merchant_id', merchantId);
        return NextResponse.json({ error: 'Kunde stammte aus dem Test-Modus. Bitte Seite neu laden und "Auf automatische Zahlung umstellen" anklicken.' }, { status: 400 });
      }
      throw portalErr;
    }
  } catch (error: any) {
    console.error('Stripe Portal Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
