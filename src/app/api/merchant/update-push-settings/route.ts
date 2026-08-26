import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { merchantId, settings } = await req.json();

    if (!merchantId || !settings) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const authValidation = await validateAuth(req, merchantId);
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error }, { status: 401 });
    }

    const { createClient } = require('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateError } = await adminSupabase
      .from('merchants_loyality')
      .update({ push_settings: settings })
      .eq('id', merchantId);

    if (updateError) {
      return NextResponse.json({ error: 'Fehler beim Speichern der Push-Einstellungen' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
