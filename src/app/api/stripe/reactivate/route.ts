import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia',
});

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { merchantId, plan } = await req.json();

    if (!merchantId || !plan) {
      return NextResponse.json({ error: 'Missing merchantId or plan' }, { status: 400 });
    }

    const adminSupabase = getAdmin();

    const { data: merchant, error: mError } = await adminSupabase
      .from('merchants_loyality')
      .select('*, merchant_billing(*)')
      .eq('id', merchantId)
      .single();

    if (mError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const billingData = Array.isArray(merchant.merchant_billing) ? merchant.merchant_billing[0] : merchant.merchant_billing;
    let customerId = billingData?.stripe_customer_id;

    if (!customerId) {
      const newCustomer = await stripe.customers.create({
        name: merchant.name,
      });
      customerId = newCustomer.id;

      const { error: insertError } = await adminSupabase.from('merchant_billing').upsert({
        merchant_id: merchant.id,
        stripe_customer_id: customerId,
      }, { onConflict: 'merchant_id' });
      
      if (insertError) {
        return NextResponse.json({ error: 'Fehler beim Verknüpfen des Stripe-Kunden' }, { status: 500 });
      }
    }

    let monthly = 0;
    let planName = '';
    
    if (plan === 'silber') {
      monthly = 49;
      planName = 'Silber Paket';
    } else if (plan === 'gold') {
      monthly = 89;
      planName = 'Gold Paket';
    } else if (plan === 'custom') {
      if (!merchant.custom_price) {
        return NextResponse.json({ error: 'Kein individueller Preis hinterlegt. Bitte Support kontaktieren.' }, { status: 400 });
      }
      monthly = merchant.custom_price;
      planName = 'Custom Paket';
    } else {
      return NextResponse.json({ error: 'Invalid plan for reactivation' }, { status: 400 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    
    const lineItems: any[] = [];

    // If setup fee is configured and > 0, include one-time setup fee
    const setupFee = merchant.setup_price !== undefined && merchant.setup_price !== null ? parseFloat(merchant.setup_price) : 299;
    if (setupFee > 0 && (!billingData?.stripe_subscription_id || billingData?.stripe_subscription_id === 'manual_invoice')) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Einmalige Einrichtungsgebühr – Marketif Treue' },
          unit_amount: Math.round(setupFee * 100),
        },
        quantity: 1,
      });
    }

    // Monthly recurring subscription
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: `Marketif Treue – ${planName}` },
        unit_amount: Math.round(monthly * 100),
        recurring: { interval: 'month' },
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: lineItems,
      metadata: { 
        merchant_id: merchant.id,
        plan: plan,
        setup_fee: setupFee.toString(),
        is_reactivation: 'true' 
      },
      success_url: `${appUrl}/dashboard/${merchant.slug}?checkout=success`,
      cancel_url: `${appUrl}/dashboard/${merchant.slug}?checkout=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Reactivate Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
