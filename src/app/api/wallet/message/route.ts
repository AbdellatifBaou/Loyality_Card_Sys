import { NextResponse } from 'next/server';
import { sendClassMessage } from '@/lib/google-wallet';

// Helper to create a Supabase client with the Service Role Key for admin operations
function getAdminSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { slug, header, body } = await req.json();

    if (!slug || !header || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const classId = `marketif_loyalty_${slug}`;

    // Send the message to the class
    await sendClassMessage(classId, header, body);

    // After successfully sending, log it in the database
    const adminSupabase = getAdminSupabase();
    
    // First get the merchant ID
    const { data: merchantData, error: mError } = await adminSupabase
      .from('merchants_loyality')
      .select('id')
      .eq('slug', decodeURIComponent(slug).toLowerCase())
      .single();

    if (!mError && merchantData) {
      await adminSupabase.from('messages_loyality').insert({
        merchant_id: merchantData.id,
        header,
        body
      });

      // Also trigger Apple Pass update for all customers of this merchant
      try {
        const { notifyApplePassUpdate } = require('@/lib/apple-pass-registry');
        const { data: customers } = await adminSupabase
          .from('customers_loyality')
          .select('wallet_object_id')
          .eq('merchant_id', merchantData.id);

        if (customers) {
          for (const c of customers) {
            if (c.wallet_object_id) {
              await notifyApplePassUpdate(c.wallet_object_id);
            }
          }
        }
      } catch (aErr: any) {
        console.warn('[Broadcast Message] Apple Wallet notification skipped:', aErr?.message || aErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
