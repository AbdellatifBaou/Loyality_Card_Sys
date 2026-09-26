import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { generatePkPass } from '@/lib/apple-wallet';

export async function GET(
  req: Request,
  context: { params: Promise<{ passTypeIdentifier: string; serialNumber: string }> }
) {
  try {
    const { passTypeIdentifier, serialNumber } = await context.params;

    const adminSupabase = getAdminSupabase();

    // 1. Fetch customer by serialNumber (wallet_object_id)
    const { data: customer, error: cError } = await adminSupabase
      .from('customers_loyality')
      .select('*, merchants_loyality(*)')
      .eq('wallet_object_id', serialNumber)
      .single();

    if (cError || !customer || !customer.merchants_loyality) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    const merchant = customer.merchants_loyality;

    // 2. Generate updated .pkpass
    const pkpassBuffer = await generatePkPass(merchant, customer);

    return new Response(new Uint8Array(pkpassBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Last-Modified': new Date(customer.updated_at || Date.now()).toUTCString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    console.error('Apple PassKit Get Pass Error:', err);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}