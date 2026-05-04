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
          height: '500px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #0E0B03 0%, #080808 55%, #0B0900 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
          gap: '0px',
        }}
      >
        {/* Ambient gold glow */}
        <div style={{
          position: 'absolute',
          top: '-80px', left: '100px',
          width: '800px', height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(212,175,55,0.13) 0%, transparent 65%)',
        }} />

        {/* Gold top border */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: `linear-gradient(90deg, transparent, ${GOLD} 20%, ${GOLD_LIGHT} 50%, ${GOLD} 80%, transparent)`,
        }} />

        {/* Gold bottom border */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px',
          background: `linear-gradient(90deg, transparent, ${GOLD_DIM} 50%, transparent)`,
        }} />

        {/* Decorative corner lines top-left */}
        <div style={{
          position: 'absolute', top: '20px', left: '40px',
          width: '60px', height: '2px',
          background: GOLD_DIM,
        }} />
        <div style={{
          position: 'absolute', top: '20px', left: '40px',
          width: '2px', height: '60px',
          background: GOLD_DIM,
        }} />

        {/* Decorative corner lines bottom-right */}
        <div style={{
          position: 'absolute', bottom: '20px', right: '40px',
          width: '60px', height: '2px',
          background: GOLD_DIM,
        }} />
        <div style={{
          position: 'absolute', bottom: '20px', right: '40px',
          width: '2px', height: '60px',
          background: GOLD_DIM,
        }} />

        {/* Aroma Logo */}
        <img
          src={`${appUrl}/Aroma_logo.png`}
          width={90}
          height={90}
          style={{
            objectFit: 'contain',
            borderRadius: '18px',
            border: `1.5px solid rgba(212,175,55,0.35)`,
            marginBottom: '20px',
          }}
        />

        {/* Main reward message */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{
            fontSize: '15px',
            letterSpacing: '5px',
            textTransform: 'uppercase',
            color: GOLD,
            fontWeight: 'bold',
          }}>
            Restaurant Aroma
          </span>

          <span style={{
            fontSize: '44px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
            textAlign: 'center',
          }}>
            Herzlichen Glückwunsch! 🎉
          </span>

          <span style={{
            fontSize: '20px',
            color: 'rgba(255,255,255,0.6)',
            textAlign: 'center',
            marginTop: '4px',
          }}>
            Dein Gratis-Getränk ist bereit
          </span>

          {/* Gold divider */}
          <div style={{
            width: '120px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
            margin: '8px 0',
          }} />

          <span style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '1px',
            textAlign: 'center',
          }}>
            Zeige diese Karte beim nächsten Besuch vor
          </span>
        </div>
      </div>
    ),
    { width: 1000, height: 500 }
  );
}
