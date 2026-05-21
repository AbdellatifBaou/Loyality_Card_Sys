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
    const { data: merchant, error: fetchError } = await adminSupabase
      .from('merchants_loyality')
      .select('id, master_pin')
      .eq('slug', slug)
      .single();

    if (fetchError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    if (merchant.master_pin !== oldPin) {
      return NextResponse.json({ error: 'Die aktuelle PIN ist falsch' }, { status: 401 });
    }

    // Update PIN
    const { error: updateError } = await adminSupabase
      .from('merchants_loyality')
      .update({ master_pin: newPin })
      .eq('id', merchant.id);

    if (updateError) {
      return NextResponse.json({ error: 'Fehler beim Ändern der PIN' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
