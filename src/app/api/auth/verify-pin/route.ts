import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    const { data: staff, error } = await supabase
      .from('staff')
      .select('id, merchant_id, merchants(primary_color, logo_url, name)')
      .eq('pin', pin)
      .single();

    if (error || !staff) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      merchantId: staff.merchant_id,
      merchant: staff.merchants 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
