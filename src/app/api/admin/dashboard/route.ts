import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    const { slug, password } = await req.json();

    if (!slug || password !== '2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = getAdminSupabase();

    // 1. Get Merchant info
    const { data: merchantData, error: mError } = await adminSupabase
      .from('merchants_loyality')
      .select('*')
      .eq('slug', decodeURIComponent(slug).toLowerCase())
      .single();

    if (mError || !merchantData) {
      return NextResponse.json({ error: 'Händler nicht gefunden' }, { status: 404 });
    }

    // 2. Fetch all required specific data for this merchant
    const [
      { count: cc },
      { data: earnStamps },
      { data: redeemStamps },
      { data: activity },
      { data: cust },
      { data: staffData }
    ] = await Promise.all([
      adminSupabase.from('customers_loyality').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantData.id),
      adminSupabase.from('stamps_loyality').select('*, customers_loyality!inner(*)').eq('customers_loyality.merchant_id', merchantData.id).eq('type', 'earn'),
      adminSupabase.from('stamps_loyality').select('*, customers_loyality!inner(*)').eq('customers_loyality.merchant_id', merchantData.id).eq('type', 'redeem'),
      adminSupabase.from('stamps_loyality').select('*, customers_loyality!inner(wallet_object_id)').eq('customers_loyality.merchant_id', merchantData.id).order('created_at', { ascending: false }).limit(10),
      adminSupabase.from('customers_loyality').select('*').eq('merchant_id', merchantData.id).order('created_at', { ascending: false }),
      adminSupabase.from('staff_loyality').select('*').eq('merchant_id', merchantData.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        merchant: merchantData,
        customerCount: cc || 0,
        earnStamps: earnStamps || [],
        redeemStamps: redeemStamps || [],
        recentActivity: activity || [],
        customers: cust || [],
        staff: staffData || [],
      }
    });
  } catch (error: any) {
    console.error('Admin Dashboard API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
