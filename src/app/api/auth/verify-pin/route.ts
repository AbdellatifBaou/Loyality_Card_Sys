import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { pin, slug } = await req.json();

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    const { createClient } = require('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = adminSupabase
      .from('staff_loyality')
      .select('id, name, merchant_id, merchants_loyality!inner(primary_color, logo_url, name, slug, is_active)')
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

    if ((staff.merchants_loyality as any).is_active === false) {
      return NextResponse.json({ error: 'Dieser Händler ist derzeit deaktiviert' }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      merchantId: staff.merchant_id,
      staffName: staff.name,
      merchant: staff.merchants_loyality 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
