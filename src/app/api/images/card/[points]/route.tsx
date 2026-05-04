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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    // Render 5 stamp circles for a given row (offset = 0 or 5)
    const renderRow = (offset: number) =>
      Array.from({ length: 5 }).map((_, i) => {
        const idx = offset + i;
        const stamped = idx < validPoints;
        return (
          <div
            key={idx}
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              flexShrink: 0,
              border: stamped
                ? '2px solid #D4AF37'
                : '1.5px dashed rgba(212, 175, 55, 0.22)',
              background: stamped
                ? 'radial-gradient(circle at 38% 32%, #FFD966, #D4AF37, #8B6914)'
                : 'rgba(212, 175, 55, 0.03)',
              boxShadow: stamped
                ? '0 0 18px rgba(212, 175, 55, 0.55), inset 0 1px 0 rgba(255,255,255,0.3)'
                : 'inset 0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {stamped ? (
              <span style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>☕</span>
            ) : (
              <span
                style={{
                  color: 'rgba(212,175,55,0.18)',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                {idx + 1}
              </span>
            )}
          </div>
        );
      });

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: '#050505',
            backgroundImage:
              'linear-gradient(135deg, #0D0B04 0%, #050505 50%, #0A0A0A 100%)',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background gold glow top-left */}
          <div
            style={{
              position: 'absolute',
              top: '-80px',
              left: '-40px',
              width: '320px',
              height: '320px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 65%)',
            }}
          />

          {/* Gold top border line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background:
                'linear-gradient(90deg, transparent 0%, #D4AF37 20%, #FFD966 50%, #D4AF37 80%, transparent 100%)',
            }}
          />

          {/* ── LEFT: Branding (270px) ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              width: '270px',
              minWidth: '270px',
              padding: '28px 24px 28px 32px',
              borderRight: '1px solid rgba(212, 175, 55, 0.15)',
              position: 'relative',
            }}
          >
            {/* Logo */}
            <img
              src={`${appUrl}/Aroma_logo.png`}
              width={68}
              height={68}
              style={{
                borderRadius: '14px',
                border: '1px solid rgba(212,175,55,0.3)',
                marginBottom: '14px',
                objectFit: 'contain',
              }}
            />

            {/* Restaurant name */}
            <span
              style={{
                color: '#D4AF37',
                fontSize: '17px',
                fontWeight: 'bold',
                letterSpacing: '2.5px',
                textTransform: 'uppercase',
                lineHeight: 1.2,
                marginBottom: '5px',
              }}
            >
              Restaurant{'\n'}Aroma
            </span>

            {/* Tagline */}
            <span
              style={{
                color: 'rgba(255,255,255,0.32)',
                fontSize: '10px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                marginBottom: '14px',
              }}
            >
              Treueprogramm
            </span>

            {/* Address */}
            <span
              style={{
                color: 'rgba(255,255,255,0.25)',
                fontSize: '10px',
                letterSpacing: '0.5px',
              }}
            >
              📍 Steingasse 7{'\n'}86150 Augsburg
            </span>
          </div>

          {/* ── RIGHT: Stamps (730px) ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              padding: '22px 28px 22px 28px',
              gap: '0px',
            }}
          >
            {/* Top row: label + badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <span
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '10px',
                  letterSpacing: '2.5px',
                  textTransform: 'uppercase',
                }}
              >
                Deine Stempel
              </span>

              {/* Points badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: 'rgba(212,175,55,0.1)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  padding: '5px 14px',
                  borderRadius: '20px',
                }}
              >
                <span
                  style={{
                    color: '#D4AF37',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    lineHeight: 1,
                  }}
                >
                  {validPoints}
                </span>
                <span
                  style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}
                >
                  &nbsp;/ 10
                </span>
              </div>
            </div>

            {/* Row 1: stamps 1–5 */}
            <div
              style={{ display: 'flex', gap: '11px', marginBottom: '11px' }}
            >
              {renderRow(0)}
            </div>

            {/* Row 2: stamps 6–10 */}
            <div style={{ display: 'flex', gap: '11px', marginBottom: '14px' }}>
              {renderRow(5)}
            </div>

            {/* Footer text */}
            {validPoints >= 9 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(212,175,55,0.12)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  alignSelf: 'flex-start',
                }}
              >
                <span
                  style={{
                    color: '#D4AF37',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  🎉 Nächster Besuch: GRATIS Getränk!
                </span>
              </div>
            ) : (
              <span
                style={{
                  color: 'rgba(255,255,255,0.2)',
                  fontSize: '11px',
                }}
              >
                Noch {10 - validPoints}{' '}
                {10 - validPoints === 1 ? 'Stempel' : 'Stempel'} bis zum
                Gratis-Getränk ☕
              </span>
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
