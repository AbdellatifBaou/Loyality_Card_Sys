import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateAuth } from '@/lib/auth';

// Helper to create a Supabase client with the Service Role Key for admin operations
function getAdminSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { merchantId, months } = await req.json();

    const authValidation = await validateAuth(req);
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error }, { status: 401 });
    }

    if (!merchantId || !months) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // 1. Hole den Händler, um zu schauen, ob er ein aktives Stripe Abo hat
    const { data: billing } = await adminSupabase
      .from('merchant_billing')
      .select('stripe_subscription_id')
      .eq('merchant_id', merchantId)
      .single();

    if (billing?.stripe_subscription_id && billing.stripe_subscription_id.startsWith('sub_')) {
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2023-10-16', // using fallback or latest
        });
        await stripe.subscriptions.cancel(billing.stripe_subscription_id);
        console.log(`Canceled Stripe subscription ${billing.stripe_subscription_id} for manual activation`);
      } catch (stripeError) {
        console.error('Failed to cancel old stripe subscription:', stripeError);
        // We continue anyway, so the merchant gets activated locally.
      }
    }

    // Calculate new end date based on current date + months
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + parseInt(months, 10));

    // Update merchant status
    const { error } = await adminSupabase
      .from('merchants_loyality')
      .update({
        is_active: true,
        subscription_status: 'active',
        current_period_end: currentPeriodEnd.toISOString(),
      })
      .eq('id', merchantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update billing record
    await adminSupabase
      .from('merchant_billing')
      .upsert({
        merchant_id: merchantId,
        stripe_subscription_id: 'manual_invoice'
      }, { onConflict: 'merchant_id' });

    return NextResponse.json({ success: true, current_period_end: currentPeriodEnd.toISOString() });
  } catch (error: any) {
    console.error('Manual Activation API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
