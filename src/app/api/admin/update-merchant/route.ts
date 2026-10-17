import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAuth } from '@/lib/auth';
import { updateLoyaltyClass } from '@/lib/google-wallet';

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
      .select('*')
      .eq('id', merchantId)
      .maybeSingle();

    const currentPush = currentMerchant?.push_settings || {};
    const parsedCustomPrice = (packageType === 'custom' && customPrice !== undefined && customPrice !== null && customPrice !== '' && !isNaN(Number(customPrice)))
      ? parseFloat(customPrice)
      : (packageType === 'custom' ? 0 : null);

    const parsedSetupPrice = (setupPrice !== undefined && setupPrice !== null && setupPrice !== '' && !isNaN(Number(setupPrice)))
      ? parseFloat(setupPrice)
      : 0;

    const updatedPush = {
      ...currentPush,
      updated_at: new Date().toISOString(),
      contact_name: contactName !== undefined ? contactName : (currentPush.contact_name || null),
      contact_phone: contactPhone !== undefined ? contactPhone : (currentPush.contact_phone || null),
      contact_email: contactEmail !== undefined ? contactEmail : (currentPush.contact_email || null),
      setup_price: parsedSetupPrice,
      custom_price: parsedCustomPrice,
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
      custom_price: parsedCustomPrice,
      setup_price: parsedSetupPrice,
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
      delete updatePayload.custom_price;
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

    // Sync updated settings to Google Wallet class & notify Apple Wallet passes
    if (currentMerchant?.slug) {
      const fullMerchantData = {
        ...currentMerchant,
        ...updatePayload,
      };
      const lang = fullMerchantData.language || 'de';
      const otherLang = lang === 'de' ? 'fr' : 'de';

      // 1. Update Google Wallet Classes
      try {
        await updateLoyaltyClass(`marketif_loyalty_${currentMerchant.slug}_${lang}`, fullMerchantData);
      } catch (walletErr) {
        console.error('Failed to sync to Google Wallet class (lang):', walletErr);
      }
      try {
        await updateLoyaltyClass(`marketif_loyalty_${currentMerchant.slug}_${otherLang}`, fullMerchantData);
      } catch (_) {}
      try {
        await updateLoyaltyClass(`marketif_loyalty_${currentMerchant.slug}`, fullMerchantData);
      } catch (_) {}

      // 2. Notify registered Apple Wallet devices
      try {
        const { notifyMerchantPassesUpdate } = await import('@/lib/apple-pass-registry');
        await notifyMerchantPassesUpdate(merchantId);
      } catch (appleErr) {
        console.warn('Apple Wallet notify update error:', appleErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update merchant catch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
