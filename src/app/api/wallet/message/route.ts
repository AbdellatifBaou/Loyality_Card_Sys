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
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
