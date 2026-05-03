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
      .from('staff')
      .select('id, merchant_id')
      .eq('pin', pin)
      .single();

    if (staffError || !staff) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // 2. Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, points')
      .eq('wallet_object_id', objectId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // 3. Calculate new points
    let newPoints = customer.points + amount;
    let type = 'earn';

    // Reward logic (10 points max - 10th is free)
    if (newPoints >= 10) {
      newPoints = 0; // Reset after reaching 10 (or keep at 10 to show redeem state)
      type = 'redeem';
    }

    // 4. Update Database (Customer & Stamps Log)
    await supabase.from('customers').update({ points: newPoints }).eq('id', customer.id);
    await supabase.from('stamps').insert([
      { customer_id: customer.id, staff_id: staff.id, amount, type }
    ]);

    // 5. Update Google Wallet
    await updateLoyaltyObjectPoints(objectId, newPoints, type === 'redeem');

    return NextResponse.json({ success: true, newPoints, type });
  } catch (error: any) {
    console.error('Stamp API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
