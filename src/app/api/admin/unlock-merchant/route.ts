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
    const authValidation = await validateAuth(req);
    if (!authValidation.authorized || !authValidation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const { merchantId } = await req.json();
    if (!merchantId) {
      return NextResponse.json({ error: 'Merchant ID is required.' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { error } = await adminSupabase
      .from('merchants_loyality')
      .update({
        failed_login_attempts: 0,
        lockout_until: null
      })
      .eq('id', merchantId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Merchant successfully unlocked.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
