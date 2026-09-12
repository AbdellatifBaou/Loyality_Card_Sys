import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAuth } from '@/lib/auth';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { 
      merchantId, 
      name, 
      primaryColor, 
      logoUrl, 
      rewardText, 
      stampGoal, 
      language,
      address,
      contactName,
      contactPhone,
      contactEmail,
      packageType,
      customPrice,
      setupPrice
    } = await req.json();

    const authValidation = await validateAuth(req);
    if (!authValidation.authorized) {
      return NextResponse.json({ success: false, error: authValidation.error }, { status: 401 });
    }

    if (!merchantId) {
      return NextResponse.json({ success: false, error: 'Missing merchant ID' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // Fetch existing merchant data including current push_settings
    const { data: currentMerchant } = await adminSupabase
      .from('merchants_loyality')
      .select('push_settings')
      .eq('id', merchantId)
      .maybeSingle();

    const currentPush = currentMerchant?.push_settings || {};
    const updatedPush = {
      ...currentPush,
      contact_name: contactName !== undefined ? contactName : (currentPush.contact_name || null),
      contact_phone: contactPhone !== undefined ? contactPhone : (currentPush.contact_phone || null),
      contact_email: contactEmail !== undefined ? contactEmail : (currentPush.contact_email || null),
      setup_price: setupPrice !== undefined && setupPrice !== '' ? parseFloat(setupPrice) : (currentPush.setup_price || null),
    };

    const updatePayload: any = {
      name,
      primary_color: primaryColor,
      logo_url: logoUrl,
      reward_text: rewardText,
      stamp_goal: stampGoal,
      language,
      address: address !== undefined ? address : null,
      push_settings: updatedPush,
      contact_name: contactName !== undefined ? contactName : null,
      contact_phone: contactPhone !== undefined ? contactPhone : null,
      contact_email: contactEmail !== undefined ? contactEmail : null,
      ...(packageType ? { package_type: packageType } : {}),
      custom_price: packageType === 'custom' && customPrice !== undefined && customPrice !== '' ? parseFloat(customPrice) : null,
      ...(setupPrice !== undefined && setupPrice !== '' ? { setup_price: parseFloat(setupPrice) } : {}),
    };

    let { error } = await adminSupabase
      .from('merchants_loyality')
      .update(updatePayload)
      .eq('id', merchantId);

    // Graceful fallback if top-level columns don't exist in Supabase schema
    if (error && error.message && error.message.includes('column')) {
      delete updatePayload.contact_name;
      delete updatePayload.contact_phone;
      delete updatePayload.contact_email;
      delete updatePayload.setup_price;
      const retry = await adminSupabase
        .from('merchants_loyality')
        .update(updatePayload)
        .eq('id', merchantId);
      error = retry.error;
    }

    if (error) {
      console.error('Update merchant error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update merchant catch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
