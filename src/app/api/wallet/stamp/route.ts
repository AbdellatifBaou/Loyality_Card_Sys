import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateLoyaltyObjectPoints } from '@/lib/google-wallet';
import { rateLimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
  try {
    const { objectId, pin, amount = 1 } = await req.json();

    if (!objectId || !pin) {
      return NextResponse.json({ error: 'Missing objectId or pin' }, { status: 400 });
    }

    // Rate Limiting: max 1 request every 5 seconds per customer objectId
    const rl = rateLimit(`stamp:${objectId}`, 1, 5000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Zu viele Anfragen. Bitte kurz warten.' }, { status: 429 });
    }

    const { createClient } = require('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get customer and their merchant first (to know which merchant the PIN belongs to)
    const { data: customer, error: customerError } = await adminSupabase
      .from('customers_loyality')
      .select('id, wallet_object_id, points, merchants_loyality(*)')
      .ilike('wallet_object_id', `${objectId}%`)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const merchant = customer.merchants_loyality;
    if (merchant.is_active === false) {
      return NextResponse.json({ error: 'Dieser Händler ist derzeit deaktiviert' }, { status: 403 });
    }

    // 2. Validate PIN scoped specifically to this merchant
    const { data: staff, error: staffError } = await adminSupabase
      .from('staff_loyality')
      .select('id, merchant_id')
      .eq('pin', pin)
      .eq('merchant_id', merchant.id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json({ error: 'Invalid PIN for this merchant' }, { status: 401 });
    }

    // 3. Calculate new points
    let newPoints = customer.points + amount;
    let type = 'earn';

    const stampGoal = merchant.stamp_goal || 9;
    
    // Reward logic:
    // 1. If they ALREADY had stampGoal points (card full) and add a stamp, it resets to 0 and counts as a redemption.
    if (customer.points >= stampGoal && amount > 0) {
      newPoints = 0;
      type = 'redeem';
    } 
    // 2. If they reach stampGoal points, they stay at stampGoal (card full state).
    else if (newPoints >= stampGoal) {
      newPoints = stampGoal;
      type = 'earn';
    }

    // 4. Update Database (Customer & Stamps Log)
    await adminSupabase.from('customers_loyality').update({ points: newPoints }).eq('id', customer.id);
    await adminSupabase.from('stamps_loyality').insert([
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
