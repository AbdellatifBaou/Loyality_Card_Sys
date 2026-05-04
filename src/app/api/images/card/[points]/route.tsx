import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ points: string }> }
) {
  try {
    const { points: pointsStr } = await params;
    const points = parseInt(pointsStr, 10);
    const validPoints = isNaN(points) ? 0 : Math.max(0, Math.min(10, points));

    const stamps = Array.from({ length: 10 }).map((_, i) => {
      const isStamped = i < validPoints;
      return (
        <div
          key={i}
          style={{
            width: '62px',
            height: '62px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            border: isStamped
              ? '2px solid #D4AF37'
              : '2px dashed rgba(212, 175, 55, 0.2)',
            background: isStamped
              ? 'linear-gradient(145deg, #FFD700 0%, #D4AF37 50%, #B8860B 100%)'
              : 'rgba(255, 255, 255, 0.03)',
            boxShadow: isStamped
              ? '0 0 20px rgba(212, 175, 55, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)'
              : 'inset 0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          {isStamped ? (
            <div style={{ display: 'flex', color: '#000', filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.4))' }}>☕</div>
          ) : (
            <div style={{ color: 'rgba(212, 175, 55, 0.1)', fontSize: '14px', fontWeight: 'bold' }}>{i + 1}</div>
          )}
        </div>
      );
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#050505',
            backgroundImage: 'radial-gradient(circle at 0% 0%, #1a1608 0%, #050505 50%), radial-gradient(circle at 100% 100%, #121212 0%, #050505 50%)',
            padding: '28px 40px',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative grain/noise pattern (subtle via gradient) */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.03, backgroundImage: 'url("https://www.transparenttextures.com/patterns/dark-matter.png")' }} />

          {/* Gold accent bars */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(to bottom, transparent, #D4AF37, transparent)' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: 'linear-gradient(to bottom, transparent, #D4AF37, transparent)' }} />

          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img
                src={`${appUrl}/Aroma_logo.png`}
                width="64"
                height="64"
                style={{ borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.3)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    color: '#D4AF37',
                    fontSize: '22px',
                    fontWeight: '900',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                  }}
                >
                  Restaurant Aroma
                </span>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '12px',
                    letterSpacing: '1px',
                  }}
                >
                  Exklusives Treueprogramm
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                background: 'rgba(212, 175, 55, 0.08)',
                padding: '8px 20px',
                borderRadius: '16px',
                border: '1px solid rgba(212, 175, 55, 0.2)',
              }}
            >
              <span style={{ color: '#D4AF37', fontSize: '32px', fontWeight: 'bold' }}>
                {validPoints} <span style={{ fontSize: '18px', opacity: 0.5 }}>/ 10</span>
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Stempel gesammelt</span>
            </div>
          </div>

          {/* Stamp Grid */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: '20px 0',
            }}
          >
            {stamps}
          </div>

          {/* Footer Info */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              paddingTop: '16px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>📍 Steingasse 7 · 86150 Augsburg</span>
              <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '9px' }}>Die Karte ist digital in deinem Google Wallet hinterlegt</span>
            </div>
            {validPoints >= 9 ? (
              <div style={{ background: '#D4AF37', padding: '4px 12px', borderRadius: '8px' }}>
                <span style={{ color: '#000', fontSize: '12px', fontWeight: 'bold' }}>NÄCHSTER KAFFEE GRATIS! 🎁</span>
              </div>
            ) : (
              <span style={{ color: '#D4AF37', fontSize: '11px', opacity: 0.8 }}>Noch {10 - validPoints} Stempel bis zum Geschenk</span>
            )}
          </div>
        </div>
      ),
      { width: 1000, height: 315 }
    );
  } catch (e: any) {
    console.error(e);
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
