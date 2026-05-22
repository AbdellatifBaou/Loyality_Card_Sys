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

    const normalizedSlug = slug ? decodeURIComponent(slug).toLowerCase() : null;

    // 1. Check Merchant Lockout status first (if slug is provided)
    if (normalizedSlug) {
      const { data: merchantData } = await adminSupabase
        .from('merchants_loyality')
        .select('id, failed_login_attempts, lockout_until')
        .eq('slug', normalizedSlug)
        .single();
        
      if (merchantData?.lockout_until && new Date(merchantData.lockout_until) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(merchantData.lockout_until).getTime() - new Date().getTime()) / 60000);
        return NextResponse.json({ error: `Zu viele Fehlversuche. Bitte warte ${remainingMinutes} Minuten.` }, { status: 429 });
      }
    }

    let query = adminSupabase
      .from('staff_loyality')
      .select('id, name, merchant_id, merchants_loyality!inner(id, primary_color, logo_url, name, slug, is_active, failed_login_attempts)')
      .eq('pin', pin);

    if (normalizedSlug) {
      query = query.eq('merchants_loyality.slug', normalizedSlug);
    }

    const { data: staff, error } = await query.single();

    if (error || !staff) {
      // 2. Increment failed login attempts if slug is provided
      if (normalizedSlug) {
        const { data: mData } = await adminSupabase.from('merchants_loyality').select('id, failed_login_attempts').eq('slug', normalizedSlug).single();
        if (mData) {
          const newAttempts = (mData.failed_login_attempts || 0) + 1;
          const updates: any = { failed_login_attempts: newAttempts };
          if (newAttempts >= 5) {
            updates.lockout_until = new Date(Date.now() + 15 * 60000).toISOString(); // 15 mins
          }
          await adminSupabase.from('merchants_loyality').update(updates).eq('id', mData.id);
        }
      }
      return NextResponse.json({ error: 'Ungültige PIN' }, { status: 401 });
    }

    const merchant = staff.merchants_loyality as any;

    if (normalizedSlug && merchant.slug !== normalizedSlug) {
      return NextResponse.json({ error: 'PIN gehört nicht zu diesem Händler' }, { status: 401 });
    }

    if (merchant.is_active === false) {
      return NextResponse.json({ error: 'Dieser Händler ist derzeit deaktiviert' }, { status: 403 });
    }

    // 3. Reset failed login attempts on success
    if (merchant.failed_login_attempts > 0) {
      await adminSupabase.from('merchants_loyality').update({
        failed_login_attempts: 0,
        lockout_until: null
      }).eq('id', merchant.id);
    }

    return NextResponse.json({ 
      success: true, 
      merchantId: staff.merchant_id,
      staffId: staff.id,
      staffName: staff.name,
      merchant: merchant
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
