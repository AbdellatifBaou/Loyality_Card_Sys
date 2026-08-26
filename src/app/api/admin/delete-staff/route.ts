import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

function getAdminSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { data: staff, error: staffLookupError } = await adminSupabase
      .from('staff_loyality')
      .select('merchant_id')
      .eq('id', id)
      .single();

    if (staffLookupError || !staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    const authValidation = await validateAuth(req, staff.merchant_id);
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error }, { status: 401 });
    }

    const { error } = await adminSupabase
      .from('staff_loyality')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Staff API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
