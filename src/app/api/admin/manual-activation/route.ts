import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    const { password, merchantId, months } = await req.json();

    if (password !== '2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!merchantId || !months) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // Calculate new end date based on current date + months
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + parseInt(months, 10));

    const { error } = await adminSupabase
      .from('merchants_loyality')
      .update({
        subscription_status: 'active',
        stripe_subscription_id: 'manual_invoice',
        current_period_end: currentPeriodEnd.toISOString(),
      })
      .eq('id', merchantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, current_period_end: currentPeriodEnd.toISOString() });
  } catch (error: any) {
    console.error('Manual Activation API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
