import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the MAIN Marketif Supabase project for contact requests
const supabaseUrl = 'https://mvdblfosainawhtislfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZGJsZm9zYWluYXdodGlzbGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNTUxNTMsImV4cCI6MjA5MTYzMTE1M30.bQ3XL-AeqPc5mw2W3XMgmiHj8BU1CrZl2wcEBihfmn4';

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Alle Felder sind erforderlich.' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('Contact_Requests')
      .insert([{ name, email, message: `[TREUE] ${message}` }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Nachricht konnte nicht gesendet werden.' }, { status: 500 });
  }
}
