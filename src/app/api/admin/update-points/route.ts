import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateLoyaltyObjectPoints } from '@/lib/google-wallet';
import { validateAuth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { customerId, newPoints, staffId } = await req.json();

    if (!customerId || newPoints === undefined) {
      return NextResponse.json({ error: 'Missing customerId or newPoints' }, { status: 400 });
    }

    const { createClient } = require('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get customer and their merchant
    const { data: customer, error: customerError } = await adminSupabase
      .from('customers_loyality')
      .select('id, wallet_object_id, points, merchants_loyality(*)')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const merchant = customer.merchants_loyality;

    const authValidation = await validateAuth(req, merchant.id);
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error }, { status: 401 });
    }
    const isRedeem = (customer.points >= 9 && newPoints === 0);
    const type = isRedeem ? 'redeem' : 'correction';

    // 2. Update Database (Customer points)
    const { error: updateError } = await adminSupabase
      .from('customers_loyality')
      .update({ points: newPoints })
      .eq('id', customerId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
    }

    // Insert correction record into stamps table to keep history consistent
    // Since amount is delta, we calculate it
    const amountDifference = newPoints - customer.points;
    if (amountDifference !== 0) {
      await adminSupabase.from('stamps_loyality').insert([
        { 
          customer_id: customerId, 
          staff_id: staffId || null,
          amount: amountDifference, 
          type: type 
        }
      ]);
    }

    // 3. Update Google Wallet
    if (customer.wallet_object_id) {
      await updateLoyaltyObjectPoints(customer.wallet_object_id, newPoints, isRedeem, merchant);
    }

    return NextResponse.json({ success: true, newPoints });
  } catch (error: any) {
    console.error('Update Points API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
