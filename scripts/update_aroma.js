const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sffvoyqkmkjwltbsuyyk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZnZveXFrbWtqd2x0YnN1eXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzIwNjQsImV4cCI6MjA5MzQwODA2NH0.DHtxaEwkRDVuBAPR8Jcv04uzt3HvAXVzomoy6Isaxp4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAroma() {
  // First check current state
  const { data: current } = await supabase
    .from('merchants')
    .select('slug, name, reward_text')
    .eq('slug', 'aroma')
    .single();
  
  console.log('Current state:', JSON.stringify(current, null, 2));

  const { data, error } = await supabase
    .from('merchants')
    .update({ 
      reward_text: '10 Stempel = 1 GRATIS Lieblingsgericht 🍕'
    })
    .eq('slug', 'aroma')
    .select();

  if (error) {
    console.error('❌ Error updating Aroma:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Aroma updated successfully:', JSON.stringify(data, null, 2));
  }
}

updateAroma();
