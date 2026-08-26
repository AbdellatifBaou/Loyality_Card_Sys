import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateAuth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { merchantId, name, primaryColor, logoUrl, rewardText, stampGoal, language } = await req.json();

    const authValidation = await validateAuth(req);
    if (!authValidation.authorized) {
      return NextResponse.json({ success: false, error: authValidation.error }, { status: 401 });
    }

    if (!merchantId) {
      return NextResponse.json({ success: false, error: 'Missing merchant ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('merchants_loyality')
      .update({
        name,
        primary_color: primaryColor,
        logo_url: logoUrl,
        reward_text: rewardText,
        stamp_goal: stampGoal,
        language
      })
      .eq('id', merchantId);

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
