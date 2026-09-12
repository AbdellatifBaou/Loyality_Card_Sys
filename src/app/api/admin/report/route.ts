import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAuth } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

const getAdminSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { merchantId, timeframe = 'month', year, month, lang = 'de', action } = body;

    if (!merchantId) {
      return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 });
    }

    const authValidation = await validateAuth(req, merchantId);
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error || 'Unauthorized' }, { status: 401 });
    }

    const adminDb = getAdminSupabase();

    // 1. Fetch Merchant Data
    const { data: merchant, error: mError } = await adminDb
      .from('merchants_loyality')
      .select('*')
      .eq('id', merchantId)
      .single();

    if (mError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // 2. Determine Date Boundaries
    const now = new Date();
    const selectedYear = year ? parseInt(year, 10) : now.getFullYear();
    const selectedMonth = month !== undefined ? parseInt(month, 10) : now.getMonth() + 1; // 1-12

    let startDate: Date;
    let endDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    const monthNamesDe = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const monthNamesFr = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    let periodTitle = '';

    if (timeframe === 'month') {
      startDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(selectedYear, selectedMonth, 0, 23, 59, 59, 999));

      // Previous month
      prevStartDate = new Date(Date.UTC(selectedYear, selectedMonth - 2, 1, 0, 0, 0));
      prevEndDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, 0, 23, 59, 59, 999));

      const monthLabel = lang === 'fr' ? monthNamesFr[selectedMonth - 1] : monthNamesDe[selectedMonth - 1];
      periodTitle = `${monthLabel} ${selectedYear}`;
    } else if (timeframe === 'year') {
      startDate = new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999));

      // Previous year
      prevStartDate = new Date(Date.UTC(selectedYear - 1, 0, 1, 0, 0, 0));
      prevEndDate = new Date(Date.UTC(selectedYear - 1, 11, 31, 23, 59, 59, 999));

      periodTitle = `${selectedYear}`;
    } else {
      // All-time
      startDate = new Date(2020, 0, 1);
      endDate = new Date();
      prevStartDate = new Date(2020, 0, 1);
      prevEndDate = new Date(2020, 0, 1);
      periodTitle = lang === 'fr' ? 'Historique complet' : 'Gesamter Zeitraum';
    }

    // 3. Fetch Customers for this merchant
    const { data: allCustomers } = await adminDb
      .from('customers_loyality')
      .select('id, created_at, points')
      .eq('merchant_id', merchantId);

    const customersList = allCustomers || [];
    const customerIds = customersList.map(c => c.id);

    const totalCustomersToDate = customersList.filter(c => new Date(c.created_at) <= endDate).length;
    const newCustomersInPeriod = customersList.filter(c => {
      const d = new Date(c.created_at);
      return d >= startDate && d <= endDate;
    }).length;
    const newCustomersPrevPeriod = customersList.filter(c => {
      const d = new Date(c.created_at);
      return d >= prevStartDate && d <= prevEndDate;
    }).length;

    // 4. Fetch Staff members
    const { data: staffList } = await adminDb
      .from('staff_loyality')
      .select('id, name')
      .eq('merchant_id', merchantId);

    const staffMap = new Map<string, string>();
    (staffList || []).forEach(s => staffMap.set(s.id, s.name));

    // 5. Fetch Stamps (both period and previous period if needed)
    let periodStamps: any[] = [];
    let prevPeriodStamps: any[] = [];

    if (customerIds.length > 0) {
      // Current Period Stamps
      const { data: stampsCurrent } = await adminDb
        .from('stamps_loyality')
        .select('*')
        .in('customer_id', customerIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      periodStamps = stampsCurrent || [];

      // Previous Period Stamps (for growth calculation)
      if (timeframe !== 'all') {
        const { data: stampsPrev } = await adminDb
          .from('stamps_loyality')
          .select('id, amount, type')
          .in('customer_id', customerIds)
          .gte('created_at', prevStartDate.toISOString())
          .lte('created_at', prevEndDate.toISOString());
        
        prevPeriodStamps = stampsPrev || [];
      }
    }

    // 6. Calculate KPIs
    const earnStamps = periodStamps.filter(s => s.type === 'earn');
    const redeemStamps = periodStamps.filter(s => s.type === 'redeem');

    const stampsGiven = earnStamps.reduce((sum, s) => sum + (s.amount || 1), 0);
    const rewardsRedeemed = redeemStamps.length;

    const prevEarnStamps = prevPeriodStamps.filter(s => s.type === 'earn');
    const prevStampsGiven = prevEarnStamps.reduce((sum, s) => sum + (s.amount || 1), 0);
    const prevRewardsRedeemed = prevPeriodStamps.filter(s => s.type === 'redeem').length;

    // Growth Percentage
    let stampsGrowthPercent: number | null = null;
    if (prevStampsGiven > 0) {
      stampsGrowthPercent = Math.round(((stampsGiven - prevStampsGiven) / prevStampsGiven) * 100);
    } else if (stampsGiven > 0 && prevStampsGiven === 0) {
      stampsGrowthPercent = 100;
    }

    // 7. Weekday Distribution
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun(0) to Sat(6)
    periodStamps.forEach(s => {
      const day = new Date(s.created_at).getDay();
      weekdayCounts[day] += (s.amount || 1);
    });

    const dayLabelsDe = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const dayLabelsFr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const dayLabels = lang === 'fr' ? dayLabelsFr : dayLabelsDe;

    // Reorder from Monday to Sunday: 1, 2, 3, 4, 5, 6, 0
    const weekdayDistribution = [1, 2, 3, 4, 5, 6, 0].map(idx => ({
      day: dayLabels[idx],
      count: weekdayCounts[idx]
    }));

    // 8. Hourly / Time-of-Day Distribution
    let morning = 0;   // 06:00 - 11:59
    let afternoon = 0; // 12:00 - 16:59
    let evening = 0;   // 17:00 - 22:59
    let night = 0;     // 23:00 - 05:59

    periodStamps.forEach(s => {
      const h = new Date(s.created_at).getHours();
      const count = s.amount || 1;
      if (h >= 6 && h < 12) morning += count;
      else if (h >= 12 && h < 17) afternoon += count;
      else if (h >= 17 && h < 23) evening += count;
      else night += count;
    });

    const hourlyDistribution = [
      { key: 'morning', label: lang === 'fr' ? 'Matin (06h - 12h)' : 'Vormittag (06:00 - 12:00)', count: morning },
      { key: 'afternoon', label: lang === 'fr' ? 'Midi / Après-midi (12h - 17h)' : 'Nachmittag (12:00 - 17:00)', count: afternoon },
      { key: 'evening', label: lang === 'fr' ? 'Soirée (17h - 23h)' : 'Abend (17:00 - 23:00)', count: evening },
      { key: 'night', label: lang === 'fr' ? 'Nuit (23h - 06h)' : 'Nacht (23:00 - 06:00)', count: night },
    ];

    // 9. Staff Performance
    const staffCountMap = new Map<string, { name: string; stamps: number; redeems: number }>();
    periodStamps.forEach(s => {
      const staffName = s.staff_id ? (staffMap.get(s.staff_id) || 'Mitarbeiter') : 'Admin / Scanner';
      const entry = staffCountMap.get(staffName) || { name: staffName, stamps: 0, redeems: 0 };
      if (s.type === 'earn') {
        entry.stamps += (s.amount || 1);
      } else if (s.type === 'redeem') {
        entry.redeems += 1;
      }
      staffCountMap.set(staffName, entry);
    });

    const staffPerformance = Array.from(staffCountMap.values()).sort((a, b) => b.stamps - a.stamps);

    // 10. Estimated Customer Interactions & ROI
    const estimatedStoreVisits = stampsGiven + rewardsRedeemed;

    const reportData = {
      merchant: {
        id: merchant.id,
        name: merchant.name,
        slug: merchant.slug,
        contact_name: merchant.contact_name,
        contact_phone: merchant.contact_phone,
        contact_email: merchant.contact_email,
        address: merchant.address,
        logo_url: merchant.logo_url,
        reward_text: merchant.reward_text,
        stamp_goal: merchant.stamp_goal || 10,
        primary_color: merchant.primary_color || '#8097ff',
      },
      timeframe,
      periodTitle,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalCustomersToDate,
        newCustomersInPeriod,
        newCustomersPrevPeriod,
        stampsGiven,
        prevStampsGiven,
        stampsGrowthPercent,
        rewardsRedeemed,
        prevRewardsRedeemed,
        estimatedStoreVisits,
      },
      weekdayDistribution,
      hourlyDistribution,
      staffPerformance,
    };

    // 11. Optional: Send Email Report if action === 'send_email'
    if (action === 'send_email') {
      const targetEmail = merchant.contact_email;
      if (!targetEmail) {
        return NextResponse.json({ error: 'Keine E-Mail-Adresse für diesen Händler hinterlegt.' }, { status: 400 });
      }

      const greeting = merchant.contact_name 
        ? (lang === 'fr' ? `Bonjour ${merchant.contact_name}` : `Hallo ${merchant.contact_name}`)
        : (lang === 'fr' ? `Bonjour ${merchant.name}` : `Hallo ${merchant.name}`);

      const subject = lang === 'fr'
        ? `📊 Rapport de Performance Marketif Treue – ${periodTitle} (${merchant.name})`
        : `📊 Dein Monats-Leistungsbericht Marketif Treue – ${periodTitle} (${merchant.name})`;

      const emailHtml = `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#ffffff;background-color:#0a0a0a;border-radius:12px;border:1px solid #333;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#8097ff;margin:0;font-size:24px;">Marketif <span style="color:#ffffff;">Treue</span></h1>
            <p style="color:#aaa;margin-top:4px;font-size:14px;">${lang === 'fr' ? 'Rapport de Performance & Fidélité' : 'Leistungsbericht & Kundenbindung'}</p>
          </div>

          <div style="background-color:#141414;border:1px solid #282828;border-radius:10px;padding:18px;margin-bottom:24px;">
            <h2 style="color:#ffffff;margin:0 0 6px 0;font-size:18px;">${merchant.name}</h2>
            <p style="color:#8097ff;font-weight:bold;margin:0;font-size:14px;">📅 ${lang === 'fr' ? 'Période :' : 'Berichtszeitraum:'} ${periodTitle}</p>
          </div>

          <p style="font-size:15px;line-height:1.5;color:#e0e0e0;">${greeting},</p>
          <p style="font-size:14px;line-height:1.5;color:#ccc;">
            ${lang === 'fr' 
              ? 'Voici le récapitulatif des performances de votre programme de fidélité digitale pour cette période.' 
              : 'hier ist dein offizieller Leistungsbericht für dein digitales Treuesystem. Deine Kunden waren diesen Monat wieder fleißig am Punkte sammeln!'}
          </p>

          <!-- KPI GRID -->
          <table style="width:100%;border-collapse:separate;border-spacing:8px;margin:20px 0;">
            <tr>
              <td style="background-color:#1c1c1c;border:1px solid #333;border-radius:8px;padding:14px;text-align:center;width:50%;">
                <div style="font-size:26px;font-weight:bold;color:#8097ff;">${stampsGiven}</div>
                <div style="font-size:12px;color:#aaa;margin-top:4px;">⭐ ${lang === 'fr' ? 'Tampons Distribués' : 'Vergebene Stempel'}</div>
              </td>
              <td style="background-color:#1c1c1c;border:1px solid #333;border-radius:8px;padding:14px;text-align:center;width:50%;">
                <div style="font-size:26px;font-weight:bold;color:#10b981;">+${newCustomersInPeriod}</div>
                <div style="font-size:12px;color:#aaa;margin-top:4px;">👥 ${lang === 'fr' ? 'Nouveaux Clients' : 'Neue Stammkunden'}</div>
              </td>
            </tr>
            <tr>
              <td style="background-color:#1c1c1c;border:1px solid #333;border-radius:8px;padding:14px;text-align:center;width:50%;">
                <div style="font-size:26px;font-weight:bold;color:#f59e0b;">${rewardsRedeemed}</div>
                <div style="font-size:12px;color:#aaa;margin-top:4px;">🎁 ${lang === 'fr' ? 'Cadeaux Récupérés' : 'Prämien Eingelöst'}</div>
              </td>
              <td style="background-color:#1c1c1c;border:1px solid #333;border-radius:8px;padding:14px;text-align:center;width:50%;">
                <div style="font-size:26px;font-weight:bold;color:#ffffff;">${totalCustomersToDate}</div>
                <div style="font-size:12px;color:#aaa;margin-top:4px;">📱 ${lang === 'fr' ? 'Cartes Actives Totales' : 'Karteninhaber Gesamt'}</div>
              </td>
            </tr>
          </table>

          <div style="background-color:#1a1a1a;border-left:4px solid #8097ff;padding:14px;border-radius:0 8px 8px 0;margin:20px 0;">
            <p style="margin:0;font-size:14px;color:#ddd;line-height:1.5;">
              💡 <strong>${lang === 'fr' ? 'Impact Direct :' : 'Direkter Mehrwert:'}</strong> 
              ${lang === 'fr' 
                ? `Votre programme a généré au moins <strong>${estimatedStoreVisits} visites vérifiées</strong> dans votre magasin ce mois-ci !` 
                : `Dein Treuesystem hat diesen Monat mindestens <strong>${estimatedStoreVisits} nachweisbare Kundenbesuche</strong> in deinem Geschäft generiert!`}
            </p>
          </div>

          <div style="text-align:center;margin:28px 0;">
            <a href="https://treue.marketif.de/dashboard/${merchant.slug}" style="background-color:#8097ff;color:#000000;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:8px;font-size:15px;display:inline-block;">
              ${lang === 'fr' ? 'Accéder à votre Dashboard' : 'Zum Händler-Dashboard'}
            </a>
          </div>

          <hr style="border-color:#333;margin:24px 0;">
          <p style="font-size:12px;color:#888;text-align:center;">
            Marketif Treue · Digitale Kundenkarten für moderne Geschäfte<br>
            Fragen oder Feedback? Antworte einfach auf diese E-Mail.
          </p>
        </div>
      `;

      const emailResult = await sendEmail({
        to: targetEmail,
        subject,
        html: emailHtml,
      });

      return NextResponse.json({ success: true, emailSent: true, emailResult, data: reportData });
    }

    return NextResponse.json({ success: true, data: reportData });
  } catch (error: any) {
    console.error('Report API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
