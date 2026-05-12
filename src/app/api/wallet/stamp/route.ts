import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateLoyaltyObjectPoints } from '@/lib/google-wallet';

export async function POST(req: Request) {
  try {
    const { objectId, pin, amount = 1 } = await req.json();

    if (!objectId || !pin) {
      return NextResponse.json({ error: 'Missing objectId or pin' }, { status: 400 });
    }

    // 1. Validate PIN and get staff ID
    const { data: staff, error: staffError } = await supabase
      .from('staff_loyality')
      .select('id, merchant_id')
      .eq('pin', pin)
      .single();

    if (staffError || !staff) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // 2. Get customer and their merchant (Support both full UUID and short 8-char ID from manual input)
    const { data: customer, error: customerError } = await supabase
      .from('customers_loyality')
      .select('id, wallet_object_id, points, merchants_loyality(*)')
      .ilike('wallet_object_id', `${objectId}%`)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const merchant = customer.merchants_loyality;

    // 3. Calculate new points
    let newPoints = customer.points + amount;
    let type = 'earn';

    // Reward logic:
    // 1. If they ALREADY had 9 points (card full) and add a stamp, it resets to 0 and counts as a redemption.
    if (customer.points >= 9 && amount > 0) {
      newPoints = 0;
      type = 'redeem';
    } 
    // 2. If they reach 9 points, they stay at 9 (card full state).
    else if (newPoints >= 9) {
      newPoints = 9;
      type = 'earn';
    }

    // 4. Update Database (Customer & Stamps Log)
    await supabase.from('customers_loyality').update({ points: newPoints }).eq('id', customer.id);
    await supabase.from('stamps_loyality').insert([
      { customer_id: customer.id, staff_id: staff.id, amount, type }
    ]);

    // 5. Update Google Wallet
    await updateLoyaltyObjectPoints(customer.wallet_object_id, newPoints, type === 'redeem', merchant);

    return NextResponse.json({ success: true, newPoints, type });
  } catch (error: any) {
    console.error('Stamp API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
