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

    // 1. Fetch customer by serialNumber (wallet_object_id or id)
    let { data: customer } = await adminSupabase
      .from('customers_loyality')
      .select('*, merchants_loyality(*)')
      .eq('wallet_object_id', serialNumber)
      .maybeSingle();

    if (!customer) {
      const { data: customerById } = await adminSupabase
        .from('customers_loyality')
        .select('*, merchants_loyality(*)')
        .eq('id', serialNumber)
        .maybeSingle();
      customer = customerById;
    }

    if (!customer || !customer.merchants_loyality) {
      return NextResponse.json({ error: `Pass not found for serial: ${serialNumber}` }, { status: 404 });
    }

    const merchant = customer.merchants_loyality;

    // Ensure serialNumber in pass.json matches the exact serialNumber requested by Apple Wallet
    customer.wallet_object_id = serialNumber;

    // 2. Generate updated .pkpass
    const pkpassBuffer = await generatePkPass(merchant, customer);

    console.log(`[Apple PassKit] Serving updated pass for ${serialNumber} to Apple Wallet (points: ${customer.points}, size: ${pkpassBuffer.length} bytes)`);

    const logs = ((globalThis as any).__appleLogs = (globalThis as any).__appleLogs || []);
    logs.unshift({
      timestamp: new Date().toISOString(),
      type: 'pass_download',
      serialNumber,
      points: customer.points,
      userAgent: req.headers.get('user-agent')?.slice(0, 40),
      ifModifiedSince: req.headers.get('if-modified-since') || 'none',
    });
    if (logs.length > 50) logs.pop();

    return new Response(new Uint8Array(pkpassBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Length': pkpassBuffer.length.toString(),
        'Last-Modified': new Date().toUTCString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    console.error('Apple PassKit Get Pass Error:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}