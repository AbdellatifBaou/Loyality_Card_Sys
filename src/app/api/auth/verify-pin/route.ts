import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = rateLimit(`login:${ip}`, 30, 60000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 });
    }

    const { pin, slug } = await req.json();

    if (!pin) {
      return NextResponse.json({ error: 'PIN ist erforderlich' }, { status: 400 });
    }

    const { createClient } = require('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const normalizedSlug = slug ? decodeURIComponent(slug).toLowerCase() : null;

    // Check if it's the global admin password (master bypass)
    const adminKey = process.env.ADMIN_API_KEY || '2025';
    if (pin === adminKey) {
      if (normalizedSlug) {
        const { data: merchantData } = await adminSupabase
          .from('merchants_loyality')
          .select('*')
          .eq('slug', normalizedSlug)
          .single();
        if (merchantData) {
          return NextResponse.json({
            success: true,
            merchantId: merchantData.id,
            staffId: 'admin',
            staffName: 'Global Admin',
            merchant: merchantData
          });
        }
      }
      return NextResponse.json({ success: true, staffName: 'Global Admin' });
    }

    // 1. Check Merchant Lockout status first (if slug is provided)
    if (normalizedSlug) {
      const { data: merchantData } = await adminSupabase
        .from('merchants_loyality')
        .select('id, language, failed_login_attempts, lockout_until')
        .eq('slug', normalizedSlug)
        .single();
        
      const isLocked = (merchantData?.failed_login_attempts >= 5) || 
                       (merchantData?.lockout_until && new Date(merchantData.lockout_until) > new Date());
      
      if (isLocked) {
        const isFr = merchantData?.language === 'fr';
        const msg = isFr
          ? 'Ce compte commerçant a été verrouillé après 5 tentatives infructueuses. Veuillez contacter Marketif (contact@marketif.net / WhatsApp: +212666979312) pour débloquer votre accès.'
          : 'Dieser Händler-Account wurde nach 5 Fehlversuchen gesperrt. Bitte kontaktiere den Marketif Support (contact@marketif.net / WhatsApp: +212666979312), um den Zugang freizuschalten.';
        return NextResponse.json({ error: msg, isLocked: true }, { status: 423 });
      }
    }

    let query = adminSupabase
      .from('staff_loyality')
      .select('id, name, merchant_id, merchants_loyality!inner(id, primary_color, logo_url, name, slug, language, is_active, failed_login_attempts, lockout_until)')
      .eq('pin', pin);

    if (normalizedSlug) {
      query = query.eq('merchants_loyality.slug', normalizedSlug);
    }

    const { data: staff, error } = await query.single();

    if (error || !staff) {
      // Increment failed login attempts for this merchant
      if (normalizedSlug) {
        const { data: mData } = await adminSupabase
          .from('merchants_loyality')
          .select('id, language, failed_login_attempts')
          .eq('slug', normalizedSlug)
          .single();

        if (mData) {
          const newAttempts = (mData.failed_login_attempts || 0) + 1;
          const isFr = mData.language === 'fr';

          if (newAttempts >= 5) {
            await adminSupabase.from('merchants_loyality').update({
              failed_login_attempts: 5,
              lockout_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // locked until admin unlock
            }).eq('id', mData.id);

            const lockMsg = isFr
              ? 'Ce compte commerçant a été verrouillé après 5 tentatives infructueuses. Veuillez contacter Marketif (contact@marketif.net / WhatsApp: +212666979312) pour débloquer votre accès.'
              : 'Dieser Händler-Account wurde nach 5 Fehlversuchen gesperrt. Bitte kontaktiere den Marketif Support (contact@marketif.net / WhatsApp: +212666979312), um den Zugang freizuschalten.';
            return NextResponse.json({ error: lockMsg, isLocked: true }, { status: 423 });
          } else {
            await adminSupabase.from('merchants_loyality').update({
              failed_login_attempts: newAttempts
            }).eq('id', mData.id);

            const remaining = 5 - newAttempts;
            const errMsg = isFr
              ? `Code PIN incorrect. Encore ${remaining} tentative(s) avant verrouillage du compte.`
              : `Ungültige PIN. Noch ${remaining} Versuch(e), bevor der Account gesperrt wird.`;
            return NextResponse.json({ error: errMsg, remainingAttempts: remaining }, { status: 401 });
          }
        }
      }
      return NextResponse.json({ error: 'Ungültige PIN' }, { status: 401 });
    }

    const merchant = staff.merchants_loyality as any;

    if (normalizedSlug && merchant.slug !== normalizedSlug) {
      return NextResponse.json({ error: 'PIN gehört nicht zu diesem Händler' }, { status: 401 });
    }

    // Reset failed login attempts on success
    if (merchant.failed_login_attempts > 0 || merchant.lockout_until) {
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
