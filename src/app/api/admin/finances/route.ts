import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { validateAuth } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-04-22.dahlia',
});

export async function POST(req: Request) {
  try {
    const { year } = await req.json();

    const authValidation = await validateAuth(req);
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error }, { status: 401 });
    }

    if (!year) {
      return NextResponse.json({ error: 'Year is required' }, { status: 400 });
    }

    const startDate = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
    const endDate = Math.floor(new Date(`${year}-12-31T23:59:59Z`).getTime() / 1000);

    const invoices = [];
    for await (const invoice of stripe.invoices.list({
      created: {
        gte: startDate,
        lte: endDate,
      },
      status: 'paid',
      limit: 100,
    })) {
      invoices.push({
        id: invoice.id,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        created: invoice.created,
        customer_email: invoice.customer_email,
        customer_name: invoice.customer_name,
        invoice_pdf: invoice.invoice_pdf,
        lines: invoice.lines.data.map(l => ({ description: l.description, amount: l.amount }))
      });
    }

    const failedInvoices = [];
    for await (const invoice of stripe.invoices.list({
      created: {
        gte: startDate,
        lte: endDate,
      },
      status: 'open',
      limit: 100,
    })) {
      if (invoice.attempt_count >= 2) {
        failedInvoices.push({
          id: invoice.id,
          amount_due: invoice.amount_due,
          currency: invoice.currency,
          created: invoice.created,
          customer_email: invoice.customer_email,
          customer_name: invoice.customer_name,
          attempt_count: invoice.attempt_count,
          hosted_invoice_url: invoice.hosted_invoice_url,
          lines: invoice.lines.data.map(l => ({ description: l.description, amount: l.amount }))
        });
      }
    }

    // Echte aktive Stripe-Abonnements & MRR nach Rabatten / Coupons ermitteln
    let stripeMrrCents = 0;
    const subscriptions = [];
    let discountedSubscriptionsCount = 0;

    try {
      const subsList = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        expand: ['data.discount.coupon', 'data.discounts', 'data.customer', 'data.customer.discount.coupon']
      });

      for (const sub of subsList.data) {
        let subMonthlyCents = 0;
        for (const item of sub.items.data) {
          let unitAmount = item.price.unit_amount || 0;
          const interval = item.price.recurring?.interval || 'month';
          const intervalCount = item.price.recurring?.interval_count || 1;

          if (interval === 'year') {
            unitAmount = Math.round(unitAmount / 12);
          } else if (interval === 'week') {
            unitAmount = Math.round(unitAmount * 4.33);
          } else if (intervalCount > 1) {
            unitAmount = Math.round(unitAmount / intervalCount);
          }

          const quantity = item.quantity || 1;
          subMonthlyCents += unitAmount * quantity;
        }

        const regularMonthly = subMonthlyCents;
        const isCanceling = sub.cancel_at_period_end === true || !!sub.cancel_at;

        const cust = sub.customer as Stripe.Customer | null;

        // Wenn das Abo gekündigt ist (läuft zum Periodenende aus), bringt es 0 € wiederkehrenden MRR!
        if (isCanceling) {
          const endTs = sub.cancel_at || sub.current_period_end;
          const formattedEnd = endTs ? new Date(endTs * 1000).toLocaleDateString('de-DE') : 'Demnächst';
          subscriptions.push({
            id: sub.id,
            customer_name: cust && typeof cust === 'object' && 'name' in cust ? cust.name : null,
            customer_email: cust && typeof cust === 'object' && 'email' in cust ? cust.email : null,
            monthly_cents: 0,
            is_canceling: true,
            cancel_date: formattedEnd,
            discount_desc: `Gekündigt zum ${formattedEnd}`
          });
          continue; // Nicht zum wiederkehrenden MRR addieren!
        }

        // Coupon-Prüfung für aktive Abonnements:
        // 1. Auf Subskriptionsebene (sub.discount oder sub.discounts Array)
        let discountDesc: string | null = null;
        let coupon: any = sub.discount?.coupon || null;

        if (!coupon && Array.isArray((sub as any).discounts) && (sub as any).discounts.length > 0) {
          const firstDisc = (sub as any).discounts[0];
          coupon = firstDisc?.coupon || (typeof firstDisc === 'object' && firstDisc?.percent_off ? firstDisc : null);
        }

        // 2. Auf Kundenebene (Customer Discount)
        const custId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id;
        const custObj = typeof sub.customer === 'object' && sub.customer ? (sub.customer as any) : null;
        if (!coupon && custObj?.discount) {
          coupon = custObj.discount.coupon || (typeof custObj.discount === 'object' && custObj.discount.percent_off ? custObj.discount : null);
        }

        if (!coupon && custId) {
          try {
            const fullCust = await stripe.customers.retrieve(custId, { expand: ['discount.coupon'] }) as any;
            if (fullCust?.discount?.coupon) {
              coupon = fullCust.discount.coupon;
            } else if (fullCust?.discount && typeof fullCust.discount === 'object') {
              coupon = fullCust.discount;
            }
          } catch (e) {
            console.error('Failed to retrieve customer discount:', e);
          }
        }

        // 3. Echte nächste Rechnung via Stripe CreatePreview ermitteln
        let previewAmountDue: number | null = null;
        try {
          if (typeof (stripe.invoices as any).createPreview === 'function') {
            const preview = await (stripe.invoices as any).createPreview({ subscription: sub.id });
            if (preview && typeof preview.amount_due === 'number') {
              previewAmountDue = preview.amount_due;
              if (!coupon && preview.discount?.coupon) {
                coupon = preview.discount.coupon;
              }
            }
          }
        } catch (prevErr) {
          // Ignorieren falls keine Vorschau vorhanden
        }

        if (coupon) {
          discountedSubscriptionsCount++;
          if (coupon.percent_off) {
            discountDesc = `${coupon.percent_off}% Rabatt`;
            subMonthlyCents = Math.round(regularMonthly * (1 - coupon.percent_off / 100));
          } else if (coupon.amount_off) {
            discountDesc = `${(coupon.amount_off / 100).toFixed(2)}€ Rabatt`;
            subMonthlyCents = Math.max(0, regularMonthly - coupon.amount_off);
          }
        } else if (previewAmountDue !== null && previewAmountDue < regularMonthly) {
          discountedSubscriptionsCount++;
          subMonthlyCents = previewAmountDue;
          discountDesc = 'Rabatt';
        }

        stripeMrrCents += subMonthlyCents;

        subscriptions.push({
          id: sub.id,
          customer_name: cust && typeof cust === 'object' && 'name' in cust ? cust.name : null,
          customer_email: cust && typeof cust === 'object' && 'email' in cust ? cust.email : null,
          monthly_cents: subMonthlyCents,
          is_canceling: false,
          discount_desc: discountDesc
        });
      }
    } catch (subErr) {
      console.error('Error fetching Stripe subscriptions in finances:', subErr);
    }

    return NextResponse.json({
      success: true,
      invoices,
      failedInvoices,
      stripeMrrCents,
      subscriptions,
      activeSubscriptionsCount: subscriptions.filter(s => !s.is_canceling).length,
      cancelingSubscriptionsCount: subscriptions.filter(s => s.is_canceling).length,
      discountedSubscriptionsCount
    });
  } catch (error: any) {
    console.error('Admin Finances API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
