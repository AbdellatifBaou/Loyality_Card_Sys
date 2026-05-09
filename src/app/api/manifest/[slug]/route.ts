import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'scanner'; // 'scanner' or 'dashboard'

    const { data: merchant, error } = await supabase
      .from('merchants')
      .select('name, primary_color, logo_url')
      .eq('slug', slug)
      .single();

    if (error || !merchant) {
      return new NextResponse('Merchant not found', { status: 404 });
    }

    const appName = type === 'dashboard' 
      ? `${merchant.name} Dashboard` 
      : `${merchant.name} Scanner`;

    const shortName = type === 'dashboard' ? 'Dashboard' : 'Scanner';
    
    // Determine the start URL based on the type
    const startUrl = type === 'dashboard' ? `/dashboard/${slug}` : `/${slug}`;

    const manifest = {
      name: appName,
      short_name: shortName,
      description: `Marketif Loyalty ${shortName} for ${merchant.name}`,
      start_url: startUrl,
      display: 'standalone',
      background_color: '#050505',
      theme_color: merchant.primary_color || '#050505',
      icons: [
        {
          src: merchant.logo_url || '/Aroma_logo.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: merchant.logo_url || '/Aroma_logo.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    };

    return new NextResponse(JSON.stringify(manifest), {
      headers: {
        'Content-Type': 'application/manifest+json',
      },
    });
  } catch (error: any) {
    console.error('Manifest Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
