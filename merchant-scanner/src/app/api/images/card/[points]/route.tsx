import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  _req: NextRequest,
  { params }: { params: { points: string } }
) {
  try {
    const pointsStr = params.points;
    const points = parseInt(pointsStr, 10);
    const validPoints = isNaN(points) ? 0 : Math.max(0, Math.min(10, points));

    const stamps = Array.from({ length: 10 }).map((_, i) => {
      const isStamped = i < validPoints;
      return (
        <div
          key={i}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            border: isStamped
              ? '2px solid #C8A84B'
              : '2px dashed rgba(200, 168, 75, 0.22)',
            background: isStamped
              ? 'radial-gradient(circle at 38% 32%, #EDD07A, #C8A84B, #8A6820)'
              : 'rgba(200, 168, 75, 0.04)',
            boxShadow: isStamped
              ? '0 0 18px rgba(200, 168, 75, 0.6), inset 0 1px 0 rgba(255,255,255,0.25)'
              : 'none',
          }}
        >
          {isStamped ? '☕' : ''}
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
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#0A0A0A',
            backgroundImage:
              'linear-gradient(135deg, #0C0C0C 0%, #130F04 100%)',
            padding: '26px 36px',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Gold top accent line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background:
                'linear-gradient(90deg, transparent 0%, #C8A84B 25%, #EDD07A 50%, #C8A84B 75%, transparent 100%)',
            }}
          />

          {/* Subtile Hintergrund-Ornamente */}
          <div
            style={{
              position: 'absolute',
              top: '-60px',
              right: '-60px',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(200, 168, 75, 0.08) 0%, transparent 70%)',
            }}
          />

          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span
                style={{
                  color: '#C8A84B',
                  fontSize: '19px',
                  fontWeight: 'bold',
                  letterSpacing: '3.5px',
                  textTransform: 'uppercase',
                }}
              >
                Restaurant Aroma
              </span>
              <span
                style={{
                  color: 'rgba(255,255,255,0.38)',
                  fontSize: '11px',
                  letterSpacing: '1.5px',
                }}
              >
                📍 Steingasse 7 · 86150 Augsburg
              </span>
            </div>

            {/* Punkte-Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(200, 168, 75, 0.1)',
                border: '1px solid rgba(200, 168, 75, 0.35)',
                padding: '7px 18px',
                borderRadius: '20px',
              }}
            >
              <span
                style={{ color: '#C8A84B', fontSize: '24px', fontWeight: 'bold' }}
              >
                {validPoints}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '16px' }}>
                &nbsp;/ 10
              </span>
            </div>
          </div>

          {/* Stempel-Kreise */}
          <div
            style={{
              display: 'flex',
              gap: '11px',
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: '4px 0',
            }}
          >
            {stamps}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                color: 'rgba(255,255,255,0.18)',
                fontSize: '11px',
                letterSpacing: '0.5px',
              }}
            >
              Deine Treuekarte · Restaurant Aroma
            </span>
            {validPoints >= 9 ? (
              <span
                style={{
                  color: '#C8A84B',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                🎉 Nächster Besuch: GRATIS Getränk!
              </span>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '11px' }}>
                Noch {10 - validPoints} Stempel bis zum Gratis-Getränk
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
