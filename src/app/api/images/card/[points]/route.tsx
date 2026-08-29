import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
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
    let stampSymbol = '✨';
    let stampGoal = 9;
    let heroImage: string | null = null;

    if (merchantSlug) {
      // Use service role key to avoid RLS / Anon key edge case issues
      const { createClient } = require('@supabase/supabase-js');
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data } = await adminSupabase.from('merchants_loyality').select('primary_color, stamp_symbol, stamp_goal, push_settings').eq('slug', merchantSlug).single();
      if (data?.primary_color) primaryColor = data.primary_color;
      if (data?.stamp_symbol) stampSymbol = data.stamp_symbol;
      if (data?.stamp_goal) stampGoal = data.stamp_goal;
      heroImage = data?.push_settings?.hero_image || null;
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

    // Calculate dynamic size based on max rows to fit (max 14 stamps = 3 rows)
    const colsPerRow = stampGoal > 10 ? 5 : 5;
    const numRows = Math.ceil(stampGoal / colsPerRow);
    
    // Scale down if 3 rows to fit well
    const SIZE = numRows > 2 ? 140 : 164;
    const GAP  = numRows > 2 ? 20 : 24;

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
            <span style={{ fontSize: numRows > 2 ? '60px' : '72px', lineHeight: 1 }}>{stampSymbol}</span>
          ) : (
            <span style={{ fontSize: numRows > 2 ? '42px' : '50px', lineHeight: 1, opacity: 0.2 }}>
              {stampSymbol}
            </span>
          )}
        </div>
      );
    };

    const rows = [];
    for (let i = 0; i < stampGoal; i += colsPerRow) {
      rows.push(Array.from({ length: Math.min(colsPerRow, stampGoal - i) }).map((_, j) => circle(i + j)));
    }

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
            gap: `${GAP}px`,
            padding: '40px',
            position: 'relative',
            overflow: 'hidden',
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

          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: `${GAP}px` }}>
              {row}
            </div>
          ))}
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
