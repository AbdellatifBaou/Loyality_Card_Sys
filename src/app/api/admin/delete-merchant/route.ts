import { NextResponse } from 'next/server';

function getAdminSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { password, merchantId } = await req.json();

    if (password !== '2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!merchantId) {
      return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // 1. Delete stamps
    await adminSupabase.from('stamps_loyality').delete().eq('merchant_id', merchantId);

    // 2. Delete customers
    await adminSupabase.from('customers_loyality').delete().eq('merchant_id', merchantId);

    // 3. Delete staff
    await adminSupabase.from('staff_loyality').delete().eq('merchant_id', merchantId);

    // 4. Delete billing
    await adminSupabase.from('merchant_billing').delete().eq('merchant_id', merchantId);

    // Get the merchant to see if they have a logo
    const { data: merchantData } = await adminSupabase.from('merchants_loyality').select('logo_url').eq('id', merchantId).single();

    // 5. Delete merchant
    const { error: merchantError } = await adminSupabase
      .from('merchants_loyality')
      .delete()
      .eq('id', merchantId);

    if (merchantError) throw merchantError;

    // 6. Delete logo if exists
    if (merchantData?.logo_url) {
      try {
        const urlObj = new URL(merchantData.logo_url);
        const pathParts = urlObj.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        if (fileName) {
          await adminSupabase.storage.from('logos').remove([fileName]);
        }
      } catch (e) {
        console.error('Failed to delete logo', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Merchant API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
