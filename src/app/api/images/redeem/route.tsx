import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

  const { searchParams } = new URL(req.url);
  const merchantSlug = searchParams.get('merchant');
  let primaryColor = '#D4AF37';
  let merchantName = 'Deine Belohnung';
  let rewardText = 'Deine Belohnung ist bereit';
  let logoUrl = `${appUrl}/Aroma_logo.png`;
  let lang = 'de';
  let heroImage: string | null = null;

  if (merchantSlug) {
    const { createClient } = require('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data } = await adminSupabase.from('merchants_loyality').select('primary_color, name, reward_text, logo_url, language, push_settings').eq('slug', merchantSlug).single();
    if (data) {
      if (data.primary_color) primaryColor = data.primary_color;
      if (data.name) merchantName = data.name;
      if (data.reward_text) rewardText = data.reward_text;
      if (data.logo_url) logoUrl = data.logo_url;
      if (data.language) lang = data.language;
      if (data.push_settings?.hero_image) heroImage = data.push_settings.hero_image;
    }
  }

  const translations: Record<string, { congrats: string; hint: string }> = {
    de: { congrats: 'Herzlichen Glückwunsch!', hint: 'Zeige diese Karte beim nächsten Besuch vor' },
    en: { congrats: 'Congratulations!', hint: 'Show this card on your next visit' },
    fr: { congrats: 'Félicitations !', hint: 'Présentez cette carte lors de votre prochaine visite' }
  };
  const t = translations[lang] || translations.de;

  const GOLD       = primaryColor;
  const GOLD_LIGHT = primaryColor;
  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '212,175,55';
  };
  const rgb = hexToRgb(primaryColor);
  const GOLD_DIM   = `rgba(${rgb},0.4)`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1000px',
          height: '700px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: heroImage ? '#000000' : 'linear-gradient(160deg, #0E0B03 0%, #080808 55%, #0B0900 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
          gap: '18px',
        }}
      >
        {heroImage && (
          <img 
            src={heroImage} 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1000px',
              height: '700px',
              objectFit: 'cover',
              opacity: 0.8,
            }}
          />
        )}
        {/* Ambient gold glow */}
        <div style={{
          position: 'absolute',
          top: '-100px', left: '50px',
          width: '900px', height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 65%)',
        }} />

        {/* Gold top border */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: `linear-gradient(90deg, transparent, ${GOLD} 20%, ${GOLD_LIGHT} 50%, ${GOLD} 80%, transparent)`,
        }} />

        {/* Gold bottom border */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
          background: `linear-gradient(90deg, transparent, ${GOLD_DIM} 50%, transparent)`,
        }} />

        {/* Corner top-left */}
        <div style={{ position: 'absolute', top: '24px', left: '48px', width: '72px', height: '3px', background: GOLD_DIM }} />
        <div style={{ position: 'absolute', top: '24px', left: '48px', width: '3px', height: '72px', background: GOLD_DIM }} />

        {/* Corner bottom-right */}
        <div style={{ position: 'absolute', bottom: '24px', right: '48px', width: '72px', height: '3px', background: GOLD_DIM }} />
        <div style={{ position: 'absolute', bottom: '24px', right: '48px', width: '3px', height: '72px', background: GOLD_DIM }} />

        {/* Merchant Logo */}
        <img
          src={logoUrl}
          width={160}
          height={160}
          style={{
            objectFit: 'contain',
            borderRadius: '32px',
            border: `2.5px solid rgba(212,175,55,0.4)`,
            boxShadow: '0 0 40px rgba(212,175,55,0.2)',
          }}
        />

        {/* Merchant label */}
        <span style={{
          fontSize: '22px',
          letterSpacing: '7px',
          textTransform: 'uppercase',
          color: GOLD,
          fontWeight: 'bold',
        }}>
          {merchantName}
        </span>

        {/* Main message */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            lineHeight: 1,
            textAlign: 'center',
          }}>
            {t.congrats}
          </span>

          <span style={{
            fontSize: '72px',
            lineHeight: 1,
          }}>
            🎉
          </span>
        </div>

        {/* Subtitle */}
        <span style={{
          fontSize: '34px',
          color: 'rgba(255,255,255,0.65)',
          textAlign: 'center',
          lineHeight: 1.2,
        }}>
          {rewardText}
        </span>

        {/* Gold divider */}
        <div style={{
          width: '200px',
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        }} />

        {/* Bottom hint */}
        <span style={{
          fontSize: '22px',
          color: 'rgba(255,255,255,0.32)',
          letterSpacing: '1px',
          textAlign: 'center',
        }}>
          {t.hint}
        </span>
      </div>
    ),
    { width: 1000, height: 700 }
  );
}
