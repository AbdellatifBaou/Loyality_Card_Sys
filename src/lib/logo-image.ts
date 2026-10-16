import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Returns a high-quality 512x512 PNG image response for a merchant's logo.
 * Supports:
 * - Base64 data URIs (data:image/png, data:image/jpeg, etc.)
 * - Remote HTTP / HTTPS URLs
 * - Local static fallbacks from /public
 * Always returns status 200 with Content-Type: image/png (never 302 redirects)
 * so Google Wallet and Apple Wallet image crawlers can reliably cache it.
 */
export async function serveMerchantLogo(slug: string | null) {
  try {
    if (slug) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data } = await supabase
        .from('merchants_loyality')
        .select('logo_url')
        .eq('slug', slug.toLowerCase())
        .maybeSingle();

      if (data && data.logo_url) {
        let inputBuffer: Buffer | null = null;
        if (data.logo_url.startsWith('data:image/')) {
          const parts = data.logo_url.split(',');
          const base64Data = parts[1] || '';
          if (base64Data) {
            inputBuffer = Buffer.from(base64Data, 'base64');
          }
        } else if (data.logo_url.startsWith('http://') || data.logo_url.startsWith('https://')) {
          const res = await fetch(data.logo_url, { cache: 'no-store' });
          if (res.ok) {
            const arr = await res.arrayBuffer();
            inputBuffer = Buffer.from(arr);
          }
        }

        if (inputBuffer && inputBuffer.length > 0) {
          const pngBytes = await sharp(inputBuffer)
            .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: false })
            .png({ quality: 95, compressionLevel: 8 })
            .toBuffer();

          return new Response(new Uint8Array(pngBytes), {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Content-Length': pngBytes.length.toString(),
              'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('Error serving merchant logo:', err);
  }

  // Fallback default logo from public directory (Never 302 redirect!)
  const publicDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public');
  const defaultPaths = [
    path.join(publicDir, 'Marketif_LOGO_Symbol.png'),
    path.join(publicDir, 'icon-512x512.png'),
    path.join(publicDir, 'Aroma_logo.png')
  ];

  for (const p of defaultPaths) {
    if (fs.existsSync(p)) {
      try {
        const fileBuf = fs.readFileSync(p);
        const pngBytes = await sharp(fileBuf)
          .resize({ width: 512, height: 512, fit: 'inside' })
          .png()
          .toBuffer();
        return new Response(new Uint8Array(pngBytes), {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Content-Length': pngBytes.length.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      } catch {}
    }
  }

  return new Response(null, { status: 404 });
}
