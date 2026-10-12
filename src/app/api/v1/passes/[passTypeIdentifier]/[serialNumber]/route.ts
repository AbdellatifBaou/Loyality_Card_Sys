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

    // Check If-Modified-Since header per Apple PassKit spec
    const ifModifiedSinceHeader = req.headers.get('if-modified-since');

    // Determine accurate modification timestamp from latest stamp (or customer creation)
    const { data: latestStamp } = await adminSupabase
      .from('stamps_loyality')
      .select('created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const customerUpdated = latestStamp?.created_at || customer.created_at || new Date().toISOString();
    const customerLastModifiedDate = new Date(customerUpdated);
    const lastModifiedSec = Math.floor(customerLastModifiedDate.getTime() / 1000);

    if (ifModifiedSinceHeader) {
      const ifModifiedSinceDate = new Date(ifModifiedSinceHeader);
      const ifModifiedSinceSec = Math.floor(ifModifiedSinceDate.getTime() / 1000);

      if (!isNaN(ifModifiedSinceSec) && lastModifiedSec <= ifModifiedSinceSec) {
        console.log(`[Apple PassKit] Pass ${serialNumber} unchanged since ${ifModifiedSinceHeader}, returning 304 Not Modified`);
        const logs = ((globalThis as any).__appleLogs = (globalThis as any).__appleLogs || []);
        logs.unshift({
          timestamp: new Date().toISOString(),
          type: 'pass_304_not_modified',
          serialNumber,
          points: customer.points,
          ifModifiedSince: ifModifiedSinceHeader,
        });
        if (logs.length > 50) logs.pop();

        return new Response(null, {
          status: 304,
          headers: {
            'Last-Modified': new Date(lastModifiedSec * 1000).toUTCString(),
          },
        });
      }
    }

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
      ifModifiedSince: ifModifiedSinceHeader || 'none',
    });
    if (logs.length > 50) logs.pop();

    return new Response(new Uint8Array(pkpassBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Length': pkpassBuffer.length.toString(),
        'Last-Modified': new Date(lastModifiedSec * 1000).toUTCString(),
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