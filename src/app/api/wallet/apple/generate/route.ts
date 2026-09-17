import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generatePkPass } from '@/lib/apple-wallet';

async function handlePassGeneration(slug: string, customerId?: string) {
  if (!slug) {
    return NextResponse.json({ error: 'Merchant slug is required' }, { status: 400 });
  }

  // 1. Fetch merchant
  const { data: merchant, error: mError } = await supabase
    .from('merchants_loyality')
    .select('*')
    .eq('slug', slug.toLowerCase())
    .single();

  if (mError || !merchant) {
    return NextResponse.json({ error: 'Händler nicht gefunden' }, { status: 404 });
  }

  // 2. Fetch or create customer record
  let customer: any = null;
  if (customerId) {
    const { data: existingCustomer } = await supabase
      .from('customers_loyality')
      .select('*')
      .eq('wallet_object_id', customerId)
      .eq('merchant_id', merchant.id)
      .single();
    customer = existingCustomer;
  }

  if (!customer) {
    const newObjectId = `cust_${merchant.slug}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { data: createdCustomer, error: cError } = await supabase
      .from('customers_loyality')
      .insert({
        merchant_id: merchant.id,
        wallet_object_id: newObjectId,
        points: 0
      })
      .select()
      .single();

    if (cError) {
      throw new Error('Fehler beim Anlegen des Kunden');
    }
    customer = createdCustomer;
  }

  // 3. Generate .pkpass buffer
  const pkpassBuffer = await generatePkPass(merchant, customer);

  // 4. Return .pkpass as downloadable file stream
  return new Response(new Uint8Array(pkpassBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename="${merchant.slug}-loyalty.pkpass"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const customerId = searchParams.get('customerId') || undefined;

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    return await handlePassGeneration(slug, customerId);
  } catch (err: any) {
    console.error('Apple Wallet GET API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, customerId } = body;
    return await handlePassGeneration(slug, customerId);
  } catch (err: any) {
    console.error('Apple Wallet POST API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
