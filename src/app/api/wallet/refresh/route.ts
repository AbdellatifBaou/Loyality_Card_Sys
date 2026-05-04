import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateLoyaltyObjectPoints } from '@/lib/google-wallet';

// Aktualisiert das Hero-Image einer Karte ohne Stempel hinzuzufügen
export async function POST(req: Request) {
  try {
    const { objectId } = await req.json();

    if (!objectId) {
      return NextResponse.json({ error: 'Missing objectId' }, { status: 400 });
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select('points')
      .eq('wallet_object_id', objectId)
      .single();

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await updateLoyaltyObjectPoints(objectId, customer.points, false);

    return NextResponse.json({ success: true, points: customer.points });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
