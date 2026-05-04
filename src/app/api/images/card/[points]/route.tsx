import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ points: string }> }
) {
  try {
    const { points: pointsStr } = await params;
    const points = parseInt(pointsStr, 10);
    const validPoints = isNaN(points) ? 0 : Math.max(0, Math.min(10, points));

    const GOLD       = '#D4AF37';
    const GOLD_LIGHT = '#FFE066';
    const GOLD_DIM   = 'rgba(212,175,55,0.5)';

    // Max circle size fitting 5 per row in 1000px with 24px gaps and 40px side padding
    // 5 × 164 + 4 × 24 + 2 × 40 = 996px ≈ 1000px
    const SIZE = 164;
    const GAP  = 24;

    const circle = (idx: number) => {
      const stamped = idx < validPoints;
      return (
        <div
          key={idx}
          style={{
            width: `${SIZE}px`,
            height: `${SIZE}px`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: stamped
              ? `radial-gradient(circle at 35% 28%, ${GOLD_LIGHT}, ${GOLD}, #5C3D08)`
              : 'rgba(212,175,55,0.07)',
            border: stamped
              ? `4px solid ${GOLD_LIGHT}`
              : `3px solid ${GOLD_DIM}`,
            boxShadow: stamped
              ? `0 0 40px rgba(212,175,55,0.9), 0 0 12px rgba(212,175,55,0.6), inset 0 4px 0 rgba(255,255,255,0.3)`
              : `inset 0 3px 8px rgba(0,0,0,0.5)`,
          }}
        >
          {stamped ? (
            <span style={{ fontSize: '72px', lineHeight: 1 }}>☕</span>
          ) : idx === 9 ? (
            <span style={{ fontSize: '72px', lineHeight: 1 }}>🎁</span>
          ) : (
            <span style={{ color: GOLD_DIM, fontSize: '28px', fontWeight: 'bold' }}>
              {idx + 1}
            </span>
          )}
        </div>
      );
    };

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
            gap: `${GAP}px`,
            padding: '40px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient glow */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: '900px', height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 65%)',
            transform: 'translate(-50%, -50%)',
          }} />

          {/* Gold top line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: `linear-gradient(90deg, transparent, ${GOLD} 20%, ${GOLD_LIGHT} 50%, ${GOLD} 80%, transparent)`,
          }} />

          {/* Row 1: circles 1–5 */}
          <div style={{ display: 'flex', gap: `${GAP}px` }}>
            {Array.from({ length: 5 }).map((_, i) => circle(i))}
          </div>

          {/* Row 2: circles 6–10 */}
          <div style={{ display: 'flex', gap: `${GAP}px` }}>
            {Array.from({ length: 5 }).map((_, i) => circle(i + 5))}
          </div>
        </div>
      ),
      { width: 1000, height: 500 }
    );
  } catch (e: any) {
    console.error(e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
