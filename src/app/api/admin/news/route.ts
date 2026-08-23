import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { password, message, isActive } = await req.json();
    if (password !== '2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isActive) {
      // Deactivate all previous
      await supabase.from('system_news').update({ is_active: false }).neq('is_active', null);
      
      // Insert new
      const { error } = await supabase.from('system_news').insert([{ message, is_active: true }]);
      if (error) throw error;
    } else {
      // Just deactivate all
      await supabase.from('system_news').update({ is_active: false }).neq('is_active', null);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}