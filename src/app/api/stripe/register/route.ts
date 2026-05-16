import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia',
});

export async function POST(req: Request) {
  try {
    const { name, company, email, phone, plan, monthlyPrice, planName } = await req.json();

    if (!name || !company || !email || !phone || !plan || !monthlyPrice || !planName) {
      return NextResponse.json({ error: 'Fehlende Pflichtfelder' }, { status: 400 });
    }

    const monthly = parseFloat(monthlyPrice);
    if (isNaN(monthly) || monthly < 1) {
      return NextResponse.json({ error: 'Ungültiger monatlicher Preis' }, { status: 400 });
    }

    const stripe = getStripe();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

    const customer = await stripe.customers.create({
      name: `${name} – ${company}`,
      email,
      phone,
      metadata: { name, company, plan },
    });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        // One-time setup fee — shown clearly in checkout, charged only on first invoice
        {
          price_data: {
            currency: 'eur',
            product_data: { name: 'Einmalige Einrichtungsgebühr – Marketif Treue' },
            unit_amount: 29900, // 299 EUR in cents
          },
          quantity: 1,
        },
        // Monthly subscription
        {
          price_data: {
            currency: 'eur',
            product_data: { name: `Marketif Treue – ${planName}` },
            unit_amount: Math.round(monthly * 100),
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      metadata: { name, company, email, phone, plan, planName },
      success_url: `${appUrl}/registrierung?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/registrierung?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Register Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
