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
    const { merchantId } = await req.json();

    const authValidation = await validateAuth(req);
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error }, { status: 401 });
    }

    if (!merchantId) {
      return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // 1. Fetch all customers for this merchant
    const { data: merchantCustomers } = await adminSupabase
      .from('customers_loyality')
      .select('id, wallet_object_id')
      .eq('merchant_id', merchantId);

    const customerIds = (merchantCustomers || []).map((c: any) => c.id).filter(Boolean);
    const walletObjectIds = (merchantCustomers || []).map((c: any) => c.wallet_object_id).filter(Boolean);
    const allSerials = Array.from(new Set([...customerIds, ...walletObjectIds]));

    // 2. Invalidate Google Wallet passes (fire-and-forget)
    if (walletObjectIds.length > 0) {
      try {
        const { invalidateLoyaltyObject } = require('@/lib/google-wallet');
        walletObjectIds.forEach(id => invalidateLoyaltyObject(id).catch(console.error));
      } catch (gErr) {
        console.warn('Google Wallet batch invalidate skipped:', gErr);
      }
    }

    // 3. Delete stamps for these customers
    if (customerIds.length > 0) {
      await adminSupabase.from('stamps_loyality').delete().in('customer_id', customerIds);
    }

    // 4. Delete Apple Wallet registrations
    if (allSerials.length > 0) {
      await adminSupabase.from('apple_device_registrations_loyality').delete().in('serial_number', allSerials);
    }

    // 5. Delete marketing messages
    await adminSupabase.from('messages_loyality').delete().eq('merchant_id', merchantId);

    // 6. Delete customers
    await adminSupabase.from('customers_loyality').delete().eq('merchant_id', merchantId);

    // 7. Delete staff
    await adminSupabase.from('staff_loyality').delete().eq('merchant_id', merchantId);

    // 8. Delete billing
    await adminSupabase.from('merchant_billing').delete().eq('merchant_id', merchantId);

    // 9. Delete merchant
    const { error: dbError } = await adminSupabase.from('merchants_loyality').delete().eq('id', merchantId);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Merchant API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
