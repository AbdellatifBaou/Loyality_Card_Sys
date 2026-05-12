import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateLoyaltyObjectJwt, createLoyaltyClass } from '@/lib/google-wallet';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const { merchantName, classId } = await req.json();

    if (!merchantName || !classId) {
      return NextResponse.json({ error: 'Missing merchantName or classId' }, { status: 400 });
    }

    // 1. Get Merchant from Supabase
    const slug = classId.replace('marketif_loyalty_', '');
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants_loyality')
      .select('*')
      .eq('slug', slug)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // 2. Ensure LoyaltyClass exists in Google Wallet
    await createLoyaltyClass(classId, merchant);

    // 3. Generate new Customer ID
    const customerId = uuidv4();

    // 4. Save customer in Supabase
    const { error: dbError } = await supabase
      .from('customers_loyality')
      .insert([
        { id: customerId, wallet_object_id: customerId, points: 0, merchant_id: merchant.id }
      ]);

    if (dbError) {
      console.error('Supabase Error:', dbError);
      throw new Error('Database error');
    }

    // 5. Generate Google Wallet Add URL
    const saveUrl = await generateLoyaltyObjectJwt(classId, customerId, 0, merchant);

    return NextResponse.json({ url: saveUrl, customerId });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
