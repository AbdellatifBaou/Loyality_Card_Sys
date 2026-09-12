import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateAuth } from '@/lib/auth';

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
      contactEmail
    } = await req.json();

    const authValidation = await validateAuth(req);
    if (!authValidation.authorized) {
      return NextResponse.json({ success: false, error: authValidation.error }, { status: 401 });
    }

    if (!merchantId) {
      return NextResponse.json({ success: false, error: 'Missing merchant ID' }, { status: 400 });
    }

    const updatePayload: any = {
      name,
      primary_color: primaryColor,
      logo_url: logoUrl,
      reward_text: rewardText,
      stamp_goal: stampGoal,
      language,
      address: address !== undefined ? address : null,
      contact_name: contactName !== undefined ? contactName : null,
      contact_phone: contactPhone !== undefined ? contactPhone : null,
      contact_email: contactEmail !== undefined ? contactEmail : null,
    };

    let { error } = await supabase
      .from('merchants_loyality')
      .update(updatePayload)
      .eq('id', merchantId);

    // Graceful fallback if contact_* columns are not added yet
    if (error && error.message && error.message.includes('column')) {
      delete updatePayload.contact_name;
      delete updatePayload.contact_phone;
      delete updatePayload.contact_email;
      const retry = await supabase
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
