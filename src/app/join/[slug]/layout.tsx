import { Metadata, ResolvingMetadata } from 'next';
import { supabase } from '@/lib/supabase';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).toLowerCase();

  const { data: merchant } = await supabase
    .from('merchants_loyality')
    .select('name, reward_text, primary_color')
    .eq('slug', slug)
    .single();

  if (!merchant) {
    return {
      title: 'Händler nicht gefunden',
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://treue.marketif.de';
  const logoUrl = \\/api/images/logo?slug=\\;
  const title = \Digitale Treuekarte von \\;
  const description = merchant.reward_text 
    ? \Sichere dir exklusive Belohnungen: \\ 
    : \Hol dir jetzt die digitale Treuekarte von \ für dein Google Wallet.\;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: \\/join/\\,
      siteName: 'Marketif Loyalty',
      images: [
        {
          url: logoUrl,
          width: 500,
          height: 500,
          alt: \Logo von \\,
        }
      ],
      locale: 'de_DE',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [logoUrl],
    },
  };
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
