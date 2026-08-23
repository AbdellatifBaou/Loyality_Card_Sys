import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getAdminSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { password, merchantId, newPin } = await req.json();

    if (password !== '2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
