import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

function getAdminSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Fetch all archived manual invoices from all merchants
export async function GET(req: Request) {
  try {
    const authValidation = await validateAuth(req);
    if (!authValidation.authorized) {
      return NextResponse.json({ error: authValidation.error }, { status: 401 });
    }

    const adminSupabase = getAdminSupabase();
    const { data: merchants, error } = await adminSupabase
      .from('merchants_loyality')
      .select('id, name, slug, language, contact_name, contact_phone, contact_email, address, push_settings');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allInvoices: any[] = [];

    (merchants || []).forEach((m: any) => {
      const invoices = m.push_settings?.manual_invoices;
      if (Array.isArray(invoices)) {
        invoices.forEach((inv: any) => {
          allInvoices.push({
            ...inv,
            merchantId: m.id,
            merchantName: m.name,
            merchantSlug: m.slug,
            merchantLanguage: m.language,
            merchantContactPhone: m.contact_phone,
            merchantContactEmail: m.contact_email,
            merchantAddress: m.address,
          });
        });
      }
    });

    // Sort newest first
    allInvoices.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.invoiceDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.invoiceDate || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ success: true, invoices: allInvoices });
  } catch (error: any) {
    console.error('Error fetching manual invoices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Save or update a manual invoice
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { merchantId, invoice, password } = body;
    const correctPassword = process.env.ADMIN_API_KEY || '2025';

    if (password !== correctPassword) {
      const authValidation = await validateAuth(req);
      if (!authValidation.authorized) {
        return NextResponse.json({ error: authValidation.error }, { status: 401 });
      }
    }

    if (!merchantId || !invoice) {
      return NextResponse.json({ error: 'Missing merchantId or invoice data' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { data: merchant, error: fetchError } = await adminSupabase
      .from('merchants_loyality')
      .select('id, name, push_settings')
      .eq('id', merchantId)
      .single();

    if (fetchError || !merchant) {
      return NextResponse.json({ error: fetchError?.message || 'Merchant not found' }, { status: 404 });
    }

    const currentPush = merchant.push_settings || {};
    const existingInvoices: any[] = Array.isArray(currentPush.manual_invoices) ? currentPush.manual_invoices : [];

    const invoiceToSave = {
      ...invoice,
      id: invoice.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: invoice.createdAt || new Date().toISOString(),
    };

    // Check if updating existing invoice by id or invoiceNumber
    const index = existingInvoices.findIndex((inv: any) => inv.id === invoiceToSave.id || (inv.invoiceNumber && inv.invoiceNumber === invoiceToSave.invoiceNumber));

    let updatedInvoices: any[];
    if (index >= 0) {
      updatedInvoices = [...existingInvoices];
      updatedInvoices[index] = invoiceToSave;
    } else {
      updatedInvoices = [invoiceToSave, ...existingInvoices];
    }

    const { error: updateError } = await adminSupabase
      .from('merchants_loyality')
      .update({
        push_settings: {
          ...currentPush,
          manual_invoices: updatedInvoices,
        },
      })
      .eq('id', merchantId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, invoice: invoiceToSave });
  } catch (error: any) {
    console.error('Error saving manual invoice:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove an archived invoice
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { merchantId, invoiceId, password } = body;
    const correctPassword = process.env.ADMIN_API_KEY || '2025';

    if (password !== correctPassword) {
      const authValidation = await validateAuth(req);
      if (!authValidation.authorized) {
        return NextResponse.json({ error: authValidation.error }, { status: 401 });
      }
    }

    if (!merchantId || !invoiceId) {
      return NextResponse.json({ error: 'Missing merchantId or invoiceId' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { data: merchant, error: fetchError } = await adminSupabase
      .from('merchants_loyality')
      .select('id, push_settings')
      .eq('id', merchantId)
      .single();

    if (fetchError || !merchant) {
      return NextResponse.json({ error: fetchError?.message || 'Merchant not found' }, { status: 404 });
    }

    const currentPush = merchant.push_settings || {};
    const existingInvoices: any[] = Array.isArray(currentPush.manual_invoices) ? currentPush.manual_invoices : [];

    const updatedInvoices = existingInvoices.filter((inv: any) => inv.id !== invoiceId);

    const { error: updateError } = await adminSupabase
      .from('merchants_loyality')
      .update({
        push_settings: {
          ...currentPush,
          manual_invoices: updatedInvoices,
        },
      })
      .eq('id', merchantId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedInvoiceId: invoiceId });
  } catch (error: any) {
    console.error('Error deleting manual invoice:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
