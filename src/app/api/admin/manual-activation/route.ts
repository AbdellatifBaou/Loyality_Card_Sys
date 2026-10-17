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
    const { merchantId, months, customEndDate } = await req.json();

    const authValidation = await validateAuth(req);
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error }, { status: 401 });
    }

    if (!merchantId || (!months && !customEndDate)) {
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

    // Fetch merchant data to check existing period and push_settings
    const { data: mData } = await adminSupabase
      .from('merchants_loyality')
      .select('push_settings, current_period_end')
      .eq('id', merchantId)
      .single();
    const currentPush = mData?.push_settings || {};

    // Nahtlose Verlängerung:
    // - Wenn überfällig (z. B. seit 7 Tagen): Ab dem originalen Fälligkeitsdatum verlängern (keine geschenkten Tage!)
    // - Wenn vorab bezahlt (Resttage vorhanden): Resttage bleiben erhalten, neuer Zeitraum wird angehängt
    const now = new Date();
    const existingEnd = mData?.current_period_end ? new Date(mData.current_period_end) : null;
    const addMonths = parseInt(months || '1', 10);

    let newEndDate: Date;

    if (customEndDate) {
      newEndDate = new Date(customEndDate);
    } else if (existingEnd) {
      const candidateDate = new Date(existingEnd);
      candidateDate.setMonth(candidateDate.getMonth() + addMonths);

      // Falls das candidateDate in der Zukunft liegt, nahtlos ab dem bisherigen Fälligkeitsdatum verlängern!
      if (candidateDate > now) {
        newEndDate = candidateDate;
      } else {
        // Falls das bisherige Datum uralt ist (viele Monate abgelaufen), ab heute für die gewählten Monate starten
        const freshDate = new Date(now);
        freshDate.setMonth(freshDate.getMonth() + addMonths);
        newEndDate = freshDate;
      }
    } else {
      const freshDate = new Date(now);
      freshDate.setMonth(freshDate.getMonth() + addMonths);
      newEndDate = freshDate;
    }

    const currentPeriodEnd = newEndDate;


    const { error } = await adminSupabase
      .from('merchants_loyality')
      .update({
        is_active: true,
        subscription_status: 'active',
        current_period_end: currentPeriodEnd.toISOString(),
        push_settings: {
          ...currentPush,
          setup_fee_paid: true,
        },
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
