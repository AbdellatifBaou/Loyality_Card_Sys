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
      .select('merchant_id')
      .eq('id', customerId)
      .single();

    if (customerLookupError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const authValidation = await validateAuth(req, customer.merchant_id);
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error }, { status: 401 });
    }

    // 1. Delete stamps
    const { error: stampError } = await adminSupabase
      .from('stamps_loyality')
      .delete()
      .eq('customer_id', customerId);

    if (stampError) throw stampError;

    // 2. Delete customer
    const { error: customerError } = await adminSupabase
      .from('customers_loyality')
      .delete()
      .eq('id', customerId);

    if (customerError) throw customerError;

    // 3. Invalidate Google Wallet Object (Fire & Forget)
    import('@/lib/google-wallet').then(({ invalidateLoyaltyObject }) => {
      invalidateLoyaltyObject(customerId).catch(console.error);
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Customer API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
