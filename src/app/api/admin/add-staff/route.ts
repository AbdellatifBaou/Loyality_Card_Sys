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
    const { merchantId, name, pin } = await req.json();

    const authValidation = await validateAuth(req, merchantId);
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error }, { status: 401 });
    }

    if (!merchantId || !name || !pin) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { data: merchantData } = await adminSupabase.from('merchants_loyality').select('language').eq('id', merchantId).single();
    const lang = merchantData?.language || 'de';

    const errAdminPin = lang === 'fr' ? "Ce code PIN est réservé à l'administrateur." : lang === 'en' ? "This PIN is reserved for the administrator." : "Diese PIN ist für den Administrator reserviert.";
    const errInUse = lang === 'fr' ? "Ce code PIN est déjà utilisé par un autre employé." : lang === 'en' ? "This PIN is already in use by another employee." : "Diese PIN wird bereits von einem anderen Mitarbeiter verwendet.";
    const errFormat = lang === 'fr' ? "Le code PIN doit comporter exactement 4 chiffres." : lang === 'en' ? "PIN must be exactly 4 digits." : "Die PIN muss aus genau 4 Zahlen bestehen.";

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: errFormat }, { status: 400 });
    }

    if (process.env.ADMIN_API_KEY && pin === process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: errAdminPin }, { status: 400 });
    }

    const { data: existingPin } = await adminSupabase
      .from('staff_loyality')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('pin', pin)
      .limit(1)
      .maybeSingle();

    if (existingPin) {
      return NextResponse.json({ error: errInUse }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from('staff_loyality')
      .insert([{ merchant_id: merchantId, name, pin }])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Add Staff API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
