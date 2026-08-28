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

  // Fetch all customers (including points) from active merchants
  const { data: customers, error } = await db
    .from('customers_loyality')
    .select('id, wallet_object_id, points, last_miss_you_sent_at, merchants_loyality!inner(name, is_active, push_settings)');

  if (error) {
    console.error('Cron DB error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!customers?.length) return NextResponse.json({ success: true, sentCount: 0 });

  let skippedCount = 0;
  
  // 1. Filter out inactive merchants and customers who received a ping recently
  const eligibleCustomers = customers.filter(customer => {
    const merchant = customer.merchants_loyality as any;
    if (!merchant?.is_active) { skippedCount++; return false; }
    
    if (customer.last_miss_you_sent_at) {
      const lastSent = new Date(customer.last_miss_you_sent_at);
      if (lastSent > sixtyDaysAgo) { skippedCount++; return false; }
    }
    return true;
  });

  if (eligibleCustomers.length === 0) {
    return NextResponse.json({ success: true, sentCount: 0, skippedCount });
  }

  // 2. Find customers who stamped recently (in the last 30 days)
  const { data: recentStamps, error: stampErr } = await db
    .from('stamps_loyality')
    .select('customer_id')
    .gte('created_at', thirtyDaysAgo.toISOString());
    
  if (stampErr) {
    return NextResponse.json({ error: stampErr.message }, { status: 500 });
  }

  const recentCustomerIds = new Set(recentStamps?.map(s => s.customer_id) || []);

  // 3. Keep only customers who are INACTIVE (not in recentCustomerIds)
  const inactiveCustomers = eligibleCustomers.filter(c => {
    if (recentCustomerIds.has(c.id)) {
      skippedCount++;
      return false;
    }
    return true;
  });

  // 4. To avoid sending to people who NEVER visited (just downloaded the card), 
  // we must confirm they have at least 1 stamp ever.
  // Customers with points > 0 definitely visited.
  const knownActive = inactiveCustomers.filter(c => (c as any).points > 0);
  
  // Customers with 0 points might have redeemed a reward or never visited. We check these in chunks.
  const needingCheck = inactiveCustomers.filter(c => (c as any).points === 0);
  const everVisitedSet = new Set<string>();
  
  for (let i = 0; i < needingCheck.length; i += 500) {
    const chunk = needingCheck.slice(i, i + 500).map(c => c.id);
    const { data: stampsChunk } = await db
      .from('stamps_loyality')
      .select('customer_id')
      .in('customer_id', chunk);
      
    stampsChunk?.forEach(s => everVisitedSet.add(s.customer_id));
  }
  
  const finalCustomersToNotify = [
    ...knownActive,
    ...needingCheck.filter(c => {
      if (everVisitedSet.has(c.id)) return true;
      skippedCount++;
      return false;
    })
  ];

  const issuerId = process.env.GOOGLE_ISSUER_ID;
  let sentCount = 0;

  // 5. Send push notifications
  for (const customer of finalCustomersToNotify) {
    const merchant = customer.merchants_loyality as any;
    try {
      const push = merchant.push_settings || {};
      const customHeader = push.miss_you_header || `Wir vermissen dich bei ${merchant.name}! 👋`;
      const customBody = push.miss_you_body || 'Du warst schon länger nicht mehr da. Komm vorbei und zeige deine Karte — deine Stempel warten!';

      await walletClient.loyaltyobject.addmessage({
        resourceId: `${issuerId}.${customer.wallet_object_id}`,
        requestBody: {
          message: {
            header: customHeader,
            body: customBody,
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
