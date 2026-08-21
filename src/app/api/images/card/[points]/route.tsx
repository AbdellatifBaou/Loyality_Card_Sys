import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    const { searchParams } = new URL(_req.url);
    const merchantSlug = searchParams.get('merchant');
    let primaryColor = '#D4AF37';
    let stampSymbol = '🍕';

    if (merchantSlug) {
      const { data } = await supabase.from('merchants_loyality').select('primary_color, stamp_symbol').eq('slug', merchantSlug).single();
      if (data?.primary_color) primaryColor = data.primary_color;
      if (data?.stamp_symbol) stampSymbol = data.stamp_symbol;
    }

    const GOLD       = primaryColor;
    const GOLD_LIGHT = primaryColor;
    const hexToRgb = (hex: string) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '212,175,55';
    };
    const rgb = hexToRgb(primaryColor);
    const GOLD_DIM   = `rgba(${rgb},0.5)`;

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
              : `rgba(${rgb},0.07)`,
            border: stamped
              ? `4px solid ${GOLD_LIGHT}`
              : `3px solid ${GOLD_DIM}`,
            boxShadow: stamped
              ? `0 0 40px rgba(${rgb},0.9), 0 0 12px rgba(${rgb},0.6), inset 0 4px 0 rgba(255,255,255,0.3)`
              : `inset 0 3px 8px rgba(0,0,0,0.5)`,
          }}
        >
          {stamped ? (
            <span style={{ fontSize: '72px', lineHeight: 1 }}>{stampSymbol}</span>
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
            height: '700px',
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
            background: 'radial-gradient(ellipse, rgba(${rgb},0.06) 0%, transparent 65%)',
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
      { 
        width: 1000, 
        height: 700,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      }
    );
  } catch (e: any) {
    console.error(e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
