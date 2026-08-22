import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const revalidate = 86400;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  let customUrl = searchParams.get('url');
  let customBg = searchParams.get('bg') || '0A0A0A';

  if (slug && !customUrl) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('merchants_loyality')
      .select('logo_url, primary_color')
      .eq('slug', slug)
      .single();
      
    if (data) {
      customUrl = data.logo_url;
      customBg = (data.primary_color || '0A0A0A').replace('#', '');
    }
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

  return new ImageResponse(
    (
      <div
        style={{
          width: '288px',
          height: '288px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `#${customBg}`,
          borderRadius: '50%',
          padding: '36px',
        }}
      >
        <img
          src={customUrl || `${appUrl}/Aroma_logo.png`}
          width={216}
          height={216}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { width: 288, height: 288 }
  );
}
