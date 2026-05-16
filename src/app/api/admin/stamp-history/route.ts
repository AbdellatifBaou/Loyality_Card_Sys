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
    const { customerId } = await req.json();

    if (!customerId) {
      return NextResponse.json({ error: 'Missing customerId' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { data, error } = await adminSupabase
      .from('stamps_loyality')
      .select('*, staff_loyality(name)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Stamp History API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
