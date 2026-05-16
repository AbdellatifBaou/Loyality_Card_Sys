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
    const { merchantId, isActive } = await req.json();

    if (!merchantId) {
      return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { error } = await adminSupabase
      .from('merchants_loyality')
      .update({ is_active: isActive })
      .eq('id', merchantId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Toggle Merchant API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
