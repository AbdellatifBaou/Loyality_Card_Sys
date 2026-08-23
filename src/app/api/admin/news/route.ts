import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { password, message, isActive } = await req.json();
    if (password !== '2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isActive) {
      // Deactivate all previous
      await supabaseAdmin.from('system_news').update({ is_active: false }).not('is_active', 'is', null);
      
      // Insert new
      const { error } = await supabaseAdmin.from('system_news').insert([{ message, is_active: true }]);
      if (error) throw error;
    } else {
      // Just deactivate all
      await supabaseAdmin.from('system_news').update({ is_active: false }).not('is_active', 'is', null);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}