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
    const isRedeem = newPoints >= 10;

    // 2. Update Database (Customer points)
    const { error: updateError } = await supabase
      .from('customers')
      .update({ points: newPoints })
      .eq('id', customerId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
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
