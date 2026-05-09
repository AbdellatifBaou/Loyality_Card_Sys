import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    
    // Fetch merchant to ensure it exists
    const { data: merchant } = await supabase
      .from('merchants')
      .select('name, primary_color')
      .eq('slug', slug)
      .single();

    if (!merchant) {
      return {
        title: 'Scanner nicht gefunden',
      };
    }

    return {
      title: `${merchant.name} Scanner`,
      description: `Terminal für ${merchant.name}`,
      manifest: `/api/manifest/${slug}?type=scanner`,
      themeColor: merchant.primary_color || '#050505',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: `${merchant.name} Scanner`,
      },
    };
  } catch (error) {
    return {
      title: 'Scanner',
      manifest: '/manifest.json', // Fallback to static manifest on error
    };
  }
}

export default function SlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
