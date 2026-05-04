import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const revalidate = 0;

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  const GOLD       = '#D4AF37';
  const GOLD_LIGHT = '#FFE066';
  const GOLD_DIM   = 'rgba(212,175,55,0.4)';

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
          background: 'linear-gradient(160deg, #0E0B03 0%, #080808 55%, #0B0900 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
          gap: '18px',
        }}
      >
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

        {/* Aroma Logo */}
        <img
          src={`${appUrl}/Aroma_logo.png`}
          width={160}
          height={160}
          style={{
            objectFit: 'contain',
            borderRadius: '32px',
            border: `2.5px solid rgba(212,175,55,0.4)`,
            boxShadow: '0 0 40px rgba(212,175,55,0.2)',
          }}
        />

        {/* Restaurant label */}
        <span style={{
          fontSize: '22px',
          letterSpacing: '7px',
          textTransform: 'uppercase',
          color: GOLD,
          fontWeight: 'bold',
        }}>
          Restaurant Aroma
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
            Herzlichen Glückwunsch!
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
          Dein Gratis-Getränk ist bereit
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
          Zeige diese Karte beim nächsten Besuch vor
        </span>
      </div>
    ),
    { width: 1000, height: 700 }
  );
}
