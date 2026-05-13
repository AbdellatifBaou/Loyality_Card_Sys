import { NextResponse } from 'next/server';
import { walletClient } from '@/lib/google-wallet';

export async function GET(req: Request) {
  // 1. Verify Vercel Cron Secret (Security)
  // In production, Vercel sends this header. For local testing, we can bypass or set it.
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calculate dates
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Get all customers with points > 0
    const { data: customers, error } = await adminSupabase
      .from('customers_loyality')
      .select('id, wallet_object_id, last_miss_you_sent_at, merchant_id, merchants_loyality!inner(name)')
      .gt('points', 0);

    if (error) throw error;
    if (!customers || customers.length === 0) return NextResponse.json({ success: true, sentCount: 0 });

    let sentCount = 0;
    const issuerId = process.env.GOOGLE_ISSUER_ID;

    // For each customer, check their last stamp activity
    for (const customer of customers) {
      // Skip if we already sent a message recently
      if (customer.last_miss_you_sent_at) {
        const lastSent = new Date(customer.last_miss_you_sent_at);
        if (lastSent > sixtyDaysAgo) continue;
      }

      // Find their most recent stamp
      const { data: latestStamp } = await adminSupabase
        .from('stamps_loyality')
        .select('created_at')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestStamp) {
        const lastStampDate = new Date(latestStamp.created_at);
        if (lastStampDate < thirtyDaysAgo) {
          // They haven't been here in 30 days! Send message.
          const merchantName = (customer.merchants_loyality as any).name;
          
          const message = {
            header: `Wir vermissen dich bei ${merchantName}! 🍕`,
            body: 'Du hast noch offene Stempel. Komm diese Woche vorbei und zeige deine Karte an der Kasse!',
            id: `WE_MISS_YOU_${Date.now()}`,
            messageType: 'TEXT_AND_NOTIFY'
          };

          try {
            await walletClient.loyaltyobject.addmessage({
              resourceId: `${issuerId}.${customer.wallet_object_id}`,
              requestBody: { message }
            });

            // Update database to remember we sent it
            await adminSupabase
              .from('customers_loyality')
              .update({ last_miss_you_sent_at: new Date().toISOString() })
              .eq('id', customer.id);

            sentCount++;
          } catch (e: any) {
            console.error(`Failed to send miss-you to ${customer.id}:`, e.message);
          }
        }
      }
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
