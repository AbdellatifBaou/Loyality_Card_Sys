import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  // Only works if SUPABASE_SERVICE_ROLE_KEY is set
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!serviceKey || !url) {
    // Fallback: just update what we can with anon key
    return NextResponse.json({ error: 'No service role key' }, { status: 500 });
  }
  
  const supabaseAdmin = createClient(url, serviceKey);
  
  const { data, error } = await supabaseAdmin
    .from('merchants')
    .update({ reward_text: '10 Stempel = 1 GRATIS Lieblingsgericht 🍕' })
    .eq('slug', 'aroma')
    .select('slug, reward_text');
    
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true, data });
}
