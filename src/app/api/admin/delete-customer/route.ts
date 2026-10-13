import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

function getAdminSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return NextResponse.json({ error: 'Missing customerId' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { data: customer, error: customerLookupError } = await adminSupabase
      .from('customers_loyality')
      .select('merchant_id, wallet_object_id')
      .eq('id', customerId)
      .single();

    if (customerLookupError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const authValidation = await validateAuth(req, customer.merchant_id);
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error }, { status: 401 });
    }

    const walletObjectId = customer.wallet_object_id || customerId;

    // 1. Notify Apple Wallet devices BEFORE deleting registration tokens so the APNs push goes through
    try {
      const { notifyApplePassUpdate } = require('@/lib/apple-pass-registry');
      await notifyApplePassUpdate(walletObjectId);
      if (customerId !== walletObjectId) {
        await notifyApplePassUpdate(customerId);
      }
    } catch (e: any) {
      console.warn('[Delete Customer] Apple Wallet notification skipped:', e?.message || e);
    }

    // 2. Invalidate Google Wallet Object (Sets state to EXPIRED)
    try {
      const { invalidateLoyaltyObject } = require('@/lib/google-wallet');
      await invalidateLoyaltyObject(walletObjectId);
    } catch (gErr: any) {
      console.warn('[Delete Customer] Google Wallet invalidate skipped:', gErr?.message || gErr);
    }

    // 3. Delete Apple Device Registrations
    await adminSupabase
      .from('apple_device_registrations_loyality')
      .delete()
      .or(`serial_number.eq.${customerId},serial_number.eq.${walletObjectId}`);

    // 4. Delete stamps
    const { error: stampError } = await adminSupabase
      .from('stamps_loyality')
      .delete()
      .eq('customer_id', customerId);

    if (stampError) throw stampError;

    // 5. Delete customer
    const { error: customerError } = await adminSupabase
      .from('customers_loyality')
      .delete()
      .eq('id', customerId);

    if (customerError) throw customerError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Customer API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
