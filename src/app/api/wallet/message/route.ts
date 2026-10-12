import { NextResponse } from 'next/server';
import { sendClassMessage } from '@/lib/google-wallet';
import { getAdminSupabase } from '@/lib/supabase';
import { notifyApplePassUpdate } from '@/lib/apple-pass-registry';

export async function POST(req: Request) {
  try {
    const { slug, header, body } = await req.json();

    if (!slug || !header || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cleanSlug = decodeURIComponent(slug).toLowerCase();
    const adminSupabase = getAdminSupabase();

    // 1. Google Wallet (Class message)
    try {
      const classId = `marketif_loyalty_${cleanSlug}`;
      await sendClassMessage(classId, header, body);
    } catch (gErr: any) {
      console.warn('[Broadcast Message] Google Wallet class message skipped or failed:', gErr?.message || gErr);
    }

    // 2. Fetch merchant ID
    const { data: merchantData, error: mError } = await adminSupabase
      .from('merchants_loyality')
      .select('id')
      .eq('slug', cleanSlug)
      .single();

    if (mError || !merchantData) {
      return NextResponse.json({ error: 'Händler nicht gefunden' }, { status: 404 });
    }

    // 3. Log marketing message in database
    const { error: insertError } = await adminSupabase.from('messages_loyality').insert({
      merchant_id: merchantData.id,
      header,
      body
    });

    if (insertError) {
      console.error('[Broadcast Message] Insert error:', insertError.message);
    }

    // 4. Trigger Apple Pass update for all registered customers of this merchant
    try {
      const { data: customers } = await adminSupabase
        .from('customers_loyality')
        .select('id, wallet_object_id')
        .eq('merchant_id', merchantData.id);

      if (customers && customers.length > 0) {
        const serials = new Set<string>();
        for (const c of customers) {
          if (c.wallet_object_id) serials.add(c.wallet_object_id);
          if (c.id) serials.add(c.id);
        }

        console.log(`[Broadcast Message] Triggering Apple Pass push for ${serials.size} serial(s)...`);
        await Promise.allSettled(Array.from(serials).map(serial => notifyApplePassUpdate(serial)));
      }
    } catch (aErr: any) {
      console.warn('[Broadcast Message] Apple Wallet notification skipped:', aErr?.message || aErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
