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
    .select('name, reward_text, primary_color, language')
    .eq('slug', slug)
    .single();

  if (!merchant) {
    return {
      title: 'Händler nicht gefunden',
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://treue.marketif.de';
  // Fake .png extension to trick WhatsApp into recognizing the image
  const logoUrl = `${appUrl}/api/images/logo.png?slug=${slug}`;
  
  const isFrench = merchant.language === 'fr';
  const title = isFrench 
    ? `Carte de fidélité numérique de ${merchant.name}`
    : `Digitale Treuekarte von ${merchant.name}`;

  let description = '';
  if (merchant.reward_text) {
    description = isFrench 
      ? `Obtenez des récompenses exclusives: ${merchant.reward_text}`
      : `Sichere dir exklusive Belohnungen: ${merchant.reward_text}`;
  } else {
    description = isFrench
      ? `Obtenez la carte de fidélité numérique de ${merchant.name} pour votre Google Wallet.`
      : `Hol dir jetzt die digitale Treuekarte von ${merchant.name} für dein Google Wallet.`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${appUrl}/join/${slug}`,
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

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
