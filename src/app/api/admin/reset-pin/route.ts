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

    const { merchantId, newPin } = await req.json();

    if (!merchantId || !newPin) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // Find the admin staff member for this merchant
    const { data: staffList } = await adminSupabase.from('staff_loyality').select('*').eq('merchant_id', merchantId);
    let adminStaff = (staffList || []).find((s: any) => s.name?.toLowerCase().includes('admin'));
    if (!adminStaff && staffList && staffList.length > 0) {
        adminStaff = staffList[0];
    }

    if (adminStaff) {
      const { error } = await adminSupabase.from('staff_loyality').update({ pin: newPin }).eq('id', adminStaff.id);
      if (error) throw error;
    } else {
        // Create one if none exists
        const { error } = await adminSupabase.from('staff_loyality').insert({ merchant_id: merchantId, name: 'Admin', pin: newPin });
        if (error) throw error;
    }

    // Also auto-unlock merchant on PIN reset
    await adminSupabase.from('merchants_loyality').update({
      failed_login_attempts: 0,
      lockout_until: null
    }).eq('id', merchantId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
