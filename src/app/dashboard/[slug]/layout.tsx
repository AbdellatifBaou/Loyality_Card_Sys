import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    
    const { data: merchant } = await supabase
      .from('merchants')
      .select('name, primary_color')
      .eq('slug', slug)
      .single();

    if (!merchant) {
      return {
        title: 'Dashboard nicht gefunden',
      };
    }

    return {
      title: `${merchant.name} Dashboard`,
      description: `Verwaltung für ${merchant.name}`,
      manifest: `/api/manifest/${slug}?type=dashboard`,
      themeColor: merchant.primary_color || '#050505',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: `${merchant.name} Dashboard`,
      },
    };
  } catch (error) {
    return {
      title: 'Dashboard',
      manifest: '/manifest.json',
    };
  }
}

export default function DashboardSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
