import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { walletClient } from '@/lib/google-wallet';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Fetch all customers (any point count) from active merchants
  const { data: customers, error } = await db
    .from('customers_loyality')
    .select('id, wallet_object_id, last_miss_you_sent_at, merchants_loyality!inner(name, is_active)');

  if (error) {
    console.error('Cron DB error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!customers?.length) return NextResponse.json({ success: true, sentCount: 0 });

  const issuerId = process.env.GOOGLE_ISSUER_ID;
  let sentCount = 0;
  let skippedCount = 0;

  for (const customer of customers) {
    const merchant = customer.merchants_loyality as any;

    // Skip inactive merchants
    if (!merchant?.is_active) { skippedCount++; continue; }

    // Skip if we already sent one within the last 60 days
    if (customer.last_miss_you_sent_at) {
      const lastSent = new Date(customer.last_miss_you_sent_at);
      if (lastSent > sixtyDaysAgo) { skippedCount++; continue; }
    }

    // Check their most recent stamp
    const { data: latestStamp } = await db
      .from('stamps_loyality')
      .select('created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // No stamps at all → skip (just joined, never visited)
    if (!latestStamp) { skippedCount++; continue; }

    const lastStampDate = new Date(latestStamp.created_at);
    if (lastStampDate >= thirtyDaysAgo) { skippedCount++; continue; }

    // 30+ days inactive → send wallet push notification
    try {
      await walletClient.loyaltyobject.addmessage({
        resourceId: `${issuerId}.${customer.wallet_object_id}`,
        requestBody: {
          message: {
            header: `Wir vermissen dich bei ${merchant.name}! 👋`,
            body: 'Du warst schon länger nicht mehr da. Komm vorbei und zeige deine Karte — deine Stempel warten!',
            id: `WE_MISS_YOU_${Date.now()}_${customer.id.substring(0, 8)}`,
            messageType: 'TEXT_AND_NOTIFY',
          },
        },
      });

      await db
        .from('customers_loyality')
        .update({ last_miss_you_sent_at: new Date().toISOString() })
        .eq('id', customer.id);

      sentCount++;
    } catch (e: any) {
      console.error(`Failed to notify customer ${customer.id}:`, e.message);
    }
  }

  console.log(`We-miss-you cron: sent=${sentCount}, skipped=${skippedCount}`);
  return NextResponse.json({ success: true, sentCount, skippedCount });
}
