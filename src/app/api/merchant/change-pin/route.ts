import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { slug, oldPin, newPin } = await req.json();

    if (!slug || !oldPin || !newPin) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    
    if (newPin.length < 4) {
      return NextResponse.json({ error: 'New PIN must be at least 4 digits' }, { status: 400 });
    }

    // Admin DB connection
    const { createClient } = require('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify old PIN
    const { data: staff, error: fetchError } = await adminSupabase
      .from('staff_loyality')
      .select('id, name, merchant_id, merchants_loyality!inner(slug)')
      .eq('pin', oldPin)
      .eq('merchants_loyality.slug', slug)
      .single();

    if (fetchError || !staff) {
      return NextResponse.json({ error: 'Die aktuelle PIN ist falsch oder Händler nicht gefunden' }, { status: 401 });
    }

    if (!staff.name.toLowerCase().includes('admin') && !(staff.merchants_loyality as any).slug.includes('admin')) {
      return NextResponse.json({ error: 'Diese PIN hat keine Administrator-Rechte' }, { status: 403 });
    }
    // Uniqueness and validity checks for new PIN
    const { data: merchantData } = await adminSupabase.from('merchants_loyality').select('language').eq('id', staff.merchant_id).single();
    const lang = merchantData?.language || 'de';

    const errAdminPin = lang === 'fr' ? "Ce code PIN est réservé à l'administrateur." : lang === 'en' ? "This PIN is reserved for the administrator." : "Diese PIN ist für den Administrator reserviert.";
    const errInUse = lang === 'fr' ? "Ce code PIN est déjà utilisé par un autre employé." : lang === 'en' ? "This PIN is already in use by another employee." : "Diese PIN wird bereits von einem anderen Mitarbeiter verwendet.";

    if (process.env.ADMIN_API_KEY && newPin === process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: errAdminPin }, { status: 400 });
    }

    const { data: existingPin } = await adminSupabase
      .from('staff_loyality')
      .select('id')
      .eq('merchant_id', staff.merchant_id)
      .eq('pin', newPin)
      .limit(1)
      .maybeSingle();

    if (existingPin) {
      return NextResponse.json({ error: errInUse }, { status: 400 });
    }

    // Update PIN
    const { error: updateError } = await adminSupabase
      .from('staff_loyality')
      .update({ pin: newPin })
      .eq('id', staff.id);

    if (updateError) {
      return NextResponse.json({ error: 'Fehler beim Ändern der PIN' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
