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
    .select('name, language, logo_url')
    .eq('slug', slug)
    .single();

  if (!merchant) {
    return {
      title: 'Händler nicht gefunden',
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://treue.marketif.de';
  const logoUrl = merchant.logo_url && merchant.logo_url.startsWith('data:image/')
    ? `${appUrl}/api/images/logo.png?slug=${slug}`
    : `${appUrl}/icon-512x512.png`;
  
  const isFrench = merchant.language === 'fr';
  const title = isFrench 
    ? `Tableau de bord - ${merchant.name}`
    : `Dashboard - ${merchant.name}`;

  const description = isFrench
    ? `Gestion et statistiques pour ${merchant.name}`
    : `Verwaltung & Statistiken für ${merchant.name}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${appUrl}/dashboard/${slug}`,
      siteName: 'Marketif Loyalty',
      images: [
        {
          url: logoUrl,
          width: 500,
          height: 500,
          alt: isFrench ? `Logo de ${merchant.name}` : `Logo von ${merchant.name}`,
        }
      ],
      locale: isFrench ? 'fr_FR' : 'de_DE',
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

export default function DashboardSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
