import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    
    const { data: merchant } = await supabase
      .from('merchants')
      .select('name')
      .eq('slug', slug)
      .single();

    const name = merchant?.name || 'Marketif';

    return {
      title: `${name} Scanner`,
      manifest: `/api/manifest/${slug}?type=scanner`,
    };
  } catch (error) {
    console.error('Metadata error:', error);
    return {
      title: 'Scanner',
      manifest: '/manifest.json', // Fallback to original
    };
  }
}

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
