import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateLoyaltyObjectPoints } from '@/lib/google-wallet';

export async function POST(req: Request) {
  try {
    const { customerId, newPoints } = await req.json();

    if (!customerId || newPoints === undefined) {
      return NextResponse.json({ error: 'Missing customerId or newPoints' }, { status: 400 });
    }

    // 1. Get customer and their merchant
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, wallet_object_id, points, merchants(*)')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const merchant = customer.merchants;
    const isRedeem = (customer.points >= 10 && newPoints === 0);
    const type = isRedeem ? 'redeem' : 'correction';

    // 2. Update Database (Customer points)
    const { error: updateError } = await supabase
      .from('customers')
      .update({ points: newPoints })
      .eq('id', customerId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
    }

    // Insert correction record into stamps table to keep history consistent
    // Since amount is delta, we calculate it
    const amountDifference = newPoints - customer.points;
    if (amountDifference !== 0) {
      await supabase.from('stamps').insert([
        { 
          customer_id: customerId, 
          // We can leave staff_id null or pass a default if required by schema. 
          // Assuming staff_id can be null or we need to pass it from frontend.
          // For now, type 'correction' helps identify it.
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
