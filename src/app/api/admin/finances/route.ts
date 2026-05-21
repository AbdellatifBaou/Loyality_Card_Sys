import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-04-22.dahlia',
});

export async function POST(req: Request) {
  try {
    const { password, year } = await req.json();

    if (password !== '2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json({ success: true, invoices, failedInvoices });
  } catch (error: any) {
    console.error('Admin Finances API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
