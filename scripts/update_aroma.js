
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAroma() {
  const { data, error } = await supabase
    .from('merchants')
    .update({ 
      reward_text: '10 Stempel = 1 GRATIS Lieblingsgericht 🍕' 
    })
    .eq('slug', 'aroma');

  if (error) {
    console.error('Error updating Aroma:', error);
  } else {
    console.log('Aroma reward text updated successfully.');
  }
}

updateAroma();
