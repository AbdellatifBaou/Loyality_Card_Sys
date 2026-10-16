import { serveMerchantLogo } from '@/lib/logo-image';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  return await serveMerchantLogo(slug);
}
