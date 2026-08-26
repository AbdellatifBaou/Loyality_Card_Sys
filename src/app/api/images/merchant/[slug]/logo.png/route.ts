import { createClient } from '@supabase/supabase-js';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (slug) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: merchant } = await supabase
      .from('merchants_loyality')
      .select('logo_url')
      .eq('slug', slug)
      .single();

    if (merchant && merchant.logo_url && merchant.logo_url.startsWith('data:image/')) {
      const match = merchant.logo_url.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      const mimeType = match ? match[1] : 'image/png';
      const base64Data = merchant.logo_url.replace(/^data:image\/\w+;base64,/, '');
      const bytes = Buffer.from(base64Data, 'base64');
      
      return new Response(bytes, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://treue.marketif.de').replace(/\/$/, '');
  return Response.redirect(`${appUrl}/icon-512x512.png`);
}
