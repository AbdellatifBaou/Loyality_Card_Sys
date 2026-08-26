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
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error }, { status: 401 });
    }

    const adminSupabase = getAdminSupabase();

    const [
      { count: cc },
      { count: ec },
      { count: rc },
      { data: activity },
      { data: cust },
      { data: merchants },
      { data: recentStamps }
    ] = await Promise.all([
      adminSupabase.from('customers_loyality').select('*', { count: 'exact', head: true }),
      adminSupabase.from('stamps_loyality').select('*', { count: 'exact', head: true }).eq('type', 'earn'),
      adminSupabase.from('stamps_loyality').select('*', { count: 'exact', head: true }).eq('type', 'redeem'),
      adminSupabase.from('stamps_loyality').select('*, customers_loyality(wallet_object_id, merchants_loyality(name, primary_color))').order('created_at', { ascending: false }).limit(10),
      adminSupabase.from('customers_loyality').select('id, wallet_object_id, points, created_at, merchant_id, merchants_loyality(name, primary_color, slug)').order('created_at', { ascending: false }),
      adminSupabase.from('merchants_loyality').select('*, merchant_billing(stripe_subscription_id), staff_loyality(name, pin)'),
      adminSupabase.from('stamps_loyality').select('*, customers_loyality!inner(merchant_id)').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    const formattedMerchants = (merchants || []).map((m: any) => {
      const adminStaff = (m.staff_loyality || []).find((s: any) => s.name?.toLowerCase().includes('admin')) || (m.staff_loyality || [])[0];
      return {
        admin_pin: adminStaff?.pin || 'N/A',
      ...m,
      stripe_subscription_id: m.merchant_billing?.[0]?.stripe_subscription_id || m.merchant_billing?.stripe_subscription_id || null
    }; });

    return NextResponse.json({
      success: true,
      data: {
        customerCount: cc || 0,
        earnCount: ec || 0,
        redeemCount: rc || 0,
        recentActivity: activity || [],
        customers: cust || [],
        merchants: formattedMerchants,
        recentStamps: recentStamps || []
      }
    });
  } catch (error: any) {
    console.error('Admin Global API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
