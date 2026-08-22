import { NextResponse } from 'next/server';

function getAdminSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { password, name, primaryColor, packageType, customPrice, stampSymbol, logoBase64 } = await req.json();

    if (password !== '2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!name || !primaryColor || !packageType) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // Generate slug from name
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Check if slug exists
    const { data: existing } = await adminSupabase.from('merchants_loyality').select('id').eq('slug', slug).maybeSingle();
    if (existing) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Ensure bucket exists and upload logo if provided
    let finalLogoUrl = null;
    if (logoBase64) {
      try {
        await adminSupabase.storage.createBucket('logos', { public: true });
      } catch (e) {}

      try {
        const matches = logoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const ext = contentType.split('/')[1] || 'png';
          const fileName = `${slug}-${Date.now()}.${ext}`;
          
          const uploadUrl = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/logos/${fileName}`);
          
          // Use native https to bypass Coolify SSL certificate issues
          const https = require('https');
          const uploadPromise = new Promise((resolve, reject) => {
            const req = https.request(uploadUrl, {
              method: 'POST',
              headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
                'Content-Type': contentType,
                'Content-Length': buffer.length
              },
              rejectUnauthorized: false
            }, (res: any) => {
              let data = '';
              res.on('data', (chunk: any) => data += chunk);
              res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  resolve(true);
                } else {
                  reject(new Error(`Status ${res.statusCode}: ${data}`));
                }
              });
            });
            req.on('error', reject);
            req.write(buffer);
            req.end();
          });

          try {
            await uploadPromise;
            const { data: publicUrlData } = adminSupabase.storage.from('logos').getPublicUrl(fileName);
            finalLogoUrl = publicUrlData.publicUrl;
          } catch (uploadError) {
            console.error('Logo upload error:', uploadError);
          }
        }
      } catch (uploadEx) {
        console.error('Logo upload exception:', uploadEx);
      }
    }

    // Insert Merchant
    const { data: newMerchant, error: insertError } = await adminSupabase
      .from('merchants_loyality')
      .insert({
        name: name,
        slug: slug,
        primary_color: primaryColor,
        stamp_symbol: stampSymbol || '☕️',
        logo_url: finalLogoUrl,
        is_active: true,
        subscription_status: 'active',
        package_type: packageType,
        custom_price: packageType === 'custom' && customPrice ? parseFloat(customPrice) : null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating merchant:', insertError);
      return NextResponse.json({ error: 'Failed to create merchant: ' + insertError.message }, { status: 500 });
    }

    const merchantId = newMerchant.id;

    // Create default admin staff member
    const defaultPin = Math.floor(1000 + Math.random() * 9000).toString();
    await adminSupabase.from('staff_loyality').insert({
      merchant_id: merchantId,
      name: 'Admin',
      pin: defaultPin
    });

    // Create billing record (empty stripe id so they can upgrade later, or admin can set to manual_invoice)
    await adminSupabase.from('merchant_billing').upsert(
      {
        merchant_id: merchantId,
      },
      { onConflict: 'merchant_id' }
    );

    return NextResponse.json({ 
      success: true, 
      merchant: {
        id: merchantId,
        name: name,
        slug: slug,
        pin: defaultPin
      }
    });
  } catch (error: any) {
    console.error('Create Merchant API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
