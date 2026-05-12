import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { pin, slug } = await req.json();

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    let query = supabase
      .from('staff_loyality')
      .select('id, merchant_id, merchants_loyality!inner(primary_color, logo_url, name, slug)')
      .eq('pin', pin);

    if (slug) {
      const normalizedSlug = decodeURIComponent(slug).toLowerCase();
      query = query.eq('merchants_loyality.slug', normalizedSlug);
    }

    const { data: staff, error } = await query.single();

    if (error || !staff) {
      return NextResponse.json({ error: 'Ungültige PIN' }, { status: 401 });
    }

    // If slug is provided, verify it matches
    if (slug) {
      const normalizedSlug = decodeURIComponent(slug).toLowerCase();
      if ((staff.merchants_loyality as any).slug !== normalizedSlug) {
        return NextResponse.json({ error: 'PIN gehört nicht zu diesem Händler' }, { status: 401 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      merchantId: staff.merchant_id,
      merchant: staff.merchants_loyality 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
