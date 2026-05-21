import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { PRICING } from '@/lib/pricing';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia',
});

export async function POST(req: Request) {
  try {
    const { merchantId } = await req.json();

    if (!merchantId) {
      return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 });
    }

    // 1. Hole den Händler und Billing Infos
    const { createClient } = require('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: merchant, error: mError } = await adminSupabase
      .from('merchants_loyality')
      .select('*, merchant_billing(*)')
      .eq('id', merchantId)
      .single();

    if (mError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const billingData = Array.isArray(merchant.merchant_billing) ? merchant.merchant_billing[0] : merchant.merchant_billing;
    const subscriptionId = billingData?.stripe_subscription_id;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'No active subscription found for this merchant' }, { status: 400 });
    }

    // 2. Hole die aktuelle Subscription aus Stripe
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (!subscription.items.data.length) {
      return NextResponse.json({ error: 'Subscription has no items' }, { status: 400 });
    }

    // Finde das Abo-Item (nicht das einmalige Setup-Fee Item, falls es überhaupt noch existiert)
    // In der Regel hat die aktive Subscription nach dem ersten Monat nur noch ein Item (die monatliche Gebühr).
    // Wenn es mehrere gibt, nehmen wir das erste "recurring" item.
    const subItem = subscription.items.data.find(item => item.price.recurring) || subscription.items.data[0];

    // 3. Führe das Update durch (Upgrade auf Gold)
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subItem.id,
          price_data: {
            currency: 'eur',
            product: typeof subItem.price.product === 'string' ? subItem.price.product : (subItem.price.product as any).id,
            unit_amount: Math.round(PRICING.gold.price * 100), // aus der config
            recurring: { interval: 'month' },
          },
        },
      ],
      proration_behavior: 'always_invoice',
      metadata: { ...subscription.metadata, plan: 'gold' },
    });

    // 4. Update die Datenbank (Paket auf Gold setzen)
    await adminSupabase
      .from('merchants_loyality')
      .update({ package_type: 'gold' })
      .eq('id', merchantId);

    // 5. Sende die Willkommens-E-Mail (jetzt mit Dashboard-Link)
    if (merchant.email) {
      const generatedSlug = merchant.slug;
      const scannerUrl = `https://treue.marketif.de/${generatedSlug}`;
      const loyaltyUrl = `https://treue.marketif.de/join/${generatedSlug}`;
      const dashboardUrl = `https://treue.marketif.de/dashboard/${generatedSlug}`;
      
      const scannerQrLink = `https://treue.marketif.de/api/qr-code?text=${encodeURIComponent(scannerUrl)}`;
      const loyaltyQrLink = `https://treue.marketif.de/api/qr-code?text=${encodeURIComponent(loyaltyUrl)}`;
      const dashboardQrLink = `https://treue.marketif.de/api/qr-code?text=${encodeURIComponent(dashboardUrl)}`;

      await sendEmail({
        to: merchant.email,
        subject: `Upgrade erfolgreich: Willkommen im Gold-Paket, ${merchant.name}!`,
        html: `
          <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#ffffff;background-color:#0a0a0a;border-radius:12px;border:1px solid #333;">
            <div style="text-align:center;margin-bottom:20px;">
              <h1 style="color:#D4AF37;margin:0;">Marketif <span style="color:#ffffff;">Treue Gold</span></h1>
            </div>
            <p style="font-size:16px;line-height:1.5;">Hallo ${merchant.name},</p>
            <p style="font-size:16px;line-height:1.5;">herzlichen Glückwunsch! Dein Upgrade auf das Gold-Paket für <strong>${merchant.company}</strong> war erfolgreich. Du hast ab sofort vollen Zugriff auf das Analytics-Dashboard und alle erweiterten Funktionen.</p>
            
            <div style="background-color:#1a1a1a;padding:20px;border-radius:8px;margin:20px 0;border:1px solid #333;">
              <p style="font-size:16px;line-height:1.5;margin-top:0;">Dein persönliches Händler-Dashboard erreichst du ab sofort hier:</p>
              <div style="text-align:center;margin:20px 0;">
                <a href="${dashboardUrl}" style="background-color:#D4AF37;color:#000000;padding:14px 28px;text-decoration:none;font-weight:bold;border-radius:8px;font-size:16px;display:inline-block;">Zum Dashboard</a>
              </div>
              <p style="font-size:14px;color:#aaa;text-align:center;">Oder scanne/lade dir direkt den Dashboard QR-Code herunter:</p>
              <div style="text-align:center;">
                <a href="${dashboardQrLink}" style="display:inline-block;margin-top:5px;padding:8px 16px;background-color:#222;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;border:1px solid #444;">⬇️ Dashboard QR-Code herunterladen</a>
              </div>
            </div>

            <h3 style="color:#ffffff;margin-top:30px;border-bottom:1px solid #333;padding-bottom:10px;">Deine System-Links & QR-Codes</h3>
            
            <div style="margin-bottom:20px;">
              <p style="font-size:16px;margin-bottom:5px;"><strong>1. Link für deine Kunden (Digitale Kundenkarte holen)</strong></p>
              <p style="font-size:14px;color:#aaa;margin-top:0;line-height:1.4;">Teile diesen Link mit deinen Kunden oder drucke den QR-Code aus, damit sie sich ihre Karte sichern können.</p>
              <a href="${loyaltyUrl}" style="color:#D4AF37;font-size:15px;">${loyaltyUrl}</a>
              <br>
              <a href="${loyaltyQrLink}" style="display:inline-block;margin-top:10px;padding:8px 16px;background-color:#222;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;border:1px solid #444;">⬇️ QR-Code herunterladen (PNG)</a>
            </div>

            <div style="margin-bottom:20px;">
              <p style="font-size:16px;margin-bottom:5px;"><strong>2. Link für dich/deine Mitarbeiter (Scanner)</strong></p>
              <p style="font-size:14px;color:#aaa;margin-top:0;line-height:1.4;">Öffne diesen Link auf deinem Smartphone oder Tablet, um Kundenkarten zu scannen und Stempel zu vergeben.</p>
              <a href="${scannerUrl}" style="color:#D4AF37;font-size:15px;">${scannerUrl}</a>
              <br>
              <a href="${scannerQrLink}" style="display:inline-block;margin-top:10px;padding:8px 16px;background-color:#222;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;border:1px solid #444;">⬇️ QR-Code herunterladen (PNG)</a>
            </div>

            <hr style="border-color:#333;margin:30px 0;">
            <p style="font-size:14px;color:#888;text-align:center;">Beste Grüße,<br>Dein Marketif Team</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true, subscriptionId: updatedSubscription.id });
  } catch (error: any) {
    console.error('Stripe Upgrade Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
